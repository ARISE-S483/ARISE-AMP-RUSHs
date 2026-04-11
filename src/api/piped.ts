// Hi-Fi API client - uses Monochrome's TIDAL proxy instances
// TIDAL-only — no YouTube/Piped/Invidious dependencies

import { APICache } from './cache';
import type { Track, Album, Artist, Playlist, SearchResults, APIInstance } from './types';

const UPTIME_URLS = [
  'https://tidal-uptime.jiffy-puffs-1j.workers.dev/',
  'https://tidal-uptime.props-76styles.workers.dev/',
];

const FALLBACK_INSTANCES: { api: APIInstance[]; streaming: APIInstance[] } = {
  api: [
    { url: 'https://eu-central.monochrome.tf', version: '2.4' },
    { url: 'https://us-west.monochrome.tf', version: '2.4' },
    { url: 'https://arran.monochrome.tf', version: '2.4' },
    { url: 'https://triton.squid.wtf', version: '2.4' },
    { url: 'https://api.monochrome.tf', version: '2.3' },
    { url: 'https://monochrome-api.samidy.com', version: '2.3' },
    { url: 'https://maus.qqdl.site', version: '2.2' },
    { url: 'https://vogel.qqdl.site', version: '2.2' },
    { url: 'https://katze.qqdl.site', version: '2.2' },
    { url: 'https://hund.qqdl.site', version: '2.2' },
    { url: 'https://wolf.qqdl.site', version: '2.2' },
    { url: 'https://tidal.kinoplus.online', version: '2.2' },
    { url: 'https://hifi.geeked.wtf', version: '2.4' },
    { url: 'https://lossless.wtf', version: '2.4' },
  ],
  streaming: [
    { url: 'https://arran.monochrome.tf', version: '2.4' },
    { url: 'https://triton.squid.wtf', version: '2.4' },
    { url: 'https://maus.qqdl.site', version: '2.2' },
    { url: 'https://vogel.qqdl.site', version: '2.2' },
    { url: 'https://katze.qqdl.site', version: '2.2' },
    { url: 'https://hund.qqdl.site', version: '2.2' },
    { url: 'https://wolf.qqdl.site', version: '2.2' },
    { url: 'https://hifi.geeked.wtf', version: '2.4' },
    { url: 'https://lossless.wtf', version: '2.4' },
  ],
};

const INSTANCE_CACHE_KEY = 'melodies-api-instances-v2';

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class HiFiAPI {
  private cache: APICache;
  private instances: { api: APIInstance[]; streaming: APIInstance[] } | null;
  private loadPromise: Promise<{ api: APIInstance[]; streaming: APIInstance[] }> | null;

  constructor() {
    this.cache = new APICache({ maxSize: 500, ttl: 1000 * 60 * 15 });
    this.instances = null;
    this.loadPromise = null;

    setInterval(() => this.cache.clearExpired(), 1000 * 60 * 5);
  }

  // Dynamic instance discovery from uptime APIs
  private async loadInstances(): Promise<{ api: APIInstance[]; streaming: APIInstance[] }> {
    if (this.instances) return this.instances;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      // Check localStorage cache first
      try {
        const cached = localStorage.getItem(INSTANCE_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.timestamp && Date.now() - parsed.timestamp < 15 * 60 * 1000) {
            this.instances = parsed.data;
            this.loadPromise = null;
            return this.instances!;
          }
        }
      } catch { /* ignore */ }

      // Fetch from uptime APIs
      const shuffledUrls = [...UPTIME_URLS].sort(() => Math.random() - 0.5);

      for (const url of shuffledUrls) {
        try {
          const response = await fetch(url);
          if (!response.ok) continue;
          const data = await response.json();

          if (data.api && Array.isArray(data.api)) {
            const grouped = {
              api: data.api as APIInstance[],
              streaming: (data.streaming || data.api) as APIInstance[],
            };

            this.instances = grouped;

            try {
              localStorage.setItem(INSTANCE_CACHE_KEY, JSON.stringify({
                timestamp: Date.now(),
                data: grouped,
              }));
            } catch { /* ignore */ }

            this.loadPromise = null;
            return grouped;
          }
        } catch (error) {
          console.warn(`Failed to fetch instances from ${url}:`, error);
        }
      }

      // Use fallback
      console.warn('Using fallback instances');
      this.instances = FALLBACK_INSTANCES;
      this.loadPromise = null;
      return FALLBACK_INSTANCES;
    })();

    return this.loadPromise;
  }

  private async getInstances(type: 'api' | 'streaming' = 'api'): Promise<APIInstance[]> {
    const all = await this.loadInstances();
    return all[type] || all.api || [];
  }

  private async fetchWithRetry(
    path: string,
    options: { signal?: AbortSignal; type?: 'api' | 'streaming' } = {}
  ): Promise<Response> {
    const type = options.type || 'api';
    const instances = await this.getInstances(type);

    if (instances.length === 0) {
      throw new Error(`No API instances available for type: ${type}`);
    }

    const maxAttempts = instances.length * 2;
    let lastError: Error | null = null;
    let idx = Math.floor(Math.random() * instances.length);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const instance = instances[idx % instances.length];
      const baseUrl = instance.url.endsWith('/')
        ? instance.url + path.substring(1)
        : instance.url + path;

      try {
        const response = await fetch(baseUrl, { signal: options.signal });

        if (response.status === 429) {
          idx++;
          await delay(500);
          continue;
        }

        if (response.ok) return response;

        if (response.status >= 500) {
          idx++;
          continue;
        }

        lastError = new Error(`Request failed: ${response.status}`);
        idx++;
      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') throw error;
        lastError = error instanceof Error ? error : new Error('Unknown error');
        idx++;
        await delay(200);
      }
    }

    throw lastError || new Error(`All instances failed for: ${path}`);
  }

  // ========== Cover art helpers ==========

  getCoverUrl(coverId: string | undefined, size: number = 640): string {
    if (!coverId) return '';
    if (coverId.startsWith('http') || coverId.startsWith('blob:')) {
      let url = coverId;
      if (url.includes('googleusercontent.com') && url.includes('=w')) {
        url = url.replace(/=w\d+-h\d+/, `=w${size}-h${size}`);
      } else if (url.includes('ytimg.com/vi/')) {
        url = url.replace('mqdefault.jpg', 'hqdefault.jpg')
          .replace('sddefault.jpg', 'hqdefault.jpg');
      }
      return url;
    }
    const formatted = String(coverId).replace(/-/g, '/');
    return `https://resources.tidal.com/images/${formatted}/${size}x${size}.jpg`;
  }

  getArtistPictureUrl(pictureId: string | undefined, size: number = 640): string {
    if (!pictureId) return '';
    if (pictureId.startsWith('http') || pictureId.startsWith('blob:')) {
      let url = pictureId;
      if (url.includes('googleusercontent.com') && url.includes('=w')) {
        url = url.replace(/=w\d+-h\d+/, `=w${size}-h${size}`);
      }
      return url;
    }
    const formatted = String(pictureId).replace(/-/g, '/');
    return `https://resources.tidal.com/images/${formatted}/${size}x${size}.jpg`;
  }

  // ========== Data normalization ==========

  private prepareTrack(raw: Record<string, unknown>): Track {
    const item = (raw as Record<string, unknown>).item
      ? (raw as Record<string, unknown>).item as Record<string, unknown>
      : raw;

    const rawArtist = item.artist as Record<string, unknown> | undefined;
    const rawArtists = item.artists as Record<string, unknown>[] | undefined;
    const album = item.album as { id: number; title: string; cover?: string; releaseDate?: string } | undefined;

    const toSafeArtist = (a: Record<string, unknown> | undefined): { id: number; name: string; picture?: string } => {
      if (!a || typeof a !== 'object') return { id: 0, name: 'Unknown' };
      return {
        id: Number(a.id) || 0,
        name: typeof a.name === 'string' ? a.name : String(a.name || 'Unknown'),
        picture: typeof a.picture === 'string' ? a.picture : undefined,
      };
    };

    const artist = rawArtist ? toSafeArtist(rawArtist) : undefined;
    const artists = rawArtists?.map(toSafeArtist);
    const effectiveArtist = artist || (artists && artists[0]) || { id: 0, name: 'Unknown' };
    const coverUrl = album?.cover ? this.getCoverUrl(album.cover, 320) : '';

    return {
      id: (item.id as number) || 0,
      title: (item.title as string) || 'Unknown',
      artist: effectiveArtist,
      artists: artists || (artist ? [artist] : []),
      album: album ? {
        ...album,
        cover: album.cover,
      } : undefined,
      duration: (item.duration as number) || 0,
      audioQuality: (item.audioQuality as string) || undefined,
      trackNumber: (item.trackNumber as number) || undefined,
      popularity: (item.popularity as number) || 0,
      type: (item.type as string) || 'track',
      explicit: (item.explicit as boolean) || false,
      streamStartDate: (item.streamStartDate as string) || undefined,
      thumbnail: coverUrl,
      thumbnailLarge: album?.cover ? this.getCoverUrl(album.cover, 640) : coverUrl,
      source: 'tidal',
    };
  }

  private prepareAlbum(raw: Record<string, unknown>): Album {
    const rawArtist = raw.artist as Record<string, unknown> | undefined;
    const rawArtists = raw.artists as Record<string, unknown>[] | undefined;
    const toSafeArtist = (a: Record<string, unknown> | undefined): { id: number; name: string } => {
      if (!a || typeof a !== 'object') return { id: 0, name: 'Unknown' };
      return { id: Number(a.id) || 0, name: typeof a.name === 'string' ? a.name : String(a.name || 'Unknown') };
    };
    const effectiveArtist = rawArtist ? toSafeArtist(rawArtist) : (rawArtists?.[0] ? toSafeArtist(rawArtists[0]) : { id: 0, name: 'Unknown' });
    const cover = raw.cover as string | undefined;

    return {
      id: (raw.id as number) || 0,
      title: (raw.title as string) || 'Unknown',
      artist: effectiveArtist,
      artists: rawArtists?.map(toSafeArtist),
      cover: cover,
      releaseDate: (raw.releaseDate as string) || undefined,
      numberOfTracks: (raw.numberOfTracks as number) || 0,
      duration: (raw.duration as number) || 0,
      type: (raw.type as string) || 'ALBUM',
      explicit: (raw.explicit as boolean) || false,
      thumbnail: cover ? this.getCoverUrl(cover, 320) : '',
      thumbnailLarge: cover ? this.getCoverUrl(cover, 640) : '',
    };
  }

  private prepareArtist(raw: Record<string, unknown>): Artist {
    const picture = raw.picture as string | undefined;

    return {
      id: (raw.id as number) || 0,
      name: typeof raw.name === 'string' ? raw.name : String(raw.name || 'Unknown'),
      picture: picture,
      thumbnail: picture ? this.getArtistPictureUrl(picture, 320) : '',
      thumbnailLarge: picture ? this.getArtistPictureUrl(picture, 750) : '',
    };
  }

  private preparePlaylist(raw: Record<string, unknown>): Playlist {
    const image = (raw.image as string) || (raw.squareImage as string) || '';
    const creator = raw.creator as { name?: string } | undefined;

    return {
      id: (raw.uuid as string) || (raw.id as string) || '',
      title: (raw.title as string) || 'Unknown Playlist',
      thumbnail: image ? this.getCoverUrl(image, 320) : '',
      trackCount: (raw.numberOfTracks as number) || 0,
      numberOfTracks: (raw.numberOfTracks as number) || 0,
      description: (raw.description as string) || '',
      creator: typeof raw.creator === 'string' ? raw.creator : (creator && typeof creator === 'object' && creator.name ? String(creator.name) : ''),
    };
  }

  // Helper to find search section in nested response
  private findSearchSection(source: unknown, key: string, visited: Set<unknown>): Record<string, unknown> | undefined {
    if (!source || typeof source !== 'object') return undefined;

    if (Array.isArray(source)) {
      for (const e of source) {
        const f = this.findSearchSection(e, key, visited);
        if (f) return f;
      }
      return undefined;
    }

    if (visited.has(source)) return undefined;
    visited.add(source);

    const obj = source as Record<string, unknown>;
    if ('items' in obj && Array.isArray(obj.items)) return obj;

    if (key in obj) {
      const f = this.findSearchSection(obj[key], key, visited);
      if (f) return f;
    }

    for (const v of Object.values(obj)) {
      const f = this.findSearchSection(v, key, visited);
      if (f) return f;
    }

    return undefined;
  }

  private normalizeSearchResponse(data: unknown, key: string): { items: Record<string, unknown>[] } {
    // If the data object directly contains data.items (which is true for /search/?s= format)
    if (data && typeof data === 'object' && 'data' in data) {
      const dataObj = (data as any).data;
      if (dataObj && Array.isArray(dataObj.items)) {
        return { items: dataObj.items };
      }
    }

    // Fallback traversing for nested categories just in case
    const section = this.findSearchSection(data, key, new Set());
    return {
      items: (section?.items as Record<string, unknown>[]) || [],
    };
  }

  // ========== API Methods ==========

  async searchTracks(query: string, signal?: AbortSignal): Promise<Track[]> {
    const cached = await this.cache.get<Track[]>('search_tracks', query);
    if (cached) return cached;

    try {
      const response = await this.fetchWithRetry(`/search/?s=${encodeURIComponent(query)}`, { signal });
      const data = await response.json();
      const normalized = this.normalizeSearchResponse(data, 'tracks');
      const tracks = normalized.items.map(item => this.prepareTrack(item));
      await this.cache.set('search_tracks', query, tracks);
      return tracks;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw error;
      console.error('Track search failed:', error);
      return [];
    }
  }

  async searchArtists(query: string, signal?: AbortSignal): Promise<Artist[]> {
    const cached = await this.cache.get<Artist[]>('search_artists', query);
    if (cached) return cached;

    try {
      const response = await this.fetchWithRetry(`/search/?a=${encodeURIComponent(query)}`, { signal });
      const data = await response.json();
      const normalized = this.normalizeSearchResponse(data, 'artists');
      const artists = normalized.items.map(item => this.prepareArtist(item));
      await this.cache.set('search_artists', query, artists);
      return artists;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw error;
      console.error('Artist search failed:', error);
      return [];
    }
  }

  async searchAlbums(query: string, signal?: AbortSignal): Promise<Album[]> {
    const cached = await this.cache.get<Album[]>('search_albums', query);
    if (cached) return cached;

    try {
      const response = await this.fetchWithRetry(`/search/?al=${encodeURIComponent(query)}`, { signal });
      const data = await response.json();
      const normalized = this.normalizeSearchResponse(data, 'albums');
      const albums = normalized.items.map(item => this.prepareAlbum(item));
      await this.cache.set('search_albums', query, albums);
      return albums;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw error;
      console.error('Album search failed:', error);
      return [];
    }
  }

  async searchPlaylists(query: string, signal?: AbortSignal): Promise<Playlist[]> {
    const cached = await this.cache.get<Playlist[]>('search_playlists', query);
    if (cached) return cached;

    try {
      const response = await this.fetchWithRetry(`/search/?p=${encodeURIComponent(query)}`, { signal });
      const data = await response.json();
      const normalized = this.normalizeSearchResponse(data, 'playlists');
      const playlists = normalized.items.map(item => this.preparePlaylist(item));
      await this.cache.set('search_playlists', query, playlists);
      return playlists;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw error;
      console.error('Playlist search failed:', error);
      return [];
    }
  }

  async search(query: string, signal?: AbortSignal): Promise<SearchResults> {
    const cached = await this.cache.get<SearchResults>('search_all', query);
    if (cached) return cached;

    try {
      const [tracks, artists, albums, playlists] = await Promise.allSettled([
        this.searchTracks(query, signal),
        this.searchArtists(query, signal),
        this.searchAlbums(query, signal),
        this.searchPlaylists(query, signal),
      ]);

      const results: SearchResults = {
        tracks: tracks.status === 'fulfilled' ? tracks.value : [],
        artists: artists.status === 'fulfilled' ? artists.value : [],
        albums: albums.status === 'fulfilled' ? albums.value : [],
        playlists: playlists.status === 'fulfilled' ? playlists.value : [],
      };

      await this.cache.set('search_all', query, results);
      return results;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw error;
      console.error('Search failed:', error);
      return { tracks: [], artists: [], albums: [], playlists: [] };
    }
  }

  async getStreamUrl(id: number | string, quality: string = 'HIGH'): Promise<string | null> {
    const cacheKey = `stream_v3_${id}_${quality}`;
    const cached = await this.cache.get<string>('stream', cacheKey);
    if (cached) return cached;

    // TIDAL streaming only
    const tidalQuality =
      quality === 'LOW' ? 'LOW' :
        (quality === 'HIGH' || quality === 'AUTO' || quality === 'DEFAULT') ? 'LOSSLESS' :
          quality;
    try {
      const response = await this.fetchWithRetry(
        `/track/?id=${id}&quality=${tidalQuality}`,
        { type: 'streaming' }
      );
      const json = await response.json();
      const data = json.data || json;

      let streamUrl: string | null = null;

      const entries = Array.isArray(data) ? data : [data];
      for (const entry of entries) {
        if (entry && typeof entry === 'object') {
          if (entry.OriginalTrackUrl) {
            streamUrl = entry.OriginalTrackUrl;
            break;
          }
        }
      }

      if (!streamUrl) {
        for (const entry of entries) {
          if (entry && typeof entry === 'object' && entry.manifest) {
            streamUrl = this.extractStreamUrlFromManifest(entry.manifest);
            if (streamUrl) break;
          }
        }
      }

      if (streamUrl) {
        await this.cache.set('stream', cacheKey, streamUrl);
        return streamUrl;
      }

      return null;
    } catch (error) {
      console.error('Failed to get TIDAL stream URL:', error);
      return null;
    }
  }

  private extractStreamUrlFromManifest(manifest: unknown): string | null {
    if (!manifest) return null;

    try {
      let decoded: string;
      if (typeof manifest === 'string') {
        try {
          decoded = atob(manifest);
        } catch {
          decoded = manifest;
        }
      } else if (typeof manifest === 'object') {
        const m = manifest as Record<string, unknown>;
        if (m.urls && Array.isArray(m.urls)) return m.urls[0] as string;
        return null;
      } else {
        return null;
      }

      // Try JSON parse first
      try {
        const parsed = JSON.parse(decoded);
        if (parsed.urls && Array.isArray(parsed.urls)) return parsed.urls[0];
      } catch {
        // Check for DASH XML manifest — extract BaseURL
        if (decoded.includes('<MPD') || decoded.includes('<BaseURL>')) {
          const baseUrlMatch = decoded.match(/<BaseURL[^>]*>([^<]+)<\/BaseURL>/);
          if (baseUrlMatch) return baseUrlMatch[1];
        }
        // Try regex for URL
        const match = decoded.match(/https?:\/\/[\w\-.~:?#[@!$&'()*+,;=%/]+/);
        return match ? match[0] : null;
      }
    } catch {
      return null;
    }

    return null;
  }

  async getAlbum(id: number | string): Promise<{ album: Album; tracks: Track[] } | null> {
    const cached = await this.cache.get<{ album: Album; tracks: Track[] }>('album', String(id));
    if (cached) return cached;

    try {
      const response = await this.fetchWithRetry(`/album/?id=${id}`);
      const json = await response.json();
      const data = json.data || json;

      let albumRaw: Record<string, unknown> | null = null;
      let tracksSection: Record<string, unknown> | null = null;

      if (data && typeof data === 'object' && !Array.isArray(data)) {
        if ('numberOfTracks' in data || 'title' in data) {
          albumRaw = data;
        }
        if ('items' in data) {
          tracksSection = data;
        }
      }

      if (!albumRaw) return null;

      const album = this.prepareAlbum(albumRaw);
      const tracks = ((tracksSection?.items || []) as Record<string, unknown>[])
        .map(item => this.prepareTrack((item as Record<string, unknown>).item as Record<string, unknown> || item));

      const result = { album, tracks };
      await this.cache.set('album', String(id), result);
      return result;
    } catch (error) {
      console.error('Failed to get album:', error);
      return null;
    }
  }

  async getPlaylist(id: string): Promise<{ playlist: Playlist; tracks: Track[] } | null> {
    const cached = await this.cache.get<{ playlist: Playlist; tracks: Track[] }>('playlist', id);
    if (cached) return cached;

    try {
      const response = await this.fetchWithRetry(`/playlist/?id=${id}`);
      const json = await response.json();
      const data = json.data || json;

      let playlistRaw: Record<string, unknown> | null = null;
      let tracksSection: Record<string, unknown> | null = null;

      if (data.playlist) {
        playlistRaw = data.playlist;
      }
      if (data.items) {
        tracksSection = { items: data.items };
      }

      // Fallback
      if (!playlistRaw || !tracksSection) {
        const entries = Array.isArray(data) ? data : [data];
        for (const entry of entries) {
          if (!entry || typeof entry !== 'object') continue;
          if (!playlistRaw && ('uuid' in entry || 'numberOfTracks' in entry || ('title' in entry && 'id' in entry))) {
            playlistRaw = entry;
          }
          if (!tracksSection && 'items' in entry) {
            tracksSection = entry;
          }
        }
      }

      if (!playlistRaw) return null;

      const playlist = this.preparePlaylist(playlistRaw);
      const tracks = ((tracksSection?.items || []) as Record<string, unknown>[])
        .map(item => this.prepareTrack((item as Record<string, unknown>).item as Record<string, unknown> || item));

      const result = { playlist: { ...playlist, tracks }, tracks };
      await this.cache.set('playlist', id, result);
      return result;
    } catch (error) {
      console.error('Failed to get playlist:', error);
      return null;
    }
  }

  async getArtist(id: number | string): Promise<Artist | null> {
    const cached = await this.cache.get<Artist>('artist', String(id));
    if (cached) return cached;

    try {
      const [primaryResponse, contentResponse] = await Promise.all([
        this.fetchWithRetry(`/artist/?id=${id}`),
        this.fetchWithRetry(`/artist/?f=${id}&skip_tracks=true`),
      ]);

      const primaryJson = await primaryResponse.json();
      const primaryData = primaryJson.data || primaryJson;
      const rawArtist = primaryData.artist || (Array.isArray(primaryData) ? primaryData[0] : primaryData);

      if (!rawArtist) return null;

      const artist = this.prepareArtist(rawArtist);

      // Extract description/bio from various possible fields
      const bio = rawArtist.biography || rawArtist.bio || rawArtist.description ||
        primaryData.biography || primaryData.bio || primaryData.description || '';
      if (bio) artist.description = typeof bio === 'string' ? bio : (bio as Record<string, unknown>).text as string || '';

      // Extract subscriber/follower count
      const subCount = rawArtist.subscriberCount || rawArtist.popularity || rawArtist.followers ||
        primaryData.subscriberCount || primaryData.popularity || 0;
      if (subCount) artist.subscriberCount = Number(subCount);

      // Parse content response for albums, tracks, and related artists
      const contentJson = await contentResponse.json();
      const contentData = contentJson.data || contentJson;
      const entries = Array.isArray(contentData) ? contentData : [contentData];

      const albumMap = new Map<number, Album>();
      const trackMap = new Map<number, Track>();
      const relatedMap = new Map<number, Artist>();

      const isTrack = (v: Record<string, unknown>) => v?.id && v.duration;
      const isAlbum = (v: Record<string, unknown>) => v?.id && 'numberOfTracks' in v;

      const scan = (value: unknown, visited: Set<unknown>): void => {
        if (!value || typeof value !== 'object' || visited.has(value)) return;
        visited.add(value);

        if (Array.isArray(value)) {
          value.forEach(item => scan(item, visited));
          return;
        }

        const obj = value as Record<string, unknown>;
        const item = (obj.item || obj) as Record<string, unknown>;

        if (isAlbum(item)) albumMap.set(item.id as number, this.prepareAlbum(item));
        if (isTrack(item) && !isAlbum(item)) trackMap.set(item.id as number, this.prepareTrack(item));

        Object.values(obj).forEach(nested => scan(nested, visited));
      };

      const visited = new Set<unknown>();
      entries.forEach(entry => scan(entry, visited));
      scan(primaryData, visited);

      // Try to extract related artists from response first
      const relatedRaw = primaryData.relatedArtists || primaryData.similar || rawArtist.relatedArtists || rawArtist.similar;
      if (relatedRaw && Array.isArray(relatedRaw)) {
        for (const r of relatedRaw) {
          if (r && typeof r === 'object' && r.id) {
            relatedMap.set(r.id as number, this.prepareArtist(r as Record<string, unknown>));
          }
        }
      }

      // If no related artists found, try dedicated /artist/similar/ endpoint
      if (relatedMap.size === 0) {
        try {
          const similarResponse = await this.fetchWithRetry(`/artist/similar/?id=${id}`);
          const similarJson = await similarResponse.json();
          const similarData = similarJson.data || similarJson;
          const similarItems = (similarData.items || similarData || []);
          if (Array.isArray(similarItems)) {
            for (const r of similarItems) {
              if (r && typeof r === 'object' && r.id) {
                relatedMap.set(r.id as number, this.prepareArtist(r as Record<string, unknown>));
              }
            }
          }
        } catch {
          // endpoint may not exist on older instances
        }
      }

      const allAlbums = Array.from(albumMap.values())
        .sort((a, b) => new Date(b.releaseDate || '0').getTime() - new Date(a.releaseDate || '0').getTime());

      const eps = allAlbums.filter(a => a.type === 'EP' || a.type === 'SINGLE');
      const albums = allAlbums.filter(a => !eps.includes(a));

      const topTracks = Array.from(trackMap.values())
        .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
        .slice(0, 15);

      const result: Artist = {
        ...artist,
        albums,
        eps,
        tracks: topTracks,
        relatedArtists: Array.from(relatedMap.values()).slice(0, 12),
      };

      await this.cache.set('artist', String(id), result);
      return result;
    } catch (error) {
      console.error('Failed to get artist:', error);
      return null;
    }
  }

  async getTrackRecommendations(id: number | string): Promise<Track[]> {
    const cached = await this.cache.get<Track[]>('recommendations', String(id));
    if (cached) return cached;

    try {
      const response = await this.fetchWithRetry(`/recommendations/?id=${id}`);
      const json = await response.json();
      const data = json.data || json;
      const items = (data.items || []) as Record<string, unknown>[];
      const tracks = items.slice(0, 15).map(item => {
        const trackData = (item as Record<string, unknown>).track || item;
        return this.prepareTrack(trackData as Record<string, unknown>);
      }).filter(t => t.id && t.title !== 'Unknown');

      await this.cache.set('recommendations', String(id), tracks);
      return tracks;
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
      return [];
    }
  }

  // Monochrome-style playlist-based recommendations using artist top tracks
  async getRecommendedTracksForPlaylist(
    seedTracks: Track[],
    limit: number = 20,
    options: { knownTrackIds?: Set<string | number> } = {}
  ): Promise<Track[]> {
    const artistMap = new Map<number, { id: number; name: string }>();

    for (const track of seedTracks) {
      if (track.artist?.id) artistMap.set(track.artist.id, track.artist);
      if (track.artists) {
        for (const a of track.artists) {
          if (a.id) artistMap.set(a.id, a);
        }
      }
    }

    // If not enough artists, try search to find more metadata
    if (artistMap.size < 3) {
      for (const track of seedTracks.slice(0, 5)) {
        try {
          const query = `${track.title} ${track.artist?.name || ''}`.trim();
          const results = await this.searchTracks(query);
          if (results.length > 0) {
            const found = results[0];
            if (found.artist?.id) artistMap.set(found.artist.id, found.artist);
            if (found.artists) {
              for (const a of found.artists) {
                if (a.id) artistMap.set(a.id, a);
              }
            }
          }
        } catch { /* ignore */ }
      }
    }

    const artists = Array.from(artistMap.values());
    if (artists.length === 0) return [];

    const recommendedTracks: Track[] = [];
    const seenTrackIds = new Set(seedTracks.map(t => String(t.id)));

    const shuffledArtists = [...artists].sort(() => Math.random() - 0.5);
    const artistsToProcess = shuffledArtists.slice(0, Math.min(15, shuffledArtists.length));

    const results = await Promise.all(
      artistsToProcess.map(async (artist) => {
        try {
          const artistData = await this.getArtist(artist.id);
          if (artistData?.tracks && artistData.tracks.length > 0) {
            const available = artistData.tracks.filter(t => !seenTrackIds.has(String(t.id)));
            const newTracks = options.knownTrackIds
              ? available.filter(t => !options.knownTrackIds!.has(String(t.id)))
              : available;
            const known = options.knownTrackIds
              ? available.filter(t => options.knownTrackIds!.has(String(t.id)))
              : [];
            const combined = [
              ...[...newTracks].sort(() => Math.random() - 0.5),
              ...[...known].sort(() => Math.random() - 0.5),
            ];
            return combined.slice(0, 2);
          }
          return [];
        } catch { return []; }
      })
    );

    for (const tracks of results) {
      for (const t of tracks) {
        if (!seenTrackIds.has(String(t.id))) {
          seenTrackIds.add(String(t.id));
          recommendedTracks.push(t);
        }
      }
    }

    return recommendedTracks.sort(() => 0.5 - Math.random()).slice(0, limit);
  }

  async getTrackInfo(id: number | string): Promise<Track | null> {
    const cacheKey = `meta_${id}`;
    const cached = await this.cache.get<Track>('track_info', cacheKey);
    if (cached) return cached;

    try {
      const response = await this.fetchWithRetry(`/info/?id=${id}`);
      const json = await response.json();
      const data = json.data || json;
      const items = Array.isArray(data) ? data : [data];
      const found = items.find((i: Record<string, unknown>) =>
        i.id == id || ((i.item as Record<string, unknown>)?.id == id)
      );

      if (found) {
        const track = this.prepareTrack((found.item || found) as Record<string, unknown>);
        await this.cache.set('track_info', cacheKey, track);
        return track;
      }
      return null;
    } catch (error) {
      console.error('Failed to get track info:', error);
      return null;
    }
  }

  // ========== Search Suggestions (TIDAL-based) ==========

  async getSuggestions(query: string): Promise<string[]> {
    try {
      const tracks = await this.searchTracks(query);
      return tracks.slice(0, 8).map(t => `${t.artist.name} - ${t.title}`);
    } catch {
      return [];
    }
  }

  // ========== Home Recommendations (TIDAL-only) ==========

  async getHomeRecommendations(recentTracks: Track[]): Promise<{
    songs: Track[];
    albums: Album[];
    artists: Artist[];
  }> {
    const cacheKey = recentTracks.slice(0, 3).map(t => String(t.id)).join('_') || 'default';
    const cached = await this.cache.get<{ songs: Track[]; albums: Album[]; artists: Artist[] }>('home_recs', cacheKey);
    if (cached) return cached;

    const hasHistory = recentTracks.length > 0;
    const queries = hasHistory
      ? [...new Set(recentTracks.slice(0, 5).flatMap(t => [t.artist.name, t.album?.title].filter(Boolean)))]
        .slice(0, 3)
      : [
        'top songs 2025',
        'trending music 2025',
        'best new songs',
        'popular hits',
      ];

    try {
      const allResults = await Promise.allSettled(queries.map(q => this.search(q as string)));

      const songs: Track[] = [];
      const albumMap = new Map<string, Album>();
      const artistMap = new Map<string, Artist>();
      const seenTrackIds = new Set<string>();

      for (const result of allResults) {
        if (result.status !== 'fulfilled') continue;
        const r = result.value;

        for (const t of r.tracks) {
          const tid = String(t.id);
          if (!seenTrackIds.has(tid)) {
            seenTrackIds.add(tid);
            songs.push(t);
          }
        }
        for (const a of r.albums) {
          albumMap.set(String(a.id), a);
        }
        for (const ar of r.artists) {
          artistMap.set(String(ar.id), ar);
        }
      }

      // Also try TIDAL recommendations if we have recent tracks
      if (recentTracks.length > 0) {
        try {
          const recs = await this.getTrackRecommendations(recentTracks[0].id);
          for (const t of recs) {
            const tid = String(t.id);
            if (!seenTrackIds.has(tid)) {
              seenTrackIds.add(tid);
              songs.push(t);
            }
          }
        } catch { /* ignore */ }
      }

      const result = {
        songs: songs.slice(0, 20),
        albums: Array.from(albumMap.values()).slice(0, 12),
        artists: Array.from(artistMap.values()).slice(0, 12),
      };

      await this.cache.set('home_recs', cacheKey, result);
      return result;
    } catch (error) {
      console.error('Failed to get home recommendations:', error);
      return { songs: [], albums: [], artists: [] };
    }
  }

  async getLyrics(title: string, artist: string, album?: string, duration?: number): Promise<{ lines: { time: number; text: string }[]; synced: boolean; source: string } | null> {
    const cacheKey = `${title}:${artist}`;
    const cached = await this.cache.get<{ lines: { time: number; text: string }[]; synced: boolean; source: string }>('lyrics', cacheKey);
    if (cached) return cached;

    // Try lrclib /api/get first (direct match — more accurate)
    try {
      const params = new URLSearchParams({
        track_name: title,
        artist_name: artist,
      });
      if (album) params.set('album_name', album);
      if (duration) params.set('duration', String(Math.round(duration)));

      const directResponse = await fetch(`https://lrclib.net/api/get?${params}`);
      if (directResponse.ok) {
        const best = await directResponse.json();
        const result = this.parseLrcLibResult(best);
        if (result) {
          await this.cache.set('lyrics', cacheKey, result);
          return result;
        }
      }
    } catch {
      // fall through
    }

    // Fallback: lrclib /api/search
    try {
      const response = await fetch(
        `https://lrclib.net/api/search?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}`
      );

      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data) && data.length > 0) {
          const result = this.parseLrcLibResult(data[0]);
          if (result) {
            await this.cache.set('lyrics', cacheKey, result);
            return result;
          }
        }
      }
    } catch {
      console.warn('lrclib lyrics failed, trying fallback');
    }

    // Fallback: lyrics.ovh
    try {
      const response = await fetch(
        `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`
      );

      if (response.ok) {
        const data = await response.json();
        if (data?.lyrics) {
          const lines = data.lyrics
            .split('\n')
            .filter((line: string) => line.trim())
            .map((line: string, i: number) => ({ time: i * 3, text: line.trim() }));

          const result = { lines, synced: false, source: 'lyrics.ovh' };
          await this.cache.set('lyrics', cacheKey, result);
          return result;
        }
      }
    } catch {
      console.warn('lyrics.ovh fallback also failed');
    }

    return null;
  }

  private parseLrcLibResult(best: Record<string, unknown>): { lines: { time: number; text: string }[]; synced: boolean; source: string } | null {
    if (!best) return null;

    if (best.syncedLyrics && typeof best.syncedLyrics === 'string') {
      const lines = (best.syncedLyrics as string)
        .split('\n')
        .filter((line: string) => line.trim())
        .map((line: string) => {
          const match = line.match(/\[(\d+):(\d+\.\d+)\](.*)/);
          if (match) {
            const time = parseInt(match[1]) * 60 + parseFloat(match[2]);
            return { time, text: match[3].trim() };
          }
          return { time: 0, text: line.replace(/\[.*?\]/g, '').trim() };
        })
        .filter((l: { text: string }) => l.text);

      return { lines, synced: true, source: 'lrclib' };
    }

    if (best.plainLyrics && typeof best.plainLyrics === 'string') {
      const lines = (best.plainLyrics as string)
        .split('\n')
        .filter((line: string) => line.trim())
        .map((line: string, i: number) => ({ time: i * 3, text: line.trim() }));

      return { lines, synced: false, source: 'lrclib' };
    }

    return null;
  }

  clearCache() {
    this.cache.clear();
  }
}

export const hifiAPI = new HiFiAPI();
