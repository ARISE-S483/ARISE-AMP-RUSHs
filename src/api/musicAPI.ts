// Unified Music API Orchestrator
// Routes all music functions through Monochrome's MusicAPI
// UI components remain unchanged — only this API layer is modified

import { hifiAPI } from './piped';
import { pipedClient } from './pipedClient';
import { jiosaavnClient } from './jiosaavnClient';
import { ytmusicClient } from './ytmusicClient';
import type { Track, Artist, Album, Playlist, SearchResults } from './types';
import {
  monoSearch,
  monoSearchTracks,
  monoSearchArtists,
  monoSearchAlbums,
  monoSearchPlaylists,
  monoGetTrack,
  monoGetAlbum,
  monoGetArtist,
  monoGetPlaylist,
  monoGetStreamUrl,
  monoGetTrackRecommendations,
  monoGetCoverUrl,
  monoGetArtistPictureUrl,
  monoGetArtistBiography,
} from './monochromeBridge';

// ========== Deduplication ==========

export function normalizeTitle(s?: string): string {
  if (!s) return '';
  return s.toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/(feat|ft)\.?.*$/i, '')
    .replace(/\b(lyrical|lyric|video|audio|official|music|ost|soundtrack|full)\b/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ========== Unified API ==========

class MusicAPI {

  // ===== Search =====
  async search(query: string, signal?: AbortSignal): Promise<SearchResults> {
    // ─── Direct YouTube URL Parsing ───
    const ytMatch = query.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch && ytMatch[1]) {
      const videoId = ytMatch[1];
      try {
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
      } catch { /* fall through to normal search */ }
    }

    try {
      const result = await monoSearch(query);
      return result;
    } catch (e) {
      console.warn('[musicAPI] Monochrome search failed, falling back:', e);
      // Fallback: try YTMusic search
      try {
        const tracks = await ytmusicClient.searchSongs(query);
        return { tracks, albums: [], artists: [], playlists: [] };
      } catch {
        return { tracks: [], albums: [], artists: [], playlists: [] };
      }
    }
  }

  async searchTracks(query: string, signal?: AbortSignal): Promise<Track[]> {
    try {
      return await monoSearchTracks(query);
    } catch {
      // Fallback
      const results = await this.search(query, signal);
      return results.tracks;
    }
  }

  async searchArtists(query: string, signal?: AbortSignal): Promise<Artist[]> {
    try {
      return await monoSearchArtists(query);
    } catch {
      return [];
    }
  }

  async searchAlbums(query: string, signal?: AbortSignal): Promise<Album[]> {
    try {
      return await monoSearchAlbums(query);
    } catch {
      return [];
    }
  }

  async searchPlaylists(query: string, signal?: AbortSignal): Promise<Playlist[]> {
    try {
      return await monoSearchPlaylists(query);
    } catch {
      return [];
    }
  }

  // ===== Suggestions =====
  async getSuggestions(query: string): Promise<string[]> {
    // Try YT Music suggestions (best music-specific results)
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

  // ===== Get Track =====
  async getTrack(id: string | number): Promise<Track> {
    return monoGetTrack(id);
  }

  // ===== Get Album =====
  async getAlbum(id: string | number): Promise<Album> {
    return monoGetAlbum(id);
  }

  // ===== Get Artist =====
  async getArtist(id: number | string): Promise<Artist | null> {
    try {
      const artist = await monoGetArtist(id);
      if (artist) return artist;
    } catch (e) {
      console.warn('[musicAPI] monoGetArtist failed:', e);
    }

    // Fallback: Synthetic YTMusic artist profile
    const query = String(id).replace(/^(ytm_|piped_|spotify_|jiosaavn_)/, '').replace(/-/g, ' ');
    try {
      const tracks = await ytmusicClient.searchSongs(query);
      if (tracks.length > 0) {
        const bestTrack = tracks.find((t: Track) => t.thumbnailLarge) || tracks[0];
        return {
          id: String(id),
          name: typeof id === 'string' && !id.includes('_') ? id : (bestTrack.artist?.name || query),
          thumbnail: bestTrack.thumbnail || bestTrack.thumbnailLarge || '',
          thumbnailLarge: bestTrack.thumbnailLarge || bestTrack.thumbnail || '',
          tracks: tracks.slice(0, 15),
          albums: [],
          description: 'Artist profile generated via YouTube Music catalog.',
        };
      }
    } catch (e) {
      console.error('Failed to generate YTMusic artist profile:', e);
    }

    return null;
  }

  // ===== Get Playlist =====
  async getPlaylist(id: string): Promise<Playlist> {
    try {
      return await monoGetPlaylist(id);
    } catch {
      const res = await hifiAPI.getPlaylist(id) as any;
      const pl = res?.playlist || res;
      if (pl?.tracks === undefined && res?.tracks) pl.tracks = res.tracks;
      return pl;
    }
  }

  // ===== Streaming =====
  // Routes through Monochrome's stream resolution, with fallbacks
  async getStreamUrl(track: Track, quality: string = 'HIGH'): Promise<string | null> {
    // If track has a pre-resolved stream URL, use it
    if (track.streamUrl) return track.streamUrl;

    // ─── PRIMARY: Monochrome stream resolution ───
    try {
      const url = await monoGetStreamUrl(track.id, quality);
      if (url) {
        console.info(`[musicAPI] Monochrome stream success for "${track.title}"`);
        return url;
      }
    } catch (e) {
      console.warn('[musicAPI] Monochrome stream failed:', e);
    }

    // ─── FALLBACK 1: JioSaavn bridge ───
    const bridgeQuery = `${track.title} ${track.artist?.name || ''}`;
    try {
      const jioResults = await Promise.race([
        jiosaavnClient.searchTracks(bridgeQuery),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
      ]) as Track[];

      const trackTitleNorm = normalizeTitle(track.title);
      const match = jioResults.find(t => {
        const t1 = normalizeTitle(t.title);
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
    } catch { /* continue */ }

    // ─── FALLBACK 2: Piped (YouTube proxy) ───
    if (track.videoId) {
      try {
        const pipedUrl = await pipedClient.getStreamUrl(track.videoId);
        if (pipedUrl) {
          console.info(`[musicAPI] Piped stream success for "${track.title}"`);
          return `/api/ytmusic/proxy?url=${encodeURIComponent(pipedUrl)}`;
        }
      } catch { /* continue */ }
    }

    console.warn(`[musicAPI] All stream sources exhausted for "${track.title}"`);
    return null;
  }

  // ===== Recommendations =====
  async getTrackRecommendations(track: Track): Promise<Track[]> {
    try {
      const recs = await monoGetTrackRecommendations(track.id);
      if (recs.length > 0) return recs;
    } catch { /* fallback */ }

    // Fallback: YT Music Up Next
    try {
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
    } catch { /* continue */ }

    return [];
  }

  // ===== Home Recommendations =====
  async getHomeRecommendations(recentTracks: Track[]): Promise<{
    songs: Track[];
    albums: Album[];
    artists: Artist[];
  }> {
    const [pipedTrending, tidalRecs] = await Promise.allSettled([
      pipedClient.getTrending(),
      hifiAPI.getHomeRecommendations(recentTracks),
    ]);

    const trending = pipedTrending.status === 'fulfilled' ? pipedTrending.value : [];
    const tidalData = tidalRecs.status === 'fulfilled' ? tidalRecs.value : { songs: [], albums: [], artists: [] };

    return {
      songs: [...trending, ...tidalData.songs].slice(0, 25),
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
          const sortedThumbs = [...thumbArr].sort((a, b) => (b.width || 0) - (a.width || 0));
          thumbnail = sortedThumbs[sortedThumbs.length - 1]?.url || '';
          thumbnailLarge = sortedThumbs[0]?.url || thumbnail;
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
          const pipedRelated = await pipedClient.getRelatedTracks(seed.videoId!);
          allRecs.push(...pipedRelated);
        }
      } catch { /* continue */ }
    }

    // 2. Monochrome recommendations
    for (const seed of seedTracks.slice(0, 3)) {
      try {
        const recs = await monoGetTrackRecommendations(seed.id);
        allRecs.push(...recs);
      } catch { /* continue */ }
    }

    const knownIds = options.knownTrackIds;
    const filtered = knownIds
      ? allRecs.filter(t => !knownIds.has(String(t.id)))
      : allRecs;

    return filtered.sort(() => Math.random() - 0.5).slice(0, limit);
  }

  // ===== Track Info =====
  async getTrackInfo(id: number | string) {
    return hifiAPI.getTrackInfo(id);
  }

  // ===== Lyrics =====
  async getLyrics(title: string, artist: string, album?: string, duration?: number) {
    // Try primary sources first (lrclib → lyrics.ovh)
    const primary = await hifiAPI.getLyrics(title, artist, album, duration);

    // If we got synced lyrics from primary, use them
    if (primary && primary.synced) return primary;

    // Try Musixmatch for synced lyrics
    try {
      const { musixmatchClient } = await import('./musixmatchClient');
      const mxmResult = await musixmatchClient.getLyrics(title, artist);
      if (mxmResult && mxmResult.synced) return mxmResult;
    } catch { /* Musixmatch unavailable */ }

    return primary;
  }

  // ===== Cover Art =====
  getCoverUrl(coverId: string | undefined, size: number = 640) {
    // Try monochrome first
    const monoUrl = monoGetCoverUrl(coverId, String(size));
    if (monoUrl) return monoUrl;
    return hifiAPI.getCoverUrl(coverId, size);
  }

  getArtistPictureUrl(pictureId: string | undefined, size?: number) {
    const monoUrl = monoGetArtistPictureUrl(pictureId, String(size || 320));
    if (monoUrl) return monoUrl;
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
