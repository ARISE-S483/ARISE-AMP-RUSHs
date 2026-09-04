// Vite plugin — runs youtubei.js server-side to avoid CORS and 400 errors
// Handles /api/ytmusic/* requests during dev and preview

import type { Plugin, ViteDevServer } from 'vite';

export function ytmusicPlugin(): Plugin {
  let ytmusicInstance: any = null;
  let initPromise: Promise<void> | null = null;

  const userInstances = new Map<string, any>();
  const streamUrlCache = new Map<string, { url: string; directUrl: string; mimeType: string; bitrate: number; loudnessDb: number; timestamp: number }>();

  async function getYTMusic(cookie?: string) {
    if (cookie && cookie.trim()) {
      const trimmed = cookie.trim();
      if (userInstances.has(trimmed)) return userInstances.get(trimmed);
      try {
        const { Innertube, UniversalCache, Platform } = await import('youtubei.js');
        Platform.shim.eval = async (data: any) => {
          return new Function(data.output)();
        };
        const inst = await Innertube.create({
          cookie: trimmed,
          cache: new UniversalCache(false),
          generate_session_locally: true,
        });
        userInstances.set(trimmed, inst);
        return inst;
      } catch (err) {
        console.warn('[youtubei.js] Authenticated instance creation failed, falling back to public:', err);
      }
    }

    if (ytmusicInstance) return ytmusicInstance;
    if (initPromise) {
      await initPromise;
      return ytmusicInstance;
    }
    initPromise = (async () => {
      try {
        const { Innertube, UniversalCache, Platform } = await import('youtubei.js');
        Platform.shim.eval = async (data: any) => {
          return new Function(data.output)();
        };
        ytmusicInstance = await Innertube.create({
          cache: new UniversalCache(true),
          generate_session_locally: true,
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
      const cookieHeader = (req.headers['x-youtube-cookie'] as string) || (req.headers['authorization'] as string) || '';

      try {
        const yt = await getYTMusic(cookieHeader);
        if (!yt) return sendError(res, 'youtubei.js not initialized', 503);

        switch (endpoint) {
          case 'health': {
            return sendJSON(res, {
              ok: true,
              engine: 'YouTube.js (InnerTube)',
              docs: 'https://ytjs.dev/api/',
              version: '17.0.1',
              timestamp: Date.now(),
            });
          }

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

          case 'playlist-videos': {
            const playlistId = pathParts[1];
            if (!playlistId) return sendError(res, 'Missing playlistId', 400);
            const playlist = await yt.music.getPlaylist(playlistId);
            return sendJSON(res, playlist.items || []);
          }

          case 'playlist': {
            const playlistId = pathParts[1];
            if (!playlistId) return sendError(res, 'Missing playlistId', 400);
            const playlist = await yt.music.getPlaylist(playlistId);
            return sendJSON(res, playlist || {});
          }

          case 'album': {
            const browseId = pathParts[1];
            if (!browseId) return sendError(res, 'Missing browseId', 400);
            const album = await yt.music.getAlbum(browseId);
            return sendJSON(res, album || {});
          }

          case 'artist': {
            const browseId = pathParts[1];
            if (!browseId) return sendError(res, 'Missing browseId', 400);
            try {
              const artist = await yt.music.getArtist(browseId);
              return sendJSON(res, artist || {});
            } catch (err: any) {
              console.warn('[youtubei.js] getArtist failed, falling back to channel:', err?.message);
              const channel = await yt.getChannel(browseId);
              return sendJSON(res, { page: channel, header: channel?.header, sections: channel?.sections });
            }
          }

          case 'home': {
            try {
              const feed = await yt.music.getHomeFeed();
              return sendJSON(res, feed || {});
            } catch (err: any) {
              console.warn('[youtubei.js] getHomeFeed failed, falling back to explore:', err?.message);
              const exp = await yt.music.getExplore();
              return sendJSON(res, exp || {});
            }
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

          case 'account': {
            try {
              const info = await yt.account.getInfo().catch(() => null);
              const channelName = info?.contents?.channel_name || info?.name || 'YouTube User';
              const channelHandle = info?.contents?.channel_handle || '@user';
              const email = info?.contents?.email || '';
              const thumbnail = info?.contents?.thumbnail?.[0]?.url || '';
              const channelId = info?.contents?.channel_id || '';
              return sendJSON(res, { name: channelName, handle: channelHandle, email, thumbnail, channelId });
            } catch (err: any) {
              return sendJSON(res, { name: 'YouTube User', handle: '@user', thumbnail: '' });
            }
          }

          case 'library': {
            try {
              const library = await yt.music.getLibrary();
              return sendJSON(res, library || {});
            } catch (err: any) {
              return sendError(res, err?.message || 'Failed to fetch library', 500);
            }
          }

          case 'liked-songs': {
            try {
              const liked = await yt.music.getPlaylist('VLLM');
              return sendJSON(res, liked?.items || []);
            } catch (err: any) {
              return sendError(res, err?.message || 'Failed to fetch liked songs', 500);
            }
          }

          case 'rate': {
            const videoId = url.searchParams.get('videoId') || pathParts[1];
            const rating = (url.searchParams.get('rating') || 'like').toLowerCase();
            if (!videoId) return sendError(res, 'Missing videoId', 400);
            try {
              if (rating === 'like') {
                await yt.music.like(videoId);
              } else if (rating === 'dislike') {
                await yt.music.dislike(videoId);
              } else {
                await yt.music.removeLike(videoId);
              }
              return sendJSON(res, { success: true, videoId, rating });
            } catch (err: any) {
              return sendError(res, err?.message || 'Failed to rate song', 500);
            }
          }

          case 'playlist-create': {
            const title = url.searchParams.get('title') || 'New Playlist';
            const description = url.searchParams.get('description') || '';
            try {
              const result = await yt.music.createPlaylist(title, description);
              return sendJSON(res, result || { success: true });
            } catch (err: any) {
              return sendError(res, err?.message || 'Failed to create playlist', 500);
            }
          }

          case 'playlist-delete': {
            const playlistId = pathParts[1] || url.searchParams.get('playlistId');
            if (!playlistId) return sendError(res, 'Missing playlistId', 400);
            try {
              const result = await yt.music.deletePlaylist(playlistId);
              return sendJSON(res, result || { success: true });
            } catch (err: any) {
              return sendError(res, err?.message || 'Failed to delete playlist', 500);
            }
          }

          case 'playlist-edit': {
            const playlistId = pathParts[1] || url.searchParams.get('playlistId');
            const action = url.searchParams.get('action'); // 'add' or 'remove'
            const videoId = url.searchParams.get('videoId');
            if (!playlistId || !videoId) return sendError(res, 'Missing playlistId or videoId', 400);
            try {
              if (action === 'remove') {
                await yt.music.removeTracksFromPlaylist(playlistId, [videoId]);
              } else {
                await yt.music.addTracksToPlaylist(playlistId, [videoId]);
              }
              return sendJSON(res, { success: true, playlistId, videoId, action });
            } catch (err: any) {
              return sendError(res, err?.message || 'Failed to edit playlist', 500);
            }
          }

          case 'subscribe': {
            const channelId = pathParts[1] || url.searchParams.get('channelId');
            const action = url.searchParams.get('action') || 'subscribe';
            if (!channelId) return sendError(res, 'Missing channelId', 400);
            try {
              if (action === 'unsubscribe') {
                await yt.music.unsubscribe(channelId);
              } else {
                await yt.music.subscribe(channelId);
              }
              return sendJSON(res, { success: true, channelId, action });
            } catch (err: any) {
              return sendError(res, err?.message || 'Failed to subscribe/unsubscribe', 500);
            }
          }

          case 'ytify': {
            const sub = pathParts[1];
            if (sub === 'search') {
              const query = (url.searchParams.get('q') || '').trim();
              const filter = (url.searchParams.get('f') || 'song').trim();
              if (!query) return sendError(res, 'Missing q query parameter', 400);

              try {
                const searchRes = await fetch(`https://api.ytify.workers.dev/search?q=${encodeURIComponent(query)}&f=${encodeURIComponent(filter)}`, {
                  headers: {
                    'Accept': 'application/json',
                    'Origin': 'https://ytify.pp.ua',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                  },
                  signal: AbortSignal.timeout(8000),
                });
                if (searchRes.ok) {
                  const json = await searchRes.json();
                  return sendJSON(res, json);
                }
                return sendError(res, `Ytify search failed: ${searchRes.statusText}`, searchRes.status);
              } catch (e: any) {
                return sendError(res, e?.message || 'Ytify search failed', 500);
              }
            }

            if (sub === 'suggestions') {
              const query = (url.searchParams.get('q') || '').trim();
              if (!query) return sendJSON(res, []);
              try {
                const sugRes = await fetch(`https://api.ytify.workers.dev/search-suggestions?q=${encodeURIComponent(query)}&music=true`, {
                  headers: {
                    'Accept': 'application/json',
                    'Origin': 'https://ytify.pp.ua',
                  },
                  signal: AbortSignal.timeout(4000),
                });
                if (sugRes.ok) {
                  const json = await sugRes.json();
                  return sendJSON(res, json);
                }
                return sendJSON(res, []);
              } catch {
                return sendJSON(res, []);
              }
            }

            if (sub === 'stream') {
              const videoId = pathParts[2] || url.searchParams.get('videoId') || url.searchParams.get('id');
              if (!videoId) return sendError(res, 'Missing videoId', 400);

              try {
                const streamRes = await fetch(`https://ytify.pp.ua/s/${encodeURIComponent(videoId)}`, {
                  headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                  },
                  signal: AbortSignal.timeout(8000),
                });

                if (streamRes.ok) {
                  const data: any = await streamRes.json();
                  const formats = data.adaptiveFormats || [];
                  const audioFormats = formats.filter((f: any) => {
                    const type = (f.mimeType || f.type || '').toLowerCase();
                    return type.startsWith('audio/') || f.itag === 140 || f.itag === 251 || f.itag === 250;
                  });

                  if (audioFormats.length > 0) {
                    audioFormats.sort((a: any, b: any) => (Number(b.bitrate) || 0) - (Number(a.bitrate) || 0));
                    const best = audioFormats[0];
                    const directUrl = best.url;
                    const proxiedUrl = `/api/ytmusic/proxy?url=${encodeURIComponent(directUrl)}`;
                    return sendJSON(res, {
                      url: proxiedUrl,
                      directUrl,
                      mimeType: best.mimeType || best.type || 'audio/webm',
                      bitrate: Number(best.bitrate) || 160000,
                      loudnessDb: 0,
                      source: 'ytify',
                      instance: 'https://ytify.pp.ua',
                    });
                  }
                }
                return sendError(res, 'No audio streams returned by Ytify', 502);
              } catch (err: any) {
                return sendError(res, err?.message || 'Ytify stream fetch failed', 500);
              }
            }

            return sendError(res, 'Unknown ytify sub-endpoint', 404);
          }

          case 'invidious': {
            let videoId = url.searchParams.get('videoId') || url.searchParams.get('id');
            if (!videoId) {
              videoId = (pathParts[1] === 'stream' ? pathParts[2] : pathParts[1]) || pathParts[2];
            }
            if (!videoId) return sendError(res, 'Missing videoId', 400);

            const customInstance = (url.searchParams.get('instance') || '').trim().replace(/\/+$/, '');
            const instances = [
              ...(customInstance ? [customInstance] : []),
              'https://inv.nadeko.net',
              'https://invidious.nerdvpn.de',
              'https://invidious.tiekoetter.com',
              'https://invidious.f5.si',
            ];

            const probeInstance = async (inst: string) => {
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 3500);
              try {
                const invRes = await fetch(`${inst}/api/v1/videos/${encodeURIComponent(videoId)}`, {
                  headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                  },
                  signal: controller.signal,
                });
                clearTimeout(timeout);
                if (!invRes.ok) return null;
                const data: any = await invRes.json();
                const formats = [...(data.adaptiveFormats || []), ...(data.formatStreams || [])];
                const audioFormats = formats.filter((f: any) => {
                  if (!f || !f.url) return false;
                  const type = (f.type || '').toLowerCase();
                  const container = (f.container || '').toLowerCase();
                  return type.startsWith('audio/') || container === 'webm' || container === 'm4a' || !!f.audioQuality;
                });
                if (audioFormats.length === 0) return null;
                audioFormats.sort((a: any, b: any) => (parseInt(b.bitrate || '0', 10) || 0) - (parseInt(a.bitrate || '0', 10) || 0));
                const best = audioFormats[0];
                let directUrl = best.url;
                if (directUrl.startsWith('/')) directUrl = `${inst}${directUrl}`;
                return {
                  url: `/api/ytmusic/proxy?url=${encodeURIComponent(directUrl)}`,
                  directUrl,
                  mimeType: best.type || (best.container ? `audio/${best.container}` : 'audio/webm'),
                  bitrate: parseInt(best.bitrate || '160000', 10) || 160000,
                  loudnessDb: 0,
                  instance: inst,
                };
              } catch {
                clearTimeout(timeout);
                return null;
              }
            };

            // Probe instances concurrently
            const results = await Promise.all(instances.map(probeInstance));
            const extracted = results.find((r) => r !== null);

            if (extracted) {
              return sendJSON(res, extracted);
            }
            return sendError(res, 'Invidious instances did not return working audio streams', 502);
          }

          case 'stream': {
            const videoId = pathParts[1] || url.searchParams.get('videoId') || url.searchParams.get('id');
            if (!videoId) return sendError(res, 'Missing videoId', 400);

            const cached = streamUrlCache.get(videoId);
            if (cached && (Date.now() - cached.timestamp < 4 * 3600 * 1000)) {
              return sendJSON(res, cached);
            }

            let finalUrl: string | null = null;
            let finalMimeType = 'audio/webm';
            let finalBitrate = 160000;
            let finalLoudnessDb = 0;

            // 1. Primary: Use native yt-dlp binary (VISIONOS / ad-free high-speed direct stream)
            try {
              const { execFile } = await import('child_process');
              const path = await import('path');
              const ytDlpPath = path.join(process.cwd(), 'yt-dlp.exe');

              // Fetch loudnessDb in parallel
              yt.getBasicInfo(videoId).then((info: any) => {
                finalLoudnessDb = (info.basic_info as any)?.loudness_db ?? (info.playability_status as any)?.loudness_db ?? 0;
              }).catch(() => {});

              finalUrl = await new Promise<string>((resolve, reject) => {
                execFile(ytDlpPath, ['--no-warnings', '--print', 'url', '-f', 'bestaudio/best', `https://www.youtube.com/watch?v=${videoId}`], { timeout: 35000 }, (error, stdout) => {
                  if (error && stdout.trim() === '') {
                    reject(error);
                    return;
                  }
                  const url = stdout.trim().split('\n')[0];
                  if (url && url.startsWith('http')) resolve(url);
                  else reject(new Error('Invalid URL returned by yt-dlp'));
                });
              });
              finalMimeType = 'audio/webm';
              finalBitrate = 160000;
            } catch (dlpErr: any) {
              console.warn('[ytmusic-plugin] yt-dlp extraction failed, trying youtubei fallback:', dlpErr?.message);
            }

            // 2. Fallback: youtubei.js
            if (!finalUrl) {
              try {
                const info = await yt.music.getInfo(videoId).catch(() => yt.getBasicInfo(videoId));
                finalLoudnessDb = (info.basic_info as any)?.loudness_db ?? (info.playability_status as any)?.loudness_db ?? 0;
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
                }
              } catch (ytErr: any) {
                console.warn('[youtubei.js] Extraction fallback failed:', ytErr?.message);
              }
            }

            if (finalUrl) {
              const streamUrl = `/api/ytmusic/proxy?url=${encodeURIComponent(finalUrl)}`;
              const result = { url: streamUrl, directUrl: finalUrl, mimeType: finalMimeType, bitrate: finalBitrate, loudnessDb: finalLoudnessDb, timestamp: Date.now() };
              streamUrlCache.set(videoId, result);
              return sendJSON(res, result);
            } else {
              return sendError(res, 'No audio streams found.', 404);
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
              
              const streamUrl = `/api/ytmusic/proxy?url=${encodeURIComponent(finalUrl)}`;
              return sendJSON(res, { url: streamUrl, directUrl: finalUrl, mimeType: 'audio/webm', bitrate: 160000 });
            } catch (dlpErr: any) {
              console.error('[ytmusic-plugin] yt-dlp fallback failed:', dlpErr?.message);
              return sendError(res, 'Stream extraction failed via yt-dlp completely', 500);
            }
          }

          case 'proxy': {
            const urlQuery = new URL(req.url!, `http://${req.headers.host}`).searchParams.get('url');
            if (!urlQuery) return sendError(res, 'Missing url query param', 400);

            console.log('[PROXY REQ HEADERS]', {
              range: req.headers['range'],
              userAgent: req.headers['user-agent'],
              referer: req.headers['referer'],
              origin: req.headers['origin'],
              secFetchMode: req.headers['sec-fetch-mode'],
            });

            try {
              const https = await import('https');
              const http = await import('http');

              const followRedirectAndStream = (targetUrl: string, maxRedirects = 5) => {
                const targetObj = new URL(targetUrl);
                const mod = targetObj.protocol === 'https:' ? https : http;

                const proxyReq: any = mod.get(targetUrl, {
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Range': req.headers['range'] || 'bytes=0-',
                  }
                }, (proxyRes) => {
                  if (proxyRes.statusCode && proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location && maxRedirects > 0) {
                    proxyRes.resume();
                    const nextUrl = new URL(proxyRes.headers.location, targetUrl).toString();
                    return followRedirectAndStream(nextUrl, maxRedirects - 1);
                  }

                  console.log('[PROXY GOOGLEVIDEO RES]', proxyRes.statusCode, proxyRes.headers['content-range'] || proxyRes.headers['content-length']);
                  if (proxyRes.statusCode) res.statusCode = proxyRes.statusCode;
                  
                  // Copy all headers securely
                  Object.keys(proxyRes.headers).forEach((key) => {
                    try {
                      res.setHeader(key, proxyRes.headers[key]!);
                    } catch (e) { /* ignore restricted headers */ }
                  });

                  // Enforce CORS for Web Audio API
                  res.setHeader('Access-Control-Allow-Origin', '*');
                  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
                  res.setHeader('Access-Control-Allow-Headers', '*');
                  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

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
              };

              followRedirectAndStream(urlQuery);
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
