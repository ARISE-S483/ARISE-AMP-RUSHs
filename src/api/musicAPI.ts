// Unified Music API Orchestrator
// Merges results from Piped (YouTube Music), YT Music API, TIDAL (Monochrome), and JioSaavn
// Priority: YT Music / Piped primary for everything, TIDAL as fallback

import { hifiAPI } from './piped';
import { pipedClient } from './pipedClient';
import { jiosaavnClient } from './jiosaavnClient';
import { ytmusicClient } from './ytmusicClient';
import { rapidapiClient } from './rapidapiClient';
import { deezerClient } from './deezerClient';
import { shazamClient } from './shazamClient';
import { spotify23Client } from './spotify23Client';
import { cobaltClient } from './cobaltClient';
import type { Track, Artist, Album, Playlist, SearchResults } from './types';
import { monoSearch, monoGetTrack, monoGetAlbum } from './monochromeBridge';

// ========== Deduplication ==========

export function normalizeTitle(s?: string): string {
  if (!s) return '';
  return s.toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/(feat|ft)\.?.*$/i, '')
    // Strip common YouTube filler words to drastically improve strict matching
    .replace(/\b(lyrical|lyric|video|audio|official|music|ost|soundtrack|full)\b/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isSameTrack(a: Track, b: Track): boolean {
  const titleA = normalizeTitle(a.title);
  const titleB = normalizeTitle(b.title);

  if (!titleA || !titleB) return false;

  const artistA = normalizeTitle(a.artist?.name || '');
  const artistB = normalizeTitle(b.artist?.name || '');

  // STRICT Exact Match required to prevent swallowing remixes
  if (titleA !== titleB) return false;

  // STRICT Exact Artist Match (except if missing)
  if (!artistA || !artistB) return true;

  return artistA === artistB;
}

function deduplicateTracks(tracks: Track[]): Track[] {
  const result: Track[] = [];
  for (const track of tracks) {
    // Ensure track has required fields with fallbacks
    const normalizedTrack: Track = {
      ...track,
      title: track.title || 'Unknown Track',
      artist: track.artist || { id: 0, name: 'Unknown Artist' },
      thumbnail: track.thumbnail || track.thumbnailLarge || (track.videoId ? `https://i.ytimg.com/vi/${track.videoId}/hqdefault.jpg` : ''),
      duration: track.duration || 0,
    };

    const existingIndex = result.findIndex(existing => isSameTrack(existing, normalizedTrack));

    if (existingIndex === -1) {
      if (!normalizedTrack.thumbnail && normalizedTrack.videoId) {
        normalizedTrack.thumbnail = `https://i.ytimg.com/vi/${normalizedTrack.videoId}/hqdefault.jpg`;
        normalizedTrack.thumbnailLarge = `https://i.ytimg.com/vi/${normalizedTrack.videoId}/maxresdefault.jpg`;
      }
      result.push(normalizedTrack);
    } else {
      const existing = result[existingIndex];
      // TIDAL > Spotify/Deezer > JioSaavn > Piped > YouTube
      const getRank = (src?: string) => {
        if (src === 'tidal') return 5;
        if (src === 'spotify' || src === 'deezer') return 4;
        if (src === 'jiosaavn') return 3;
        if (src === 'piped') return 2;
        if (src === 'youtube') return 1;
        return 0;
      };

      const existingRank = getRank(existing.source);
      const newRank = getRank(normalizedTrack.source);

      // Preserve the vital videoId for streaming playback stability
      const preservedVideoId = existing.videoId || normalizedTrack.videoId;
      // Preserve the thumbnail if the higher rank source returned an empty one
      const preservedThumbnail = normalizedTrack.thumbnail || existing.thumbnail || (preservedVideoId ? `https://i.ytimg.com/vi/${preservedVideoId}/hqdefault.jpg` : '');
      const preservedThumbnailLarge = normalizedTrack.thumbnailLarge || existing.thumbnailLarge || preservedThumbnail;

      if (newRank > existingRank) {
        // incoming is better quality/meta -> upgrade existing
        result[existingIndex] = { 
          ...normalizedTrack, 
          videoId: preservedVideoId,
          thumbnail: preservedThumbnail,
          thumbnailLarge: preservedThumbnailLarge
        };
      } else {
        // existing was better, just attach the new videoId if it exists
        if (preservedVideoId) existing.videoId = preservedVideoId;
        if (!existing.thumbnail && preservedThumbnail) existing.thumbnail = preservedThumbnail;
      }
    }
  }
  return result;
}

// ========== Unified API ==========

class MusicAPI {

  // ===== Search =====
  // Primary: YT Music → Piped → TIDAL → JioSaavn → RapidAPI → Deezer → Shazam → Spotify
  async search(query: string, signal?: AbortSignal): Promise<SearchResults> {
    // ─── Direct YouTube URL Parsing ───
    const ytMatch = query.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch && ytMatch[1]) {
      const videoId = ytMatch[1];
      const track = await pipedClient.getTrackDetails(videoId);
      if (track) {
        return {
          tracks: [track],
          videos: [track],
          artists: [],
          albums: [],
          playlists: []
        };
      }
    }
    const signalPromise = new Promise((_, reject) => {
      if (signal) {
        signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      }
    });

    const searchPromise = monoSearch(query);
    const result = await Promise.race([searchPromise, signalPromise]) as SearchResults;
    return result;
  }

  async searchTracks(query: string, signal?: AbortSignal): Promise<Track[]> {
    const results = await this.search(query, signal);
    return results.tracks;
  }

  async getTrack(id: string): Promise<Track> {
    return monoGetTrack(id);
  }

  async getAlbum(id: string): Promise<Album> {
    return monoGetAlbum(id);
  }

  async searchArtists(query: string, signal?: AbortSignal): Promise<Artist[]> {
    // Try TIDAL first (has structured artist data), graceful fallback
    try {
      const results = await hifiAPI.searchArtists(query, signal);
      if (results.length > 0) return results;
    } catch { /* fallback */ }
    return [];
  }

  async searchAlbums(query: string, signal?: AbortSignal): Promise<Album[]> {
    // Try TIDAL first (has structured album data), graceful fallback
    try {
      const results = await hifiAPI.searchAlbums(query, signal);
      if (results.length > 0) return results;
    } catch { /* fallback */ }
    return [];
  }

  async searchPlaylists(query: string, signal?: AbortSignal): Promise<Playlist[]> {
    // Try TIDAL first (has structured playlist data), graceful fallback
    try {
      const results = await hifiAPI.searchPlaylists(query, signal);
      if (results.length > 0) return results;
    } catch { /* fallback */ }
    return [];
  }

  // ===== Suggestions =====
  // Primary: Piped (fastest)
  async getSuggestions(query: string): Promise<string[]> {
    // Try YT Music suggestions first (best music-specific results)
    try {
      const ytmSuggestions = await ytmusicClient.getSuggestions(query);
      if (ytmSuggestions.length > 0) return ytmSuggestions;
    } catch { /* fallback */ }

    // Then Piped
    try {
      const suggestions = await pipedClient.getSuggestions(query);
      if (suggestions.length > 0) return suggestions;
    } catch { /* fallback */ }

    return hifiAPI.getSuggestions(query);
  }

  // ===== Streaming =====
  // PRIORITY ORDER (fastest + most reliable first):
  //   1. JioSaavn bridge  — free, fast, no 403s, 320kbps MP3 (for piped/ytm tracks)
  //   2. Piped            — direct YouTube audio (can 403)
  //   3. Invidious        — alternative YouTube proxy
  //   4. JioSaavn fallback— independent search by title+artist  
  //   5. TIDAL            — for TIDAL-sourced tracks or last resort
  async getStreamUrl(track: Track, quality: string = 'HIGH'): Promise<string | null> {
    const source = track.source;

    // If track has a pre-resolved stream URL that isn't just cached from a bad prior call, use it
    if (track.streamUrl) return track.streamUrl;

    // ─── JioSaavn Source (native) ───
    if (source === 'jiosaavn') {
      const url = await jiosaavnClient.getStreamUrl(String(track.id));
      if (url) return url;
      // Fallback: re-search JioSaavn by title+artist in case ID changed
      try {
        const query = `${track.title} ${track.artist?.name || ''}`;
        const results = await jiosaavnClient.searchTracks(query);
        if (results.length > 0) {
          const url2 = await jiosaavnClient.getStreamUrl(String(results[0].id));
          if (url2) return url2;
        }
      } catch { /* continue */ }
    }

    // ─── TIDAL Source (native) ───
    if (source === 'tidal') {
      const fallbackChain: Record<string, string[]> = {
        'HI_RES_LOSSLESS': ['LOSSLESS', 'HIGH', 'LOW'],
        'LOSSLESS': ['HIGH', 'LOW'],
        'HIGH': ['LOW'],
        'LOW': [],
      };
      const qualitiesToTry = [quality, ...(fallbackChain[quality] || ['HIGH', 'LOW'])];
      for (const q of qualitiesToTry) {
        try {
          const url = await hifiAPI.getStreamUrl(track.id, q);
          if (url) return url;
        } catch { /* try next quality */ }
      }
    }

    // ─── YouTube / Piped / YTM tracks ───
    // For these, the strategy is: JioSaavn bridge first (fastest, no 403s), then Piped
    if (source === 'piped' || source === 'youtube' || !source) {
      const bridgeQuery = `${track.title} ${track.artist?.name || ''}`;
      const trackTitleNorm = normalizeTitle(track.title);

      // ── STEP 1: JioSaavn Bridge (FASTEST — no 403 issues) ──
      // Race JioSaavn search against a timeout so we never block playback
      try {
        const jioResults = await Promise.race([
          jiosaavnClient.searchTracks(bridgeQuery),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
        ]) as import('./types').Track[];

        // Find the best match — check normalized title equality
        const match = jioResults.find(t => {
          const t1 = normalizeTitle(t.title);
          // Strict: both titles must match closely (not just substring)
          return t1 === trackTitleNorm ||
            (t1.startsWith(trackTitleNorm) && trackTitleNorm.length > 4) ||
            (trackTitleNorm.startsWith(t1) && t1.length > 4);
        });

        if (match) {
          const jioUrl = await jiosaavnClient.getStreamUrl(String(match.id));
          if (jioUrl) {
            console.info(`[musicAPI] JioSaavn bridge success for "${track.title}"`);
            return jioUrl;
          }
        }
      } catch (e: unknown) {
        if (e instanceof Error && e.message !== 'timeout') {
          console.warn('[musicAPI] JioSaavn bridge error:', e.message);
        }
      }

      // ── STEP 1: youtubei.js Backend Stream Extraction (Primary) ──
      // Calls our Vite backend which uses youtubei.js to extract the direct audio URL.
      // Functions perfectly without needing system-wide binaries installed.
      if (track.videoId) {
        try {
          const resp = await fetch(`/api/ytmusic/stream/${track.videoId}`, {
            signal: AbortSignal.timeout(15000), // Reduce timeout to ensure fast fallback
          });
          if (resp.ok) {
            const data = await resp.json();
            if (data.url) {
              console.info(`[musicAPI] youtubei.js stream success for "${track.title}"`);
              return `/api/ytmusic/proxy?url=${encodeURIComponent(data.url)}`;
            }
          }
        } catch { /* Server might be down or video unavailable, fallback */ }
      }

      // ── STEP 2: Cobalt API Instances (Public Bypasses) ──
      // Rapidly cascades through open-source Cobalt API instances (simulating yt-audio-api flawlessly)
      if (track.videoId) {
        try {
          const cobaltUrl = await cobaltClient.getStreamUrl(track.videoId);
          if (cobaltUrl) {
             console.info(`[musicAPI] Cobalt API stream success for "${track.title}"`);
             return `/api/ytmusic/proxy?url=${encodeURIComponent(cobaltUrl)}`;
          }
        } catch { /* Fallback to local yt-dlp */ }
      }

      // ── STEP 3: Local yt-dlp Child Process Bypass ──
      // If youtubei.js and Cobalt fail, attempt to utilize on-disk yt-dlp bindings (requires yt-dlp installed)
      if (track.videoId) {
        try {
          const resp = await fetch(`/api/ytmusic/ytdlp/${track.videoId}`, {
            signal: AbortSignal.timeout(45000),
          });
          if (resp.ok) {
            const data = await resp.json();
            if (data.url) {
              console.info(`[musicAPI] Local yt-dlp stream success for "${track.title}"`);
              return `/api/ytmusic/proxy?url=${encodeURIComponent(data.url)}`;
            }
          }
        } catch { /* Fallback to Piped */ }
      }

      // ── STEP 3: Piped direct stream (Fallback) ──
      if (track.videoId) {
        try {
          const pipedUrl = await pipedClient.getStreamUrl(track.videoId);
          if (pipedUrl) {
            console.info(`[musicAPI] Piped stream success for "${track.title}"`);
            return `/api/ytmusic/proxy?url=${encodeURIComponent(pipedUrl)}`;
          }
        } catch { /* try Invidious */ }
      }

      // ── STEP 6: Invidious (alternative YouTube proxy — different IP pool from Piped) ──
      if (track.videoId) {
        const invidiousInstances = [
          'https://invidious.io.lol',
          'https://invidious.nerdvpn.de',
          'https://inv.tux.pizza',
          'https://invidious.privacyredirect.com',
        ];
        for (const instance of invidiousInstances) {
          try {
            const resp = await fetch(`${instance}/api/v1/videos/${track.videoId}`, {
              signal: AbortSignal.timeout(5000),
            });
            if (!resp.ok) continue;
            const data = await resp.json() as { adaptiveFormats?: { url: string; type: string; bitrate: number }[] };
            const audioFormats = (data.adaptiveFormats || [])
              .filter(f => f.type?.startsWith('audio/') && f.url)
              .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
            if (audioFormats.length > 0) {
              console.info(`[musicAPI] Invidious stream success via ${instance}`);
              return audioFormats[0].url;
            }
          } catch { /* try next instance */ }
        }
      }

      // ── STEP 4: Search YTMusic → re-resolve videoId → Piped ──
      // In case the original videoId was stale/wrong
      try {
        const ytmResults = await ytmusicClient.searchSongs(bridgeQuery);
        const freshVideoId = ytmResults.length > 0 ? ytmResults[0].videoId : null;
        if (freshVideoId && freshVideoId !== track.videoId) {
          const pipedUrl2 = await pipedClient.getStreamUrl(freshVideoId);
          if (pipedUrl2) {
            console.info(`[musicAPI] Re-resolved videoId stream success for "${track.title}"`);
            return pipedUrl2;
          }
        }
      } catch { /* continue */ }

      // ── STEP 5: TIDAL last resort ──
      try {
        const tidalResults = await hifiAPI.searchTracks(bridgeQuery);
        if (tidalResults.length > 0) {
          const tidalUrl = await hifiAPI.getStreamUrl(tidalResults[0].id, 'HIGH');
          if (tidalUrl) {
            console.info(`[musicAPI] TIDAL last-resort stream success for "${track.title}"`);
            return tidalUrl;
          }
        }
      } catch { /* give up */ }
    }

    // ─── Generic fallback for any unhandled source ───
    // Just try JioSaavn search as a hail-mary
    try {
      const query = `${track.title} ${track.artist?.name || ''}`;
      const fallbackResults = await jiosaavnClient.searchTracks(query);
      if (fallbackResults.length > 0) {
        const fallbackUrl = await jiosaavnClient.getStreamUrl(String(fallbackResults[0].id));
        if (fallbackUrl) return fallbackUrl;
      }
    } catch { /* nothing worked */ }

    console.warn(`[musicAPI] All stream sources exhausted for "${track.title}" (source: ${source})`);
    return null;
  }


  // ===== Recommendations =====
  // Priority: YouTube Music 'Up Next' → Deezer (RapidAPI) → Spotify (RapidAPI)
  async getTrackRecommendations(track: Track): Promise<Track[]> {
    const results: Track[] = [];

    // 1. Concurrently fetch YT Music Up Next and TIDAL recommendations
    // This allows deduplicateTracks to seamlessly merge and upgrade YT videoIds onto high-res TIDAL tracks!
    const [ytmRecsResult, tidalRecsResult] = await Promise.allSettled([
      (async () => {
        let videoId = track.videoId;
        if (!videoId) {
          const pipedSearch = await pipedClient.searchTracks(`${track.title} ${track.artist?.name || ''}`);
          if (pipedSearch.length > 0 && pipedSearch[0].videoId) {
            videoId = pipedSearch[0].videoId;
          }
        }
        if (videoId) {
          return ytmusicClient.getUpNexts(videoId);
        }
        return [];
      })(),
      hifiAPI.getRecommendedTracksForPlaylist([track])
    ]);

    // Push TIDAL first so it merges optimally
    if (tidalRecsResult.status === 'fulfilled') results.push(...tidalRecsResult.value);
    if (ytmRecsResult.status === 'fulfilled') results.push(...ytmRecsResult.value);

    // 2. Deezer Fallback (RapidAPI Premium Metadata)
    if (results.length < 5 && track.artist?.name) {
      try {
        const { deezerClient } = await import('./deezerClient');
        const deezerRecs = await deezerClient.searchTracks(track.artist.name);
        results.push(...deezerRecs);
      } catch { /* continue */ }
    }

    // 3. Spotify Fallback (RapidAPI Premium Metadata)
    if (results.length < 5 && track.artist?.name) {
      try {
        const { spotify23Client } = await import('./spotify23Client');
        const spotifyRecs = await spotify23Client.searchTracks(track.artist.name);
        results.push(...spotifyRecs);
      } catch { /* continue */ }
    }

    return deduplicateTracks(results).slice(0, 20);
  }

  // ===== Home Recommendations =====
  async getHomeRecommendations(recentTracks: Track[]): Promise<{
    songs: Track[];
    albums: Album[];
    artists: Artist[];
  }> {
    // Primary: Piped trending (YT Music), TIDAL as supplement
    const [pipedTrending, tidalRecs] = await Promise.allSettled([
      pipedClient.getTrending(),
      hifiAPI.getHomeRecommendations(recentTracks),
    ]);

    const trending = pipedTrending.status === 'fulfilled' ? pipedTrending.value : [];
    const tidalData = tidalRecs.status === 'fulfilled' ? tidalRecs.value : { songs: [], albums: [], artists: [] };

    // Piped/YT Music trending first, then TIDAL songs as supplement
    const allSongs = deduplicateTracks([...trending, ...tidalData.songs]);

    return {
      songs: allSongs.slice(0, 25),
      albums: tidalData.albums,
      artists: tidalData.artists,
    };
  }

  // ===== Trending =====
  async getTrending(region: string = 'IN'): Promise<Track[]> {
    try {
      const resp = await fetch('/api/ytmusic/trending');
      const data = await resp.json();
      const items = Array.isArray(data) ? data : [];
      return items.filter((item: any) => item.type === 'MusicResponsiveListItem' || item.type === 'SONG' || item.type === 'VIDEO').map((item: any) => {
        const title = (item.title as any)?.text || (item.title as string) || (item.name as string) || 'Unknown Track';
        
        let artistName = 'Unknown Artist';
        let artistsList: { id: number; name: string }[] = [];
        
        const artistsData = item.artists || item.authors || item.artist || item.author;
        if (typeof artistsData === 'string') {
          artistName = artistsData;
          artistsList = [{ id: 0, name: artistName }];
        } else if (Array.isArray(artistsData) && artistsData.length > 0) {
          artistName = artistsData[0].name || 'Unknown Artist';
          artistsList = artistsData.map((a: any) => ({ id: 0, name: a.name || 'Unknown Artist' }));
        } else if (artistsData && typeof artistsData === 'object' && 'name' in (artistsData as Record<string, any>)) {
          artistName = (artistsData as any).name || 'Unknown Artist';
          artistsList = [{ id: 0, name: artistName }];
        }

        let thumbnail = '';
        let thumbnailLarge = '';
        
        let thumbArr: any[] = [];
        if (Array.isArray(item.thumbnails)) {
          thumbArr = item.thumbnails;
        } else if (item.thumbnail && Array.isArray((item.thumbnail as any).contents)) {
          thumbArr = (item.thumbnail as any).contents;
        } else if (Array.isArray(item.thumbnail)) {
          thumbArr = item.thumbnail;
        }

        if (thumbArr && thumbArr.length > 0) {
          // Sort by width descending so index 0 is largest
          const sortedThumbs = [...thumbArr].sort((a, b) => (b.width || 0) - (a.width || 0));
          thumbnail = sortedThumbs[sortedThumbs.length - 1]?.url || ''; // smallest
          thumbnailLarge = sortedThumbs[0]?.url || thumbnail;           // largest
        } else if (typeof item.thumbnail === 'string') {
          thumbnail = item.thumbnail;
          thumbnailLarge = thumbnail;
        }

        const resolvedVideoId = (item.videoId as string) || (item.video_id as string) || (item.id as string) || (item.endpoint?.payload?.videoId as string) || '';
        
        if (!thumbnail && resolvedVideoId) {
          thumbnail = `https://i.ytimg.com/vi/${resolvedVideoId}/hqdefault.jpg`;
          thumbnailLarge = `https://i.ytimg.com/vi/${resolvedVideoId}/maxresdefault.jpg`;
        }

        return {
          id: `ytm_${resolvedVideoId}`,
          title,
          artist: { id: 0, name: artistName },
          artists: artistsList,
          duration: 0,
          thumbnail: thumbnail || '',
          thumbnailLarge: thumbnailLarge || thumbnail || '',
          source: 'piped' as const, 
          videoId: resolvedVideoId,
          type: 'track' as const,
        };
      });
    } catch {
      return pipedClient.getTrending(region);
    }
  }

  // ===== Playlist-based recommendations =====
  // Strict priority: YouTube Music → Deezer → Spotify
  async getRecommendedTracksForPlaylist(
    seedTracks: Track[],
    limit: number = 20,
    options: { knownTrackIds?: Set<string | number> } = {}
  ): Promise<Track[]> {
    const allRecs: Track[] = [];

    // 1. YouTube Music (Primary)
    const ytSeeds = seedTracks.filter(t => t.videoId).slice(0, 5);
    for (const seed of ytSeeds) {
      try {
        const related = await ytmusicClient.getUpNexts(seed.videoId!);
        if (related.length > 0) {
          allRecs.push(...related);
        } else {
          // Fallback to Piped
          const pipedRelated = await pipedClient.getRelatedTracks(seed.videoId!);
          allRecs.push(...pipedRelated);
        }
      } catch { /* continue */ }
    }

    // 1b. If the seeds didn't have videoIds, search YTMusic first to hook them
    if (allRecs.length < limit / 2) {
      const nonYtSeeds = seedTracks.filter(t => !t.videoId).slice(0, 3);
      for (const seed of nonYtSeeds) {
        try {
          const ytmSearch = await ytmusicClient.searchSongs(`${seed.title} ${seed.artist?.name || ''}`);
          if (ytmSearch.length > 0 && ytmSearch[0].videoId) {
            const related = await ytmusicClient.getUpNexts(ytmSearch[0].videoId);
            allRecs.push(...related);
          }
        } catch { /* continue */ }
      }
    }

    // 2. Deezer Fallback
    if (allRecs.length < 5) {
      const artistSeeds = seedTracks.filter(t => t.artist?.name).slice(0, 2);
      for (const seed of artistSeeds) {
        try {
          const { deezerClient } = await import('./deezerClient');
          const deezerRecs = await deezerClient.searchTracks(seed.artist!.name);
          allRecs.push(...deezerRecs);
        } catch { /* continue */ }
      }
    }

    // 3. Spotify Fallback
    if (allRecs.length < 5) {
      const artistSeeds = seedTracks.filter(t => t.artist?.name).slice(0, 2);
      for (const seed of artistSeeds) {
        try {
          const { spotify23Client } = await import('./spotify23Client');
          const spotifyRecs = await spotify23Client.searchTracks(seed.artist!.name);
          allRecs.push(...spotifyRecs);
        } catch { /* continue */ }
      }
    }

    const deduped = deduplicateTracks(allRecs);
    const knownIds = options.knownTrackIds;
    const filtered = knownIds
      ? deduped.filter(t => !knownIds.has(String(t.id)))
      : deduped;

    return filtered.sort(() => Math.random() - 0.5).slice(0, limit);
  }

  // ===== Passthrough methods (TIDAL-only features) =====



  async getPlaylist(id: string) {
    return hifiAPI.getPlaylist(id);
  }

  async getArtist(id: number | string): Promise<Artist | null> {
    // 1. Try TIDAL if it's a numeric ID
    if (typeof id === 'number' || /^\d+$/.test(String(id))) {
      try {
        const tidalArtist = await hifiAPI.getArtist(id);
        if (tidalArtist && tidalArtist.tracks?.length) return tidalArtist;
      } catch { /* proceed to YT fallback */ }
    }

    // 2. Synthetic YTMusic/Piped Artist Profile
    // If we get a string ID (like 'ytm_xxx', 'spotify_xxx') or just a name,
    // we search YT Music to build a rich profile with their top songs.
    const query = String(id).replace(/^(ytm_|piped_|spotify_|jiosaavn_)/, '').replace(/-/g, ' ');

    try {
      const tracks = await ytmusicClient.searchSongs(query);
      if (tracks.length > 0) {
        // Collect a robust thumbnail from the top tracks
        const bestTrack = tracks.find(t => t.thumbnailLarge) || tracks[0];

        return {
          id: String(id),
          name: typeof id === 'string' && !id.includes('_') ? id : (bestTrack.artist?.name || query),
          thumbnail: bestTrack.thumbnail || bestTrack.thumbnailLarge || '',
          thumbnailLarge: bestTrack.thumbnailLarge || bestTrack.thumbnail || '',
          tracks: tracks.slice(0, 15),
          albums: [], // Albums would require a dedicated YTMusic album endpoint
          description: 'Artist profile generated via YouTube Music catalog.',
        };
      }
    } catch (e) {
      console.error('Failed to generate YTMusic artist profile:', e);
    }

    return null;
  }

  async getTrackInfo(id: number | string) {
    return hifiAPI.getTrackInfo(id);
  }

  async getLyrics(title: string, artist: string, album?: string, duration?: number) {
    // Try primary sources first (lrclib → lyrics.ovh)
    const primary = await hifiAPI.getLyrics(title, artist, album, duration);

    // If we got synced lyrics from primary, use them
    if (primary && primary.synced) return primary;

    // Try Musixmatch for synced lyrics (better quality timestamps)
    try {
      const { musixmatchClient } = await import('./musixmatchClient');
      const mxmResult = await musixmatchClient.getLyrics(title, artist);
      if (mxmResult && mxmResult.synced) return mxmResult;
    } catch {
      // Musixmatch unavailable
    }

    // Return whatever primary had (even unsynced), or null
    return primary;
  }

  getCoverUrl(coverId: string | undefined, size: number = 640) {
    return hifiAPI.getCoverUrl(coverId, size);
  }

  getArtistPictureUrl(pictureId: string | undefined, size?: number) {
    return hifiAPI.getArtistPictureUrl(pictureId, size);
  }

  clearCache() {
    hifiAPI.clearCache();
    pipedClient.clearCache();
    jiosaavnClient.clearCache();
    ytmusicClient.clearCache();
  }
}

export const musicAPI = new MusicAPI();
