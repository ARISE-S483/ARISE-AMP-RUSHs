// Client-side wrapper for the ytmusic-api Vite server plugin
// Calls /api/ytmusic/* endpoints which are handled server-side

import { APICache } from './cache';
import type { Track, Artist, SearchResults } from './types';

class YTMusicClient {
  private cache: APICache;
  private baseUrl: string;

  constructor() {
    this.cache = new APICache({ maxSize: 200, ttl: 1000 * 60 * 10 });
    this.baseUrl = '/api/ytmusic';
    setInterval(() => this.cache.clearExpired(), 1000 * 60 * 5);
  }

  private async fetchAPI(path: string, signal?: AbortSignal): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      signal: signal || AbortSignal.timeout(12000),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error((err as { error: string }).error || `Status ${response.status}`);
    }
    return response.json();
  }

  // ========== Normalize YT Music data → Track ==========

  private ytmSongToTrack(item: Record<string, unknown>): Track {
    const artistObj = item.artist;
    const artistsArr = item.artists as { name: string; artistId?: string }[] | undefined;
    
    let artistName = 'Unknown Artist';
    let artistsList: { id: number; name: string }[] = [];

    const authorsArr = item.authors as { name: string; channel_id?: string }[] | undefined;

    if (artistsArr && artistsArr.length > 0) {
      artistName = artistsArr[0].name || 'Unknown Artist';
      artistsList = artistsArr.map(a => ({ id: 0, name: a.name || 'Unknown Artist' }));
    } else if (authorsArr && authorsArr.length > 0) {
      artistName = authorsArr[0].name || 'Unknown Artist';
      artistsList = authorsArr.map(a => ({ id: 0, name: a.name || 'Unknown Artist' }));
    } else if (artistObj && typeof artistObj === 'object' && (artistObj as any).name) {
      artistName = (artistObj as any).name;
      artistsList = [{ id: 0, name: (artistObj as any).name }];
    } else if (typeof item.artist === 'string') {
      artistName = item.artist;
      artistsList = [{ id: 0, name: item.artist }];
    } else if (typeof item.author === 'string') {
      artistName = item.author;
      artistsList = [{ id: 0, name: item.author }];
    } else if (item.author && typeof item.author === 'object') {
      artistName = (item.author as any).name || 'Unknown Artist';
      artistsList = [{ id: 0, name: artistName }];
    }

    let thumbArr: any[] = [];
    if (Array.isArray(item.thumbnails)) {
      thumbArr = item.thumbnails;
    } else if (item.thumbnail && Array.isArray((item.thumbnail as any).contents)) {
      thumbArr = (item.thumbnail as any).contents;
    } else if (Array.isArray(item.thumbnail)) {
      thumbArr = item.thumbnail;
    }

    let thumbnail = '';
    let thumbnailLarge = '';

    if (thumbArr && thumbArr.length > 0) {
      const sortedThumbs = [...thumbArr].sort((a, b) => (b.width || 0) - (a.width || 0));
      thumbnail = sortedThumbs[sortedThumbs.length - 1]?.url || ''; // smallest
      thumbnailLarge = sortedThumbs[0]?.url || thumbnail;           // largest
    } else if (typeof item.thumbnail === 'string') {
      thumbnail = item.thumbnail;
      thumbnailLarge = thumbnail;
    }


    const albumObj = item.album as any;
    const album = albumObj?.name ? albumObj : (albumObj?.title ? { name: albumObj.title } : undefined);
    const videoId = (item.videoId as string) || (item.id as string) || '';
    
    const rawDuration = item.duration as any;
    const durationMs = rawDuration?.seconds ? rawDuration.seconds * 1000 : (typeof rawDuration === 'number' ? rawDuration : 0);
    const durationSec = durationMs > 1000 ? Math.round(durationMs / 1000) : durationMs;

    // Use native YouTube image server as ultimate fallback
    if (!thumbnail && videoId) {
      thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
      thumbnailLarge = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
    }

    const rawTitle = item.name || item.title;
    const resolvedTitle = typeof rawTitle === 'string' ? rawTitle : (rawTitle as any)?.text || (rawTitle as any)?.toString?.() || 'Unknown Track';

    return {
      id: `ytm_${videoId}`,
      title: resolvedTitle,
      artist: { id: 0, name: artistName },
      artists: artistsList,
      album: album ? { id: 0, title: album.name } : undefined,
      duration: durationSec,
      thumbnail: thumbnail || '',
      thumbnailLarge: thumbnailLarge || thumbnail || '',
      source: 'piped' as const, // Use 'piped' source so streaming falls through to Piped client
      videoId,
      type: 'track' as const,
    };
  }

  // ========== API Methods ==========

  async searchSongs(query: string, signal?: AbortSignal): Promise<Track[]> {
    if (!query || !query.trim()) return [];
    
    const cacheKey = `ytm_search_songs_${query}`;
    const cached = await this.cache.get<Track[]>('ytm_search', cacheKey);
    if (cached) return cached;

    try {
      const data = await this.fetchAPI(
        `/search?q=${encodeURIComponent(query)}&type=songs`,
        signal
      );
      const items = Array.isArray(data) ? data : [];
      const tracks = items
        .slice(0, 20)
        .map((item: Record<string, unknown>) => this.ytmSongToTrack(item));

      await this.cache.set('ytm_search', cacheKey, tracks);
      return tracks;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw error;
      console.warn('[ytmusic-api] Search songs failed, falling back:', error);
      return [];
    }
  }

  async searchVideos(query: string, signal?: AbortSignal): Promise<Track[]> {
    if (!query || !query.trim()) return [];

    const cacheKey = `ytm_search_videos_${query}`;
    const cached = await this.cache.get<Track[]>('ytm_search', cacheKey);
    if (cached) return cached;

    try {
      const data = await this.fetchAPI(
        `/search?q=${encodeURIComponent(query)}&type=videos`,
        signal
      );
      const items = Array.isArray(data) ? data : [];
      const tracks = items
        .slice(0, 20)
        .map((item: Record<string, unknown>) => {
          const track = this.ytmSongToTrack(item);
          track.type = 'video';
          return track;
        });

      await this.cache.set('ytm_search', cacheKey, tracks);
      return tracks;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw error;
      console.warn('[ytmusic-api] Search videos failed, falling back:', error);
      return [];
    }
  }

  async getSuggestions(query: string): Promise<string[]> {
    if (!query || !query.trim()) return [];
    try {
      const data = await this.fetchAPI(
        `/suggestions?q=${encodeURIComponent(query)}`
      );
      if (Array.isArray(data)) return data.slice(0, 10);
      return [];
    } catch {
      return [];
    }
  }

  async searchArtists(query: string, signal?: AbortSignal): Promise<Artist[]> {
    if (!query || !query.trim()) return [];

    const cacheKey = `ytm_search_artist_${query}`;
    const cached = await this.cache.get<Artist[]>('ytm_search', cacheKey);
    if (cached) return cached;

    try {
      const data = await this.fetchAPI(
        `/search?q=${encodeURIComponent(query)}&type=artists`,
        signal
      );
      const items = Array.isArray(data) ? data : [];
      
      const artists: Artist[] = items
        .slice(0, 15)
        .map((item: Record<string, unknown>) => {
          const thumbnails = item.thumbnails as { url: string }[] | undefined;
          const thumbnail = thumbnails && thumbnails.length > 0 ? thumbnails[thumbnails.length - 1].url : '';
          
          return {
            id: `ytm_${item.artistId || Math.random().toString(36).substr(2, 9)}`,
            name: typeof (item.name || item.title) === 'string' ? (item.name || item.title) as string : ((item.name || item.title) as any)?.text || 'Unknown Artist',
            picture: thumbnail || '',
            pictureSmall: thumbnails && thumbnails.length > 0 ? thumbnails[0].url : '',
          };
        });

      await this.cache.set('ytm_search', cacheKey, artists);
      return artists;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw error;
      console.warn('[ytmusic-api] Artist search failed:', error);
      return [];
    }
  }

  async search(query: string, signal?: AbortSignal): Promise<SearchResults> {
    const tracks = await this.searchSongs(query, signal);
    const artists = await this.searchArtists(query, signal);
    return { tracks, artists, albums: [], playlists: [] };
  }

  clearCache() {
    this.cache.clear();
  }

  async getUpNexts(videoId: string): Promise<Track[]> {
    const cacheKey = `ytm_upnext_${videoId}`;
    const cached = await this.cache.get<Track[]>('ytm_upnext', cacheKey);
    if (cached) return cached;

    try {
      const data = await this.fetchAPI(`/upnext/${videoId}`);
      const items = Array.isArray(data) ? data : [];
      
      const tracks = items
        .filter((item: Record<string, unknown>) => item.type === 'SONG' || item.type === 'VIDEO' || item.type === 'PlaylistPanelVideo' || item.type === 'MusicResponsiveListItem')
        .map((item: Record<string, unknown>) => {
          // ytmusic-api getUpNexts returns runtime data differently than its types suggest!
          const rawTitle = item.title || item.name;
          const title = typeof rawTitle === 'string' ? rawTitle : (rawTitle as any)?.text || (rawTitle as any)?.toString?.() || 'Unknown Track';
          
          let artistName = 'Unknown Artist';
          let artistsList: { id: number; name: string }[] = [];
          
          const artistsData = item.artists || item.authors || item.artist || item.author;
          if (typeof artistsData === 'string') {
            artistName = artistsData;
            artistsList = [{ id: 0, name: artistName }];
          } else if (Array.isArray(artistsData) && artistsData.length > 0) {
            artistName = artistsData[0].name || 'Unknown Artist';
            artistsList = artistsData.map(a => ({ id: 0, name: a.name || 'Unknown Artist' }));
          } else if (artistsData && typeof artistsData === 'object' && 'name' in (artistsData as Record<string, any>)) {
            artistName = (artistsData as any).name || 'Unknown Artist';
            artistsList = [{ id: 0, name: artistName }];
          }

          let thumbnail = '';
          let thumbnailLarge = '';
          if (typeof item.thumbnail === 'string') {
            thumbnail = item.thumbnail;
            thumbnailLarge = thumbnail;
          } else if (Array.isArray(item.thumbnails) && item.thumbnails.length > 0) {
            thumbnail = item.thumbnails[0].url || '';
            thumbnailLarge = item.thumbnails[item.thumbnails.length - 1].url || thumbnail;
          } else if (item.thumbnail && Array.isArray((item.thumbnail as any).contents) && (item.thumbnail as any).contents.length > 0) {
            const contents = (item.thumbnail as any).contents;
            thumbnail = contents[0].url || '';
            thumbnailLarge = contents[contents.length - 1].url || thumbnail;
          }

          let durationSec = 0;
          if (typeof item.duration === 'string') {
            const parts = item.duration.split(':').map(Number);
            if (parts.length === 2) durationSec = parts[0] * 60 + parts[1];
            else if (parts.length === 3) durationSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
          } else if (typeof item.duration === 'number') {
            durationSec = item.duration > 1000 ? Math.round(item.duration / 1000) : item.duration;
          } else if (item.duration && typeof (item.duration as any).seconds === 'number') {
            durationSec = (item.duration as any).seconds;
          }

          const resolvedVideoId = (item.videoId as string) || (item.video_id as string) || (item.id as string) || '';

          return {
            id: `ytm_${resolvedVideoId}`,
            title,
            artist: { id: 0, name: artistName },
            artists: artistsList,
            duration: durationSec,
            thumbnail: thumbnail || '',
            thumbnailLarge: thumbnailLarge || thumbnail || '',
            source: 'piped' as const, 
            videoId: resolvedVideoId,
            type: 'track' as const,
          };
        });

      await this.cache.set('ytm_upnext', cacheKey, tracks);
      return tracks;
    } catch (error) {
      console.warn('[ytmusic-api] UpNext failed:', error);
      return [];
    }
  }

  // Fetch all videos in an official YouTube Music playlist and normalize to Track[]
  async getPlaylistVideos(playlistId: string): Promise<Track[]> {
    const cacheKey = `ytm_plvideos_${playlistId}`;
    const cached = await this.cache.get<Track[]>('ytm_playlist', cacheKey);
    if (cached) return cached;

    try {
      const data = await this.fetchAPI(`/playlist-videos/${playlistId}`);
      const items = Array.isArray(data) ? data : [];

      const tracks: Track[] = items
        .filter((item: Record<string, unknown>) => item.videoId)
        .map((item: Record<string, unknown>) => {
          const videoId = item.videoId as string;
          const rawTitle = item.name || item.title;
          const title = typeof rawTitle === 'string' ? rawTitle : (rawTitle as any)?.text || (rawTitle as any)?.toString?.() || 'Unknown Track';

          // Artists
          let artistName = 'Unknown Artist';
          let artistsList: { id: number; name: string }[] = [];
          const artistsData = item.artists || item.artist;
          if (Array.isArray(artistsData) && artistsData.length > 0) {
            artistName = (artistsData[0] as any).name || 'Unknown Artist';
            artistsList = (artistsData as any[]).map(a => ({ id: 0, name: a.name || 'Unknown Artist' }));
          } else if (artistsData && typeof artistsData === 'object' && 'name' in (artistsData as object)) {
            artistName = (artistsData as any).name || 'Unknown Artist';
            artistsList = [{ id: 0, name: artistName }];
          } else if (typeof artistsData === 'string') {
            artistName = artistsData;
            artistsList = [{ id: 0, name: artistsData }];
          }

          // Thumbnails
          const thumbnails = item.thumbnails as { url: string; width: number; height: number }[] | undefined;
          let thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
          let thumbnailLarge = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
          if (thumbnails && thumbnails.length > 0) {
            const sorted = [...thumbnails].sort((a, b) => (b.width || 0) - (a.width || 0));
            thumbnail = sorted[sorted.length - 1]?.url || thumbnail;
            thumbnailLarge = sorted[0]?.url || thumbnailLarge;
          }

          // Duration — getPlaylistVideos returns seconds as integer
          const rawDuration = item.duration;
          let durationSec = 0;
          if (typeof rawDuration === 'number') {
            durationSec = rawDuration > 1000 ? Math.round(rawDuration / 1000) : rawDuration;
          } else if (typeof rawDuration === 'string') {
            const parts = rawDuration.split(':').map(Number);
            if (parts.length === 2) durationSec = parts[0] * 60 + parts[1];
            else if (parts.length === 3) durationSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
          }

          return {
            id: `ytm_${videoId}`,
            title,
            artist: { id: 0, name: artistName },
            artists: artistsList,
            duration: durationSec,
            thumbnail,
            thumbnailLarge,
            source: 'piped' as const,
            videoId,
            type: 'track' as const,
          };
        });

      await this.cache.set('ytm_playlist', cacheKey, tracks);
      return tracks;
    } catch (error) {
      console.warn('[ytmusic-api] getPlaylistVideos failed:', error);
      return [];
    }
  }

  // Search for the best official playlist matching a query and return its tracks
  async getOfficialPlaylistTracks(query: string, limit = 30): Promise<Track[]> {
    const cacheKey = `ytm_official_pl_${query}`;
    const cached = await this.cache.get<Track[]>('ytm_playlist', cacheKey);
    if (cached) return cached;

    try {
      const playlists = await this.fetchAPI(`/search?q=${encodeURIComponent(query)}&type=playlists`) as Record<string, unknown>[];
      if (!Array.isArray(playlists) || playlists.length === 0) return [];

      // Pick the first result which is generally the most relevant official playlist
      const best = playlists[0];
      const playlistId = best.playlistId as string;
      if (!playlistId) return [];

      const tracks = await this.getPlaylistVideos(playlistId);
      const limited = tracks.slice(0, limit);
      await this.cache.set('ytm_playlist', cacheKey, limited);
      return limited;
    } catch (error) {
      console.warn('[ytmusic-api] getOfficialPlaylistTracks failed for:', query, error);
      return [];
    }
  }
}

export const ytmusicClient = new YTMusicClient();
