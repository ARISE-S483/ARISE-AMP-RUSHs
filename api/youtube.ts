let ytmusicInstance: any = null;
let initPromise: Promise<void> | null = null;

async function getYTMusic() {
  if (ytmusicInstance) return ytmusicInstance;
  if (initPromise) {
    await initPromise;
    return ytmusicInstance;
  }
  initPromise = (async () => {
    try {
      const { Innertube, UniversalCache } = await import('youtubei.js');
      ytmusicInstance = await Innertube.create({
        cache: new UniversalCache(true),
        generate_session_locally: true,
        client_type: 'YTMUSIC' as any
      });
      console.log('[youtubei.js] Initialized successfully');
    } catch (error) {
      console.error('[youtubei.js] Failed to initialize:', error);
      ytmusicInstance = null;
    }
  })();
  await initPromise;
  return ytmusicInstance;
}

function sendJSON(res: any, data: unknown, status = 200) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function sendError(res: any, message: string, status = 500) {
  sendJSON(res, { error: message }, status);
}

function extractSuggestionText(item: any): string | null {
  if (!item) return null;
  if (typeof item === 'string') return item;
  if (item.suggestion) {
    if (typeof item.suggestion === 'string') return item.suggestion;
    if (item.suggestion.text) return String(item.suggestion.text);
    if (typeof item.suggestion.toString === 'function') {
      const s = item.suggestion.toString();
      if (s && s !== '[object Object]') return s;
    }
  }
  if (typeof item.query === 'string' && item.query) return item.query;
  if (item.text) {
    if (typeof item.text === 'string') return item.text;
    if (typeof item.text === 'object' && typeof item.text.toString === 'function') {
      const s = item.text.toString();
      if (s && s !== '[object Object]') return s;
    }
  }
  if (item.runs && Array.isArray(item.runs)) {
    const combined = item.runs.map((r: any) => r.text || '').join('');
    if (combined.trim()) return combined;
  }
  if (typeof item.toString === 'function') {
    const s = item.toString();
    if (s && s !== '[object Object]') return s;
  }
  return null;
}

export default async function handler(req: any, res: any) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  // Parse endpoint
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  
  // Vercel rewrites or direct API access parsing
  // The rewrite is /api/ytmusic/* -> /api/youtube.ts
  const endpoint = pathname.replace('/api/ytmusic/', '').replace('/api/youtube', '').split('/')[0] || '';

  // Proxy Endpoint: Bypass youtubei.js initialization for faster setup
  if (endpoint === 'proxy') {
    const urlQuery = url.searchParams.get('url');
    if (!urlQuery) return sendError(res, 'Missing url query param', 400);

    try {
      const https = await import('https');
      const http = await import('http');
      const mod = urlQuery.startsWith('https') ? https : http;

      const proxyReq = mod.get(urlQuery, {
        headers: {
          'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Range': req.headers['range'] || 'bytes=0-',
        }
      }, (proxyRes) => {
        if (proxyRes.statusCode) res.statusCode = proxyRes.statusCode;
        
        Object.keys(proxyRes.headers).forEach((key) => {
          try {
            res.setHeader(key, proxyRes.headers[key]!);
          } catch (e) { /* ignore restricted headers */ }
        });

        proxyRes.pipe(res);

        res.on('error', (err: any) => {
          proxyReq.destroy();
        });

        proxyRes.on('error', (err: any) => {
          res.end();
        });
      });

      proxyReq.on('error', (err: any) => {
        if (!res.headersSent) {
          sendError(res, `Proxy request failed: ${err.message}`, 500);
        }
      });

      req.on('close', () => {
        proxyReq.destroy();
      });
      
      req.on('error', (err: any) => {
        proxyReq.destroy();
      });

      return;
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  // Ensure ytmusic is initialized for all other endpoints
  try {
    const yt = await getYTMusic();
    if (!yt) return sendError(res, 'youtubei.js not initialized', 503);

    const pathParts = pathname.replace('/api/ytmusic/', '').replace('/api/youtube', '').split('/');

    switch (endpoint) {
      case 'search': {
        const query = (url.searchParams.get('q') || '').trim();
        if (!query) return sendError(res, 'Missing query parameter "q"', 400);
        const type = url.searchParams.get('type') || 'songs';

        let rawResults;
        if (type === 'songs') {
          rawResults = await yt.music.search(query, { type: 'song' });
          return sendJSON(res, rawResults.songs?.contents || []);
        } else if (type === 'artists') {
          rawResults = await yt.music.search(query, { type: 'artist' });
          return sendJSON(res, rawResults.artists?.contents || []);
        } else if (type === 'albums') {
          rawResults = await yt.music.search(query, { type: 'album' });
          return sendJSON(res, rawResults.albums?.contents || []);
        } else if (type === 'videos') {
          rawResults = await yt.music.search(query, { type: 'video' });
          return sendJSON(res, rawResults.videos?.contents || []);
        } else if (type === 'playlists') {
          rawResults = await yt.music.search(query, { type: 'playlist' });
          return sendJSON(res, rawResults.playlists?.contents || []);
        } else {
          rawResults = await yt.music.search(query, { type: 'song' });
          return sendJSON(res, rawResults.songs?.contents || []);
        }
      }

      case 'suggestions': {
        const query = (url.searchParams.get('q') || '').trim();
        if (!query) return sendError(res, 'Missing query parameter "q"', 400);
        try {
          const suggestions = await yt.music.getSearchSuggestions(query);
          const texts: string[] = [];
          for (const section of suggestions) {
            if (!section) continue;
            const items = section.contents || section.items || [];
            if (Array.isArray(items) && items.length > 0) {
              for (const item of items) {
                const text = extractSuggestionText(item);
                if (text) texts.push(text);
              }
            }
            if (texts.length === 0) {
              const text = extractSuggestionText(section);
              if (text) texts.push(text);
            }
          }
          return sendJSON(res, texts);
        } catch (suggestionError: any) {
          console.warn('[youtubei.js] Suggestions failed:', suggestionError?.message);
          return sendJSON(res, []);
        }
      }

      case 'song': {
        const videoId = pathParts[1];
        if (!videoId) return sendError(res, 'Missing videoId', 400);
        const song = await yt.music.getInfo(videoId);
        return sendJSON(res, song);
      }

      case 'upnext': {
        const videoId = pathParts[1];
        if (!videoId) return sendError(res, 'Missing videoId', 400);
        try {
          let upnext = await yt.music.getUpNext(videoId, `RDAMVM${videoId}`);
          if (!upnext.contents || upnext.contents.length === 0) {
            upnext = await yt.music.getUpNext(videoId);
          }
          return sendJSON(res, upnext.contents || []);
        } catch (err: any) {
          console.warn('[youtubei.js] Automix failed, attempting raw UpNext:', err?.message);
          try {
            const rawUpnext = await yt.music.getUpNext(videoId);
            return sendJSON(res, rawUpnext.contents || []);
          } catch (rawErr) {
            return sendJSON(res, []);
          }
        }
      }

      case 'lyrics': {
        const videoId = pathParts[1];
        if (!videoId) return sendError(res, 'Missing videoId', 400);
        const lyrics = await yt.music.getLyrics(videoId);
        return sendJSON(res, { lyrics: lyrics?.description?.text || '' });
      }

      case 'playlist':
      case 'playlist-videos': {
        const playlistId = pathParts[1];
        if (!playlistId) return sendError(res, 'Missing playlistId', 400);
        const playlist = await yt.music.getPlaylist(playlistId);
        return sendJSON(res, playlist.items || []);
      }

      case 'trending': {
        try {
          const exp = await yt.music.getExplore();
          const trendingSection: any = exp.sections?.find((s: any) => {
            const titleStr = s.header?.title?.text || s.title?.text || '';
            return titleStr.toLowerCase().includes('trending') && s.contents?.length > 0;
          });
          
          if (trendingSection) {
            return sendJSON(res, trendingSection.contents);
          } else {
            return sendJSON(res, exp.top_songs?.contents || []);
          }
        } catch (err: any) {
          console.warn('[youtubei.js] Trending failed:', err?.message);
          return sendJSON(res, []);
        }
      }

      case 'stream': {
        const videoId = pathParts[1];
        if (!videoId) return sendError(res, 'Missing videoId', 400);

        let finalUrl: string | null = null;
        let finalMimeType = 'audio/webm';
        let finalBitrate = 128000;

        try {
          const info = await yt.getBasicInfo(videoId);
          const streamingData = info.streaming_data;
          
          if (streamingData) {
            async function getFormatUrl(format: any): Promise<string | null> {
              try {
                if (format.url) return format.url;
                if (typeof format.decipher === 'function') {
                  const res = format.decipher(yt.session.player);
                  if (res && typeof res.then === 'function') return await res;
                  return res;
                }
                if (format.signature_cipher || format.cipher) {
                  const params = new URLSearchParams(format.signature_cipher || format.cipher);
                  return params.get('url');
                }
              } catch (e) { /* ignore to permit fallback */ }
              return null;
            }

            const audioFormats = (streamingData.adaptive_formats || [])
              .filter((f: any) => f.mime_type?.startsWith('audio/'))
              .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));

            for (const fmt of audioFormats) {
              const strUrl = await getFormatUrl(fmt);
              if (typeof strUrl === 'string' && strUrl.startsWith('http')) {
                finalUrl = strUrl;
                finalMimeType = fmt.mime_type;
                finalBitrate = fmt.bitrate;
                break;
              }
            }

            if (!finalUrl) {
              const muxedFormats = (streamingData.formats || []).sort((a: any, b: any) => (a.bitrate || 0) - (b.bitrate || 0));
              for (const fmt of muxedFormats) {
                const strUrl = await getFormatUrl(fmt);
                if (typeof strUrl === 'string' && strUrl.startsWith('http')) {
                  finalUrl = strUrl;
                  finalMimeType = fmt.mime_type;
                  finalBitrate = fmt.bitrate;
                  break;
                }
              }
            }
          }
        } catch (ytErr: any) {
          console.warn('[youtubei.js] Fast extraction failed:', ytErr?.message);
        }

        if (finalUrl) {
          return sendJSON(res, { url: finalUrl, mimeType: finalMimeType, bitrate: finalBitrate });
        } else {
          return sendError(res, 'No audio streams found.', 404);
        }
      }

      default:
        return sendError(res, `Unknown endpoint: ${endpoint}`, 404);
    }
  } catch (error: any) {
    console.error(`[youtubei.js] Error on ${endpoint}:`, error?.message || error);
    return sendError(res, error?.message || 'Internal server error');
  }
}
