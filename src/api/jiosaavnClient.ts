// JioSaavn API client — Indian music catalog
// Uses the free saavn.dev API (no authentication required)

import { APICache } from './cache';
import type { Track, Album, Artist, SearchResults } from './types';

const DEFAULT_JIOSAAVN_INSTANCES = [
  'https://saavn.dev',
];

const JIOSAAVN_STORAGE_KEY = 'melodies_jiosaavn_instances';

function loadJioSaavnInstances(): string[] {
  try {
    const stored = localStorage.getItem(JIOSAAVN_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.filter((i: { enabled: boolean }) => i.enabled).map((i: { url: string }) => i.url);
    }
  } catch { /* */ }
  return [...DEFAULT_JIOSAAVN_INSTANCES];
}

class JioSaavnClient {
  private cache: APICache;

  constructor() {
    this.cache = new APICache({ maxSize: 200, ttl: 1000 * 60 * 10 });
    setInterval(() => this.cache.clearExpired(), 1000 * 60 * 5);
  }

  private getBaseUrl(): string {
    const instances = loadJioSaavnInstances();
    return instances[0] || DEFAULT_JIOSAAVN_INSTANCES[0];
  }

  private async fetchAPI(path: string, signal?: AbortSignal): Promise<unknown> {
    const baseUrl = this.getBaseUrl();
    const response = await fetch(`${baseUrl}${path}`, {
      signal: signal || AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`JioSaavn API error: ${response.status}`);
    const json = await response.json();
    return json.data || json;
  }

  // ========== Normalize JioSaavn data → Track ==========

  private saavnToTrack(item: Record<string, unknown>): Track {
    const artists = item.artists as { primary?: { name: string }[]; all?: { name: string }[] } | undefined;
    const primaryArtists = artists?.primary || artists?.all || [];
    const artistName = primaryArtists.length > 0
      ? (primaryArtists[0] as { name: string }).name
      : (item.primaryArtists as string) || 'Unknown';

    const images = item.image as { url: string; quality: string }[] | undefined;
    const thumbnail = images && images.length > 0
      ? (images.find(i => i.quality === '150x150')?.url || images[images.length - 1]?.url || '')
      : '';
    const thumbnailLarge = images && images.length > 0
      ? (images.find(i => i.quality === '500x500')?.url || images[images.length - 1]?.url || '')
      : '';

    const downloadUrl = item.downloadUrl as { url: string; quality: string }[] | undefined;
    const bestStream = downloadUrl && downloadUrl.length > 0
      ? downloadUrl[downloadUrl.length - 1]?.url
      : undefined;

    return {
      id: `jiosaavn_${item.id}`,
      title: (item.name as string) || (item.title as string) || 'Unknown',
      artist: { id: 0, name: artistName },
      artists: primaryArtists.map((a: { name: string }) => ({ id: 0, name: a.name })),
      duration: Number(item.duration) || 0,
      thumbnail,
      thumbnailLarge,
      source: 'jiosaavn',
      streamUrl: bestStream,
      type: 'track',
    };
  }

  private saavnToAlbum(item: Record<string, unknown>): Album {
    const images = item.image as { url: string; quality: string }[] | undefined;
    const thumbnail = images && images.length > 0 ? images[images.length - 1]?.url : '';

    return {
      id: `jiosaavn_${item.id}`,
      title: (item.name as string) || (item.title as string) || 'Unknown',
      artist: { id: 0, name: (item.primaryArtists as string) || 'Unknown' },
      thumbnail: thumbnail || '',
      thumbnailLarge: thumbnail || '',
    };
  }

  private saavnToArtist(item: Record<string, unknown>): Artist {
    const images = item.image as { url: string; quality: string }[] | undefined;
    const thumbnail = images && images.length > 0 ? images[images.length - 1]?.url : '';

    return {
      id: `jiosaavn_${item.id}`,
      name: (item.name as string) || (item.title as string) || 'Unknown',
      thumbnail: thumbnail || '',
      thumbnailLarge: thumbnail || '',
    };
  }

  // ========== API Methods ==========

  async search(query: string, signal?: AbortSignal): Promise<SearchResults> {
    const cached = await this.cache.get<SearchResults>('jiosaavn_search', query);
    if (cached) return cached;

    try {
      const data = await this.fetchAPI(
        `/api/search/songs?query=${encodeURIComponent(query)}&limit=15`,
        signal
      ) as { results?: Record<string, unknown>[] };

      const items = data.results || (Array.isArray(data) ? data : []) as Record<string, unknown>[];
      const tracks = items.map(item => this.saavnToTrack(item));

      const results: SearchResults = { tracks, artists: [], albums: [], playlists: [] };
      await this.cache.set('jiosaavn_search', query, results);
      return results;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw error;
      console.error('JioSaavn search failed:', error);
      return { tracks: [], artists: [], albums: [], playlists: [] };
    }
  }

  async searchTracks(query: string, signal?: AbortSignal): Promise<Track[]> {
    const results = await this.search(query, signal);
    return results.tracks;
  }

  async getRecommendations(songId: string): Promise<Track[]> {
    const cacheKey = `recs_${songId}`;
    const cached = await this.cache.get<Track[]>('jiosaavn_recs', cacheKey);
    if (cached) return cached;

    try {
      // Extract raw ID from jiosaavn_ prefix
      const rawId = songId.replace('jiosaavn_', '');
      const data = await this.fetchAPI(`/api/songs/${rawId}/suggestions?limit=10`) as
        Record<string, unknown>[] | { results?: Record<string, unknown>[] };

      const items = Array.isArray(data) ? data : (data as { results?: Record<string, unknown>[] }).results || [];
      const tracks = items.map(item => this.saavnToTrack(item as Record<string, unknown>));

      await this.cache.set('jiosaavn_recs', cacheKey, tracks);
      return tracks;
    } catch (error) {
      console.error('JioSaavn recommendations failed:', error);
      return [];
    }
  }

  async getStreamUrl(songId: string): Promise<string | null> {
    try {
      const rawId = songId.replace('jiosaavn_', '');
      const data = await this.fetchAPI(`/api/songs/${rawId}`) as Record<string, unknown>[] | Record<string, unknown>;

      const song = Array.isArray(data) ? data[0] : data;
      if (!song) return null;

      const downloadUrl = song.downloadUrl as { url: string; quality: string }[] | undefined;
      if (downloadUrl && downloadUrl.length > 0) {
        return downloadUrl[downloadUrl.length - 1]?.url || null;
      }
      return null;
    } catch {
      return null;
    }
  }

  clearCache() {
    this.cache.clear();
  }
}

export const jiosaavnClient = new JioSaavnClient();
export { DEFAULT_JIOSAAVN_INSTANCES };
