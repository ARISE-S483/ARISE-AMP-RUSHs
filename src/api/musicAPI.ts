// Unified Music API Orchestrator — YouTube Music (InnerTube) only, limusic-style.
// All music functions route through the YTMusic client. UI remains unchanged.

import type { Track, Artist, Album, Playlist, SearchResults, Lyrics } from './types';
import { ytmusicClient } from './ytmusicClient';
import { invidiousClient } from './invidiousClient';
import { useSettingsStore } from '@/stores/settingsStore';

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
      return await ytmusicClient.search(query, signal);
    } catch (e) {
      console.error('[musicAPI] Search failed:', e);
      return { tracks: [], albums: [], artists: [], playlists: [], videos: [] };
    }
  }

  async searchTracks(query: string, signal?: AbortSignal): Promise<Track[]> {
    try {
      return await ytmusicClient.searchSongs(query, signal);
    } catch {
      return [];
    }
  }

  async searchArtists(query: string, signal?: AbortSignal): Promise<Artist[]> {
    try {
      return await ytmusicClient.searchArtists(query, signal);
    } catch {
      return [];
    }
  }

  async searchAlbums(query: string, signal?: AbortSignal): Promise<Album[]> {
    try {
      return await ytmusicClient.searchAlbums(query, signal);
    } catch {
      return [];
    }
  }

  async searchPlaylists(query: string, signal?: AbortSignal): Promise<Playlist[]> {
    try {
      return await ytmusicClient.searchPlaylists(query, signal);
    } catch {
      return [];
    }
  }

  // ===== Suggestions =====
  async getSuggestions(query: string): Promise<string[]> {
    return ytmusicClient.getSuggestions(query);
  }

  // ===== Get Track =====
  async getTrack(id: string | number): Promise<Track> {
    const t = await ytmusicClient.getTrack(id);
    return t || ({} as Track);
  }

  // ===== Get Album =====
  async getAlbum(id: string | number): Promise<Album | null> {
    return ytmusicClient.getAlbum(id);
  }

  // ===== Get Artist =====
  async getArtist(id: number | string): Promise<Artist | null> {
    return ytmusicClient.getArtist(id);
  }

  // ===== Get Playlist =====
  async getPlaylist(id: string): Promise<Playlist | null> {
    return ytmusicClient.getPlaylist(id);
  }

  // ===== Streaming =====
  async getStreamDetails(track: Track): Promise<{ url: string; mimeType: string; bitrate: number; loudnessDb: number } | null> {
    if (track.streamUrl) {
      return { url: track.streamUrl, mimeType: 'audio/webm', bitrate: 128000, loudnessDb: track.loudnessDb || 0 };
    }

    const { audioStreamSource, invidiousFallbackToNative } = useSettingsStore.getState();

    if (audioStreamSource === 'invidious') {
      try {
        const invDetails = await invidiousClient.getStreamDetails(track);
        if (invDetails && invDetails.url) {
          return invDetails;
        }
      } catch (err) {
        console.warn('[musicAPI] Invidious stream extraction failed:', err);
      }

      if (!invidiousFallbackToNative) {
        return null;
      }
      console.log('[musicAPI] Falling back to native stream extractor');
    }

    return ytmusicClient.getStreamDetails(track);
  }

  async getStreamUrl(track: Track, quality: string = 'HIGH'): Promise<string | null> {
    const details = await this.getStreamDetails(track);
    return details ? details.url : null;
  }

  // ===== Recommendations =====
  async getUpNexts(track: Track): Promise<Track[]> {
    return ytmusicClient.getUpNexts(track);
  }

  async getTrackRecommendations(track: Track): Promise<Track[]> {
    return ytmusicClient.getTrackRecommendations(track);
  }

  // ===== Home Recommendations =====
  async getHomeRecommendations(_recentTracks: Track[]): Promise<{
    songs: Track[];
    albums: Album[];
    artists: Artist[];
  }> {
    return ytmusicClient.getHomeRecommendations();
  }

  // ===== Trending =====
  async getTrending(region: string = 'IN'): Promise<Track[]> {
    return ytmusicClient.getTrending(region);
  }

  // ===== Playlist-based recommendations =====
  async getRecommendedTracksForPlaylist(
    seedTracks: Track[],
    limit: number = 20,
    options: { knownTrackIds?: Set<string | number> } = {}
  ): Promise<Track[]> {
    return ytmusicClient.getRecommendedTracksForPlaylist(seedTracks, limit, options);
  }

  // ===== Track Info =====
  async getTrackInfo(id: number | string): Promise<Track> {
    return this.getTrack(id);
  }

  // ===== Lyrics (Limusic Synced + YouTube Music) =====
  async getLyrics(title: string, artist: string, album?: string, duration?: number, videoId?: string): Promise<Lyrics | null> {
    try {
      let resolvedVideoId = videoId;
      if (!resolvedVideoId) {
        const query = artist ? `${artist} ${title}` : title;
        const results = await ytmusicClient.searchSongs(query);
        resolvedVideoId = results[0]?.videoId;
      }
      return await ytmusicClient.getLyrics(title, artist, album, duration, resolvedVideoId);
    } catch {
      return null;
    }
  }

  // ===== YouTube Music Account & Library Write Actions =====
  async getAccountInfo() {
    return ytmusicClient.getAccountInfo();
  }

  async getLibrary() {
    return ytmusicClient.getLibrary();
  }

  async getLikedSongs(): Promise<Track[]> {
    return ytmusicClient.getLikedSongs();
  }

  async rateSong(videoId: string, rating: 'like' | 'dislike' | 'indifferent'): Promise<boolean> {
    return ytmusicClient.rateSong(videoId, rating);
  }

  async createPlaylist(title: string, description?: string) {
    return ytmusicClient.createPlaylist(title, description);
  }

  async deletePlaylist(playlistId: string) {
    return ytmusicClient.deletePlaylist(playlistId);
  }

  async addToPlaylist(playlistId: string, videoId: string) {
    return ytmusicClient.addToPlaylist(playlistId, videoId);
  }

  async removeFromPlaylist(playlistId: string, videoId: string) {
    return ytmusicClient.removeFromPlaylist(playlistId, videoId);
  }

  async subscribeArtist(channelId: string, action: 'subscribe' | 'unsubscribe' = 'subscribe') {
    return ytmusicClient.subscribeArtist(channelId, action);
  }

  // ===== Cover Art =====
  getCoverUrl(coverId: string | undefined, size: number = 640) {
    return ytmusicClient.getCoverUrl(coverId, size) || '';
  }

  getArtistPictureUrl(pictureId: string | undefined, size?: number) {
    return ytmusicClient.getArtistPictureUrl(pictureId, size || 320) || '';
  }

  clearCache() {
    ytmusicClient.clearCache();
  }
}

export const musicAPI = new MusicAPI();
