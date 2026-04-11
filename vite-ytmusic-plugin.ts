// Vite plugin — runs youtubei.js server-side to avoid CORS and 400 errors
// Handles /api/ytmusic/* requests during dev and preview

import type { Plugin, ViteDevServer } from 'vite';

export function ytmusicPlugin(): Plugin {
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
    // SearchSuggestion type has .suggestion which is a Text node
    if (item.suggestion) {
      if (typeof item.suggestion === 'string') return item.suggestion;
      if (item.suggestion.text) return String(item.suggestion.text);
      if (typeof item.suggestion.toString === 'function') {
        const s = item.suggestion.toString();
        if (s && s !== '[object Object]') return s;
      }
    }
    // Try .query
    if (typeof item.query === 'string' && item.query) return item.query;
    // Try .text
    if (item.text) {
      if (typeof item.text === 'string') return item.text;
      if (typeof item.text === 'object' && typeof item.text.toString === 'function') {
        const s = item.text.toString();
        if (s && s !== '[object Object]') return s;
      }
    }
    // Try text runs
    if (item.runs && Array.isArray(item.runs)) {
      const combined = item.runs.map((r: any) => r.text || '').join('');
      if (combined.trim()) return combined;
    }
    // toString() fallback
    if (typeof item.toString === 'function') {
      const s = item.toString();
      if (s && s !== '[object Object]') return s;
    }
    return null;
  }

  function setupMiddlewares(server: any) {
    // Prevent youtubei.js internal unhandled rejections from crashing the Vite server
    process.removeAllListeners('unhandledRejection');
    process.on('unhandledRejection', (reason: any) => {
      console.warn('[vite-ytmusic-plugin] Caught unhandled rejection:', reason?.message || reason);
    });

    // ===== CORS Proxy — proxies external requests server-side =====
    server.middlewares.use(async (req: any, res: any, next: any) => {
      if (!req.url?.startsWith('/api/cors-proxy')) return next();

      // CORS preflight
      if (req.method === 'OPTIONS') {
        res.writeHead(204, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        });
        res.end();
        return;
      }

      try {
        const parsed = new URL(req.url, `http://${req.headers.host}`);
        const targetUrl = parsed.searchParams.get('url');
        if (!targetUrl) {
          sendJSON(res, { error: 'Missing "url" query parameter' }, 400);
          return;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(targetUrl, {
          method: 'HEAD',
          signal: controller.signal,
          headers: { 'User-Agent': 'Melodies-HealthCheck/1.0' },
          redirect: 'follow',
        }).catch(async () => {
          // HEAD may not be allowed, try GET
          return fetch(targetUrl, {
            method: 'GET',
            signal: controller.signal,
            headers: { 'User-Agent': 'Melodies-HealthCheck/1.0' },
            redirect: 'follow',
          });
        });

        clearTimeout(timeout);

        sendJSON(res, {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          url: targetUrl,
        });
      } catch (error: any) {
        sendJSON(res, {
          ok: false,
          status: 0,
          statusText: error?.message || 'Network error',
          url: '',
        });
      }
    });

    // ===== YouTube Music API =====
    server.middlewares.use(async (req: any, res: any, next: any) => {
      if (!req.url?.startsWith('/api/ytmusic/')) return next();

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

      const url = new URL(req.url, `http://${req.headers.host}`);
      const pathParts = url.pathname.replace('/api/ytmusic/', '').split('/');
      const endpoint = pathParts[0];

      try {
        const yt = await getYTMusic();
        if (!yt) return sendError(res, 'youtubei.js not initialized', 503);

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
              
              // youtubei.js v17 getSearchSuggestions returns SearchSuggestionsSection[]
              // Each section has a `contents` array with suggestion items
              for (const section of suggestions) {
                if (!section) continue;
                
                // If section has contents array (SearchSuggestionsSection format)
                const items = section.contents || section.items || [];
                if (Array.isArray(items) && items.length > 0) {
                  for (const item of items) {
                    const text = extractSuggestionText(item);
                    if (text) texts.push(text);
                  }
                }
                
                // If section itself is a suggestion item (flat array format)
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
                // Fallback to top_songs if trending is missing
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

            // 1. Try youtubei.js (Fastest)
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
                  const url = await getFormatUrl(fmt);
                  if (typeof url === 'string' && url.startsWith('http')) {
                    finalUrl = url;
                    finalMimeType = fmt.mime_type;
                    finalBitrate = fmt.bitrate;
                    break;
                  }
                }

                if (!finalUrl) {
                  const muxedFormats = (streamingData.formats || []).sort((a: any, b: any) => (a.bitrate || 0) - (b.bitrate || 0));
                  for (const fmt of muxedFormats) {
                    const url = await getFormatUrl(fmt);
                    if (typeof url === 'string' && url.startsWith('http')) {
                      finalUrl = url;
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
              return sendError(res, 'No audio streams found by youtubei.js.', 404);
            }
          }

          case 'ytdlp': {
            const videoId = pathParts[1];
            if (!videoId) return sendError(res, 'Missing videoId', 400);

            try {
              const { execFile } = await import('child_process');
              const path = await import('path');
              const ytDlpPath = path.join(process.cwd(), 'yt-dlp.exe');
              
              const finalUrl = await new Promise<string>((resolve, reject) => {
                execFile(ytDlpPath, ['--no-warnings', '--print', 'url', '-f', 'bestaudio/best', `https://www.youtube.com/watch?v=${videoId}`], { timeout: 35000 }, (error, stdout) => {
                  if (error && stdout.trim() === '') {
                    reject(error);
                    return;
                  }
                  const url = stdout.trim().split('\n')[0]; // Grabs the first url securely if multiple outputs
                  if (url && url.startsWith('http')) resolve(url);
                  else reject(new Error('Invalid URL returned by yt-dlp'));
                });
              });
              
              return sendJSON(res, { url: finalUrl, mimeType: 'audio/webm', bitrate: 128000 });
            } catch (dlpErr: any) {
              console.error('[ytmusic-plugin] yt-dlp fallback failed:', dlpErr?.message);
              return sendError(res, 'Stream extraction failed via yt-dlp completely', 500);
            }
          }

          case 'proxy': {
            const urlQuery = new URL(req.url!, `http://${req.headers.host}`).searchParams.get('url');
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
                
                // Copy all headers securely
                Object.keys(proxyRes.headers).forEach((key) => {
                  try {
                    res.setHeader(key, proxyRes.headers[key]!);
                  } catch (e) { /* ignore restricted headers */ }
                });

                proxyRes.pipe(res);

                res.on('error', (err: any) => {
                  if (err?.code !== 'ECONNRESET') {
                    console.error('[proxy res err]', err?.message);
                  }
                  proxyReq.destroy();
                });

                proxyRes.on('error', (err: any) => {
                  if (err?.code !== 'ECONNRESET' && err?.message !== 'aborted') {
                    console.error('[proxy stream err]', err?.message);
                  }
                  res.end();
                });
              });

              proxyReq.on('error', (err: any) => {
                if (err?.code !== 'ECONNRESET' && err?.message !== 'aborted') {
                  console.error('[proxy req err]', err?.message);
                }
                if (!res.headersSent) {
                  return sendError(res, `Proxy request failed: ${err.message}`, 500);
                }
              });

              req.on('close', () => {
                proxyReq.destroy();
              });
              
              req.on('error', (err: any) => {
                if (err?.code !== 'ECONNRESET') {
                  console.warn('[proxy req close err]', err?.message);
                }
                proxyReq.destroy();
              });

              return;
            } catch (err: any) {
              return sendError(res, err.message, 500);
            }
          }

          default:
            return sendError(res, `Unknown endpoint: ${endpoint}`, 404);
        }
      } catch (error: any) {
        console.error(`[youtubei.js] Error on ${endpoint}:`, error?.message || error);
        return sendError(res, error?.message || 'Internal server error');
      }
    });
  }

  return {
    name: 'vite-ytmusic-plugin',
    configureServer(server: ViteDevServer) {
      setupMiddlewares(server);
    },
    configurePreviewServer(server: any) {
      setupMiddlewares(server);
    }
  };
}
