// Client-side wrapper for the YouTube Music (InnerTube) API — limusic-style.
// Talks to /api/ytmusic/* which are served by the Vite plugin / Vercel function
// using youtubei.js. This is the single music source for the app.

import { APICache } from './cache';
import type { Track, Artist, Album, Playlist, SearchResults, Lyrics } from './types';
import { fetchLrcLibLyrics } from '@/lib/lrclib';

// ========== Helpers ==========

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function textOf(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (typeof obj.text === 'string') return obj.text;
    if (typeof obj.toString === 'function') {
      const s = obj.toString();
      if (s && s !== '[object Object]') return s;
    }
  }
  return '';
}

function strOf(item: Record<string, unknown>, key: string): string {
  return textOf(item[key]);
}

function arrOf(item: Record<string, unknown>, key: string): unknown[] {
  const v = item[key];
  return Array.isArray(v) ? v : [];
}

function thumbList(source: unknown): { small: string; large: string } {
  let arr: { url?: string }[] = [];

  if (Array.isArray(source)) {
    arr = source as { url?: string }[];
  } else if (source && typeof source === 'object') {
    const obj = source as Record<string, unknown>;
    if (Array.isArray(obj.contents)) arr = obj.contents as { url?: string }[];
    else if (Array.isArray(obj.thumbnails)) arr = obj.thumbnails as { url?: string }[];
  } else if (typeof source === 'string') {
    return { small: source, large: source };
  }

  const urls = arr.map(t => t?.url || '').filter(Boolean);
  if (urls.length === 0) return { small: '', large: '' };
  return { small: urls[urls.length - 1], large: urls[0] };
}

function parseDuration(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number') {
    return value > 1000 ? Math.round(value / 1000) : value;
  }
  if (typeof value === 'string') {
    const parts = value.split(':').map(Number);
    if (parts.some(n => Number.isNaN(n))) return 0;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parts[0] || 0;
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (obj.seconds != null) return Number(obj.seconds);
  }
  return 0;
}

class YTMusicClient {
  private cache: APICache;
  private baseUrl: string;

  constructor() {
    this.cache = new APICache({ maxSize: 250, ttl: 1000 * 60 * 10 });
    this.baseUrl = '/api/ytmusic';
    setInterval(() => this.cache.clearExpired(), 1000 * 60 * 5);
  }

  private async fetchAPI(path: string, signal?: AbortSignal): Promise<unknown> {
    const headers: Record<string, string> = {};
    try {
      const cookie = localStorage.getItem('ytm_account_cookie');
      if (cookie) {
        headers['x-youtube-cookie'] = cookie;
      }
    } catch {
      // ignore
    }

    const isStream = path.startsWith('/stream');
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers,
      signal: signal || AbortSignal.timeout(isStream ? 45000 : 25000),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error((err as { error: string }).error || `Status ${response.status}`);
    }
    return response.json();
  }

  // ========== Normalizers ==========

  private songToTrack(item: Record<string, unknown>): Track {
    const videoId = String(item.videoId || item.video_id || item.id || '');
    const title = textOf(item.name ?? item.title ?? item.song);

    let artistName = 'Unknown Artist';
    let artistsList: { id: number; name: string }[] = [];

    const authorArr = arrOf(item, 'authors');
    const artistArr = arrOf(item, 'artists');
    const singleArtistArr = arrOf(item, 'artist');
    const authors = authorArr.length ? authorArr : artistArr.length ? artistArr : singleArtistArr;

    if (authors.length > 0) {
      artistName = textOf(asRecord(authors[0]).name ?? authors[0]) || 'Unknown Artist';
      artistsList = authors.map(a => ({
        id: 0,
        name: textOf(asRecord(a).name ?? a) || 'Unknown Artist',
      }));
    } else if (item.artist && typeof item.artist === 'object') {
      artistName = textOf(asRecord(item.artist).name ?? asRecord(item.artist).title) || 'Unknown Artist';
      artistsList = [{ id: 0, name: artistName }];
    } else if (typeof item.artist === 'string' || typeof item.author === 'string') {
      artistName = String(item.artist || item.author);
      artistsList = [{ id: 0, name: artistName }];
    }

    const { small, large } = thumbList(item.thumbnails ?? item.thumbnail);
    let thumbnail = small || (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '');
    let thumbnailLarge = large || thumbnail;
    if (!thumbnail && videoId) {
      thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
      thumbnailLarge = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
    }

    const albumObj = item.album;
    const albumTitle = textOf(
      typeof albumObj === 'string' ? albumObj :
      typeof albumObj === 'object' ? (asRecord(albumObj).name ?? asRecord(albumObj).title ?? asRecord(albumObj).text) : ''
    );

    return {
      id: `ytm_${videoId}`,
      title,
      artist: { id: 0, name: artistName },
      artists: artistsList,
      album: albumTitle ? { id: 0, title: albumTitle } : undefined,
      duration: parseDuration(item.duration),
      thumbnail,
      thumbnailLarge: thumbnailLarge || thumbnail,
      source: 'youtube',
      videoId,
      type: item.type === 'video' ? 'video' : 'track',
    };
  }

  private albumToAlbum(item: Record<string, unknown>): Album {
    const id = String(item.browseId || item.id || item.albumId || '');
    const title = textOf(item.name ?? item.title) || 'Unknown Album';
    const { small, large } = thumbList(item.thumbnails ?? item.thumbnail);

    let artistName = 'Unknown Artist';
    const artistArr = arrOf(item, 'artists');
    const artistData =
      (artistArr.length ? artistArr[0] : null) ||
      (item.artist && typeof item.artist === 'object' ? asRecord(item.artist) : null) ||
      item.artist ||
      item.author;

    if (artistData && typeof artistData === 'object') {
      artistName = textOf(asRecord(artistData).name ?? asRecord(artistData).title) || artistName;
    } else if (typeof artistData === 'string') {
      artistName = artistData;
    }

    return {
      id: `ytm_album_${id}`,
      title,
      artist: { id: 0, name: artistName },
      artists: [{ id: 0, name: artistName }],
      cover: large || small,
      thumbnail: small || '',
      thumbnailLarge: large || small || '',
      releaseDate: item.year ? String(item.year) : undefined,
      explicit: Boolean(item.explicit),
    };
  }

  private artistToArtist(item: Record<string, unknown>): Artist {
    const id = String(item.browseId || item.id || item.channelId || '');
    const name = textOf(item.name ?? item.title) || 'Unknown Artist';
    const { small, large } = thumbList(item.thumbnails ?? item.thumbnail);
    return {
      id: `ytm_artist_${id}`,
      name,
      picture: large || small || '',
      thumbnail: small || '',
      thumbnailLarge: large || small || '',
      subscriberCount: item.subscriberCount != null ? Number(item.subscriberCount) : undefined,
    };
  }

  private playlistToPlaylist(item: Record<string, unknown>): Playlist {
    const id = String(item.playlistId || item.id || '');
    const title = textOf(item.name ?? item.title) || 'Unknown Playlist';
    const { small, large } = thumbList(item.thumbnails ?? item.thumbnail);
    const author = textOf(asRecord(item.author).name ?? item.author ?? '');
    const count = item.trackCount != null ? Number(item.trackCount) : undefined;
    return {
      id: `ytm_pl_${id}`,
      title,
      thumbnail: large || small || '',
      image: small || '',
      trackCount: count,
      numberOfTracks: count,
      creator: author || undefined,
    };
  }

  // ========== Search ==========

  async searchSongs(query: string, signal?: AbortSignal): Promise<Track[]> {
    if (!query.trim()) return [];
    const cacheKey = `songs:${query}`;
    const cached = await this.cache.get<Track[]>('yts', cacheKey);
    if (cached) return cached;

    try {
      const data = await this.fetchAPI(`/search?q=${encodeURIComponent(query)}&type=songs`, signal);
      const check = Array.isArray(data) ? data : [];
      const tracks = check.slice(0, 25).map(i => this.songToTrack(asRecord(i)));
      await this.cache.set('yts', cacheKey, tracks);
      return tracks;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw error;
      console.warn('[ytmusic] searchSongs failed:', error);
      return [];
    }
  }

  async searchVideos(query: string, signal?: AbortSignal): Promise<Track[]> {
    if (!query.trim()) return [];
    const cacheKey = `videos:${query}`;
    const cached = await this.cache.get<Track[]>('yts', cacheKey);
    if (cached) return cached;

    try {
      const data = await this.fetchAPI(`/search?q=${encodeURIComponent(query)}&type=videos`, signal);
      const check = Array.isArray(data) ? data : [];
      const tracks = check.slice(0, 25).map(i => ({ ...this.songToTrack(asRecord(i)), type: 'video' }));
      await this.cache.set('yts', cacheKey, tracks);
      return tracks;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw error;
      console.warn('[ytmusic] searchVideos failed:', error);
      return [];
    }
  }

  async searchArtists(query: string, signal?: AbortSignal): Promise<Artist[]> {
    if (!query.trim()) return [];
    const cacheKey = `artists:${query}`;
    const cached = await this.cache.get<Artist[]>('yts', cacheKey);
    if (cached) return cached;

    try {
      const data = await this.fetchAPI(`/search?q=${encodeURIComponent(query)}&type=artists`, signal);
      const check = Array.isArray(data) ? data : [];
      const artists = check.slice(0, 15).map(i => this.artistToArtist(asRecord(i)));
      await this.cache.set('yts', cacheKey, artists);
      return artists;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw error;
      console.warn('[ytmusic] searchArtists failed:', error);
      return [];
    }
  }

  async searchAlbums(query: string, signal?: AbortSignal): Promise<Album[]> {
    if (!query.trim()) return [];
    const cacheKey = `albums:${query}`;
    const cached = await this.cache.get<Album[]>('yts', cacheKey);
    if (cached) return cached;

    try {
      const data = await this.fetchAPI(`/search?q=${encodeURIComponent(query)}&type=albums`, signal);
      const check = Array.isArray(data) ? data : [];
      const albums = check.slice(0, 15).map(i => this.albumToAlbum(asRecord(i)));
      await this.cache.set('yts', cacheKey, albums);
      return albums;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw error;
      console.warn('[ytmusic] searchAlbums failed:', error);
      return [];
    }
  }

  async searchPlaylists(query: string, signal?: AbortSignal): Promise<Playlist[]> {
    if (!query.trim()) return [];
    const cacheKey = `playlists:${query}`;
    const cached = await this.cache.get<Playlist[]>('yts', cacheKey);
    if (cached) return cached;

    try {
      const data = await this.fetchAPI(`/search?q=${encodeURIComponent(query)}&type=playlists`, signal);
      const check = Array.isArray(data) ? data : [];
      const playlists = check.slice(0, 15).map(i => this.playlistToPlaylist(asRecord(i)));
      await this.cache.set('yts', cacheKey, playlists);
      return playlists;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw error;
      console.warn('[ytmusic] searchPlaylists failed:', error);
      return [];
    }
  }

  async search(query: string, signal?: AbortSignal): Promise<SearchResults> {
    const [tracks, albums, artists, playlists] = await Promise.all([
      this.searchSongs(query, signal),
      this.searchAlbums(query, signal),
      this.searchArtists(query, signal),
      this.searchPlaylists(query, signal),
    ]);
    return { tracks, albums, artists, playlists };
  }

  async getSuggestions(query: string): Promise<string[]> {
    if (!query.trim()) return [];
    try {
      const data = await this.fetchAPI(`/suggestions?q=${encodeURIComponent(query)}`);
      if (Array.isArray(data)) return (data as string[]).slice(0, 10);
      return [];
    } catch {
      return [];
    }
  }

  // ========== Lookup ==========

  private videoIdOf(id: string | number): string {
    const s = String(id);
    if (s.startsWith('ytm_')) return s.slice(4);
    return s;
  }

  async getTrack(id: string | number): Promise<Track | null> {
    const videoId = this.videoIdOf(id);
    try {
      const data = await this.fetchAPI(`/song/${encodeURIComponent(videoId)}`) as Record<string, unknown>;
      if (!data || !data.videoDetails) return null;
      const vd = asRecord(data.videoDetails);
      const basic: Record<string, unknown> = {
        videoId: vd.videoId,
        name: vd.title,
        author: vd.author,
        thumbnails: asRecord(vd.thumbnail).thumbnails,
      };
      return this.songToTrack(basic);
    } catch (error) {
      console.warn('[ytmusic] getTrack failed:', error);
      return null;
    }
  }

  async getAlbum(id: string | number): Promise<Album | null> {
    const browseId = String(id);
    try {
      const data = await this.fetchAPI(`/album/${encodeURIComponent(browseId)}`) as Record<string, unknown>;
      const page = asRecord(data.page || data);
      if (Object.keys(page).length === 0) return null;

      const header = asRecord(page.header || page);
      const albumMeta = this.albumToAlbum({
        browseId,
        name: textOf(header.title ?? header.name ?? 'Unknown Album'),
        artists: header.artist,
        thumbnails: header.thumbnail,
        year: header.year,
      });

      const tracks: Track[] = [];
      const sections = Array.isArray(page.sections) ? page.sections : [];
      const contents: unknown[] = Array.isArray(page.contents) ? (page.contents as unknown[]) : [];
      for (const item of contents.length ? contents : (sections[0] ? arrOf(asRecord(sections[0]), 'contents') : [])) {
        const rec = asRecord(item);
        if (rec.type === 'MusicPlaylistShelf') {
          for (const t of arrOf(rec, 'contents')) tracks.push(this.songToTrack(asRecord(t)));
        } else if (rec.videoId) {
          tracks.push(this.songToTrack(rec));
        }
      }

      return { ...albumMeta, tracks };
    } catch (error) {
      console.warn('[ytmusic] getAlbum failed:', error);
      return null;
    }
  }

  async getArtist(id: string | number): Promise<Artist | null> {
    const browseId = String(id);
    try {
      const data = await this.fetchAPI(`/artist/${encodeURIComponent(browseId)}`) as Record<string, unknown>;
      const page = asRecord(data.page || data);
      if (Object.keys(page).length === 0) return null;

      const header = asRecord(page.header || page);
      const artist = this.artistToArtist({
        browseId,
        name: textOf(header.title ?? header.name ?? 'Unknown Artist'),
        thumbnails: header.thumbnail,
        subscriberCount: header.subscriberCount,
      });

      const tracks: Track[] = [];
      const albums: Album[] = [];

      for (const sectionRaw of Array.isArray(page.sections) ? page.sections : []) {
        const section = asRecord(sectionRaw);
        for (const itemRaw of arrOf(section, 'contents')) {
          const item = asRecord(itemRaw);
          if (item.videoId) {
            tracks.push(this.songToTrack(item));
          } else if (item.browseId) {
            albums.push(this.albumToAlbum(item));
          }
        }
      }

      return { ...artist, tracks: tracks.slice(0, 20), albums: albums.slice(0, 10) };
    } catch (error) {
      console.warn('[ytmusic] getArtist failed:', error);
      return null;
    }
  }

  async getPlaylist(id: string | number): Promise<Playlist | null> {
    const playlistId = String(id);
    try {
      const data = await this.fetchAPI(`/playlist/${encodeURIComponent(playlistId)}`) as Record<string, unknown>;
      if (!data) return null;

      const page = asRecord(data.page || data);
      const header = asRecord(page.header || page);
      const count = header.trackCount != null ? Number(header.trackCount) : header.numTracks != null ? Number(header.numTracks) : undefined;
      const playlist: Playlist = {
        id: `ytm_pl_${playlistId}`,
        title: textOf(header.title ?? header.name ?? 'Unknown Playlist'),
        thumbnail: thumbList(header.thumbnail).large || '',
        image: thumbList(header.thumbnail).small || '',
        creator: textOf(header.author ?? ''),
        trackCount: count,
        numberOfTracks: count,
      };

      const tracks: Track[] = [];
      const items = Array.isArray(data.items) ? (data.items as unknown[]) :
        (Array.isArray(page.contents) ? arrOf(asRecord((page.contents as unknown[])[0]), 'contents') : []);
      for (const itemRaw of items) {
        const item = asRecord(itemRaw);
        if (item.videoId) tracks.push(this.songToTrack(item));
      }

      return { ...playlist, tracks };
    } catch (error) {
      console.warn('[ytmusic] getPlaylist failed:', error);
      return null;
    }
  }

  // ========== Streaming ==========

  async getStreamDetails(track: Track): Promise<{ url: string; mimeType: string; bitrate: number; loudnessDb: number } | null> {
    if (track.streamUrl) {
      return { url: track.streamUrl, mimeType: 'audio/webm', bitrate: 128000, loudnessDb: track.loudnessDb || 0 };
    }
    const videoId = track.videoId || this.videoIdOf(track.id);
    if (!videoId) return null;

    try {
      const data = await this.fetchAPI(`/stream/${encodeURIComponent(videoId)}`) as {
        url?: string;
        mimeType?: string;
        bitrate?: number;
        loudnessDb?: number;
        error?: string;
      };
      if (data && data.url && (data.url.startsWith('http') || data.url.startsWith('/'))) {
        return {
          url: data.url,
          mimeType: data.mimeType || 'audio/webm',
          bitrate: data.bitrate || 128000,
          loudnessDb: data.loudnessDb || 0,
        };
      }
      return null;
    } catch (error) {
      console.warn('[ytmusic] getStreamDetails failed:', error);
      return null;
    }
  }

  async getStreamUrl(track: Track, _quality: string = 'HIGH'): Promise<string | null> {
    const details = await this.getStreamDetails(track);
    return details ? details.url : null;
  }

  // ========== Recommendations / Feed ==========

  async getUpNexts(track: Track): Promise<Track[]> {
    const videoId = track.videoId || this.videoIdOf(track.id);
    if (!videoId) return [];
    const cacheKey = `upnext:${videoId}`;
    const cached = await this.cache.get<Track[]>('ytup', cacheKey);
    if (cached) return cached;

    try {
      const data = await this.fetchAPI(`/upnext/${encodeURIComponent(videoId)}`);
      const check = Array.isArray(data) ? data : [];
      const tracks = check.filter(i => asRecord(i).videoId).map(i => this.songToTrack(asRecord(i)));
      await this.cache.set('ytup', cacheKey, tracks);
      return tracks;
    } catch (error) {
      console.warn('[ytmusic] getUpNexts failed:', error);
      return [];
    }
  }

  async getTrackRecommendations(track: Track): Promise<Track[]> {
    return this.getUpNexts(track);
  }

  async getHomeRecommendations(): Promise<{ songs: Track[]; albums: Album[]; artists: Artist[] }> {
    try {
      const data = await this.fetchAPI(`/home`) as Record<string, unknown>;
      const songs: Track[] = [];
      const albums: Album[] = [];
      const artists: Artist[] = [];

      const sections: unknown[] = Array.isArray(data.sections) ? (data.sections as unknown[]) : [];
      for (const sectionRaw of sections) {
        const section = asRecord(sectionRaw);
        for (const itemRaw of arrOf(section, 'contents')) {
          const item = asRecord(itemRaw);
          if (item.videoId) {
            songs.push(this.songToTrack(item));
          } else if (item.browseId) {
            const typeStr = String(item.type || '').toLowerCase();
            if (typeStr.includes('artist')) artists.push(this.artistToArtist(item));
            else albums.push(this.albumToAlbum(item));
          }
        }
      }

      return { songs: songs.slice(0, 25), albums: albums.slice(0, 12), artists: artists.slice(0, 12) };
    } catch (error) {
      console.warn('[ytmusic] getHomeRecommendations failed:', error);
      return { songs: [], albums: [], artists: [] };
    }
  }

  async getTrending(region: string = 'IN'): Promise<Track[]> {
    const cacheKey = `trending:${region}`;
    const cached = await this.cache.get<Track[]>('yttr', cacheKey);
    if (cached) return cached;

    try {
      const data = await this.fetchAPI(`/trending?region=${encodeURIComponent(region)}`);
      const check = Array.isArray(data) ? data : [];
      const tracks = check.filter(i => asRecord(i).videoId).map(i => this.songToTrack(asRecord(i)));
      await this.cache.set('yttr', cacheKey, tracks);
      return tracks;
    } catch (error) {
      console.warn('[ytmusic] getTrending failed:', error);
      return [];
    }
  }

  async getRecommendedTracksForPlaylist(
    seedTracks: Track[],
    limit: number = 20,
    _options: { knownTrackIds?: Set<string | number> } = {}
  ): Promise<Track[]> {
    const all: Track[] = [];
    const seen = new Set<string>();

    for (const seed of seedTracks.slice(0, 3)) {
      const recs = await this.getUpNexts(seed);
      for (const r of recs) {
        if (seen.has(String(r.id))) continue;
        seen.add(String(r.id));
        all.push(r);
      }
    }

    return all.slice(0, limit);
  }

  // ========== Lyrics (Limusic: LRCLIB synced + YouTube Music) ==========

  async getLyrics(title: string, artist: string, album?: string, duration?: number, videoId?: string): Promise<Lyrics | null> {
    // 1. Try LRCLIB for line-by-line synced lyrics (as in limusic)
    try {
      const lrclib = await fetchLrcLibLyrics(title, artist, album, duration);
      if (lrclib && lrclib.lines.length > 0) {
        return { lines: lrclib.lines, source: 'LRCLIB (Synced)', synced: lrclib.synced };
      }
    } catch (e) {
      console.warn('[ytmusic] LRCLIB lyrics lookup failed:', e);
    }

    // 2. Try YouTube Music lyrics endpoint
    if (videoId) {
      return this.getLyricsByVideoId(videoId);
    }

    return null;
  }

  async getLyricsByVideoId(videoId: string): Promise<Lyrics | null> {
    if (!videoId) return null;
    try {
      const data = await this.fetchAPI(`/lyrics/${encodeURIComponent(videoId)}`) as { lyrics?: string };
      const raw = data?.lyrics || '';
      if (!raw) return null;

      const lines: { time: number; text: string }[] = raw
        .split(/\n+/)
        .filter(Boolean)
        .map(line => line.replace(/^\d+:\d+\s*/, '').trim())
        .filter(Boolean)
        .map(text => ({ time: 0, text }));

      return { lines, source: 'YouTube Music', synced: false };
    } catch (error) {
      console.warn('[ytmusic] getLyricsByVideoId failed:', error);
      return null;
    }
  }

  // ========== YouTube Music Account & Library Write Actions ==========

  async getAccountInfo(): Promise<any> {
    return this.fetchAPI('/account');
  }

  async getLibrary(): Promise<any> {
    return this.fetchAPI('/library');
  }

  async getLikedSongs(): Promise<Track[]> {
    try {
      const data = await this.fetchAPI('/liked-songs') as any[];
      if (!Array.isArray(data)) return [];
      return data.filter(i => i && (i.videoId || i.id)).map(i => this.songToTrack(asRecord(i)));
    } catch (e) {
      console.warn('[ytmusic] getLikedSongs failed:', e);
      return [];
    }
  }

  async rateSong(videoId: string, rating: 'like' | 'dislike' | 'indifferent'): Promise<boolean> {
    try {
      await this.fetchAPI(`/rate?videoId=${encodeURIComponent(videoId)}&rating=${encodeURIComponent(rating)}`);
      return true;
    } catch (e) {
      console.warn('[ytmusic] rateSong failed:', e);
      return false;
    }
  }

  async createPlaylist(title: string, description?: string): Promise<any> {
    return this.fetchAPI(`/playlist-create?title=${encodeURIComponent(title)}&description=${encodeURIComponent(description || '')}`);
  }

  async deletePlaylist(playlistId: string): Promise<boolean> {
    try {
      await this.fetchAPI(`/playlist-delete?playlistId=${encodeURIComponent(playlistId)}`);
      return true;
    } catch {
      return false;
    }
  }

  async addToPlaylist(playlistId: string, videoId: string): Promise<boolean> {
    try {
      await this.fetchAPI(`/playlist-edit?playlistId=${encodeURIComponent(playlistId)}&videoId=${encodeURIComponent(videoId)}&action=add`);
      return true;
    } catch {
      return false;
    }
  }

  async removeFromPlaylist(playlistId: string, videoId: string): Promise<boolean> {
    try {
      await this.fetchAPI(`/playlist-edit?playlistId=${encodeURIComponent(playlistId)}&videoId=${encodeURIComponent(videoId)}&action=remove`);
      return true;
    } catch {
      return false;
    }
  }

  async subscribeArtist(channelId: string, action: 'subscribe' | 'unsubscribe' = 'subscribe'): Promise<boolean> {
    try {
      await this.fetchAPI(`/subscribe?channelId=${encodeURIComponent(channelId)}&action=${encodeURIComponent(action)}`);
      return true;
    } catch {
      return false;
    }
  }

  // ========== Cover art ==========

  getCoverUrl(coverId: string | undefined, size: number = 640): string {
    if (!coverId) return '';
    if (coverId.startsWith('http')) return coverId;
    return `https://i.ytimg.com/vi/${encodeURIComponent(coverId)}/hqdefault.jpg`;
  }

  getArtistPictureUrl(pictureId: string | undefined, size: number = 320): string {
    if (!pictureId) return '';
    if (pictureId.startsWith('http')) return pictureId;
    return `https://i.ytimg.com/vi/${encodeURIComponent(pictureId)}/hqdefault.jpg`;
  }

  // ========== Playlist tracks (for imports) ==========

  async getPlaylistVideos(playlistId: string): Promise<Track[]> {
    const pl = await this.getPlaylist(playlistId);
    return pl?.tracks || [];
  }

  async getOfficialPlaylistTracks(query: string, limit = 30): Promise<Track[]> {
    const playlists = await this.searchPlaylists(query);
    if (playlists.length === 0) return [];
    const best = playlists[0];
    const playlistId = String(best.id).replace('ytm_pl_', '');
    return (await this.getPlaylist(playlistId))?.tracks.slice(0, limit) || [];
  }

  clearCache() {
    this.cache.clear();
  }
}

export const ytmusicClient = new YTMusicClient();
