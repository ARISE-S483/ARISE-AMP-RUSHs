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
    try {
      const result = await monoSearch(query);
      return result;
    } catch (e) {
      console.error('[musicAPI] Monochrome search failed:', e);
      return { tracks: [], albums: [], artists: [], playlists: [], videos: [] };
    }
  }

  async searchTracks(query: string, signal?: AbortSignal): Promise<Track[]> {
    try {
      return await monoSearchTracks(query);
    } catch {
      return [];
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
    // Monochrome does not natively expose a getSuggestions method.
    return [];
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
    return null;
  }

  // ===== Get Playlist =====
  async getPlaylist(id: string): Promise<Playlist | null> {
    try {
      return await monoGetPlaylist(id);
    } catch {
      return null;
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
  async getUpNexts(track: Track): Promise<Track[]> {
    try {
      if (track.id) {
        return await monoGetTrackRecommendations(track.id);
      }
    } catch { /* continue */ }
    return [];
  }

  // ===== Home Recommendations =====
  // ===== Home Recommendations =====
  async getHomeRecommendations(recentTracks: Track[]): Promise<{
    songs: Track[];
    albums: Album[];
    artists: Artist[];
  }> {
    // Monochrome doesn't have a direct home recommendations method.
    // Return empty placeholders.
    return {
      songs: [],
      albums: [],
      artists: [],
    };
  }

  // ===== Trending =====
  // ===== Trending =====
  async getTrending(region: string = 'IN'): Promise<Track[]> {
    // Return empty for Trending as Monochrome doesn't have a direct trending endpoint.
    return [];
  }

  // ===== Playlist-based recommendations =====
  async getRecommendedTracksForPlaylist(
    seedTracks: Track[],
    limit: number = 20,
    options: { knownTrackIds?: Set<string | number> } = {}
  ): Promise<Track[]> {
    const allRecs: Track[] = [];

    // Monochrome recommendations
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
    return monoGetTrack(id);
  }

  // ===== Lyrics =====
  // ===== Lyrics =====
  async getLyrics(title: string, artist: string, album?: string, duration?: number) {
    try {
      const { musixmatchClient } = await import('./musixmatchClient');
      const mxmResult = await musixmatchClient.getLyrics(title, artist);
      if (mxmResult && mxmResult.synced) return mxmResult;
    } catch { /* Musixmatch unavailable */ }
    return null;
  }

  // ===== Cover Art =====
  // ===== Cover Art =====
  getCoverUrl(coverId: string | undefined, size: number = 640) {
    return monoGetCoverUrl(coverId, String(size)) || '';
  }

  getArtistPictureUrl(pictureId: string | undefined, size?: number) {
    return monoGetArtistPictureUrl(pictureId, String(size || 320)) || '';
  }

  clearCache() {
    // No-op for now. Monochrome handles its own cache.
  }
}

export const musicAPI = new MusicAPI();
