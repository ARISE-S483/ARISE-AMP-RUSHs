// Piped (YouTube Music) API client — privacy-friendly YouTube proxy
// Primary source for search, suggestions, and recommendations
// No authentication required

import { APICache } from './cache';
import type { Track, Artist, Album, Playlist, SearchResults } from './types';
import { useRapidApiStore } from '@/stores/rapidapiStore';

// ========== Piped Instance Management ==========

const DEFAULT_PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.r4fo.com',
  'https://pipedapi.leptons.xyz',
  'https://piped-api.lunar.icu',
  'https://pipedapi.colinslegacy.com',
  'https://pa.il.ax',
  'https://api.piped.projectsegfau.lt',
];

const PIPED_STORAGE_KEY = 'melodies_piped_instances';

interface PipedInstance {
  url: string;
  enabled: boolean;
  latency?: number;
  status?: 'online' | 'offline' | 'checking';
}

function loadPipedInstances(): string[] {
  try {
    const stored = localStorage.getItem(PIPED_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as PipedInstance[];
      return parsed.filter(i => i.enabled).map(i => i.url);
    }
  } catch { /* */ }
  return [...DEFAULT_PIPED_INSTANCES];
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ========== Piped API Client ==========

class PipedClient {
  private cache: APICache;
  private instanceIndex: number;

  constructor() {
    this.cache = new APICache({ maxSize: 300, ttl: 1000 * 60 * 10 });
    this.instanceIndex = 0;
    setInterval(() => this.cache.clearExpired(), 1000 * 60 * 5);
  }

  private getInstances(): string[] {
    return loadPipedInstances();
  }

  private async fetchWithRetry(
    path: string,
    options: { signal?: AbortSignal } = {}
  ): Promise<Response> {
    const instances = this.getInstances();
    if (instances.length === 0) {
      throw new Error('No Piped instances available');
    }

    const maxAttempts = Math.min(instances.length, 5);
    let lastError: Error | null = null;
    let idx = this.instanceIndex % instances.length;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const baseUrl = instances[idx % instances.length];
      const url = `${baseUrl}${path}`;

      try {
        const response = await fetch(url, {
          signal: options.signal || AbortSignal.timeout(10000),
        });

        if (response.status === 429) {
          idx++;
          await delay(500);
          continue;
        }

        if (response.ok) {
          this.instanceIndex = idx;
          return response;
        }

        if (response.status >= 500) {
          idx++;
          continue;
        }

        lastError = new Error(`Piped request failed: ${response.status}`);
        idx++;
      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') throw error;
        lastError = error instanceof Error ? error : new Error('Unknown error');
        idx++;
        await delay(300);
      }
    }

    throw lastError || new Error(`All Piped instances failed for: ${path}`);
  }

  // ========== Normalize Piped data → Track ==========

  private pipedItemToTrack(item: Record<string, unknown>): Track {
    const uploaderName = (item.uploaderName as string) || (item.uploader as string) || 'Unknown';
    const artistName = uploaderName.replace(/ - Topic$/, '').replace(/ - Official$/, '').trim();
    const durationSeconds = typeof item.duration === 'number' ? item.duration : 0;
    const videoId = this.extractVideoId(item.url as string || '');

    let thumbnail = (item.thumbnail as string) || (item.thumbnailUrl as string) || '';
    if (!thumbnail && videoId) {
      thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    }

    return {
      id: `piped_${videoId}`,
      title: (item.title as string) || 'Unknown',
      artist: { id: 0, name: artistName },
      artists: [{ id: 0, name: artistName }],
      duration: durationSeconds,
      thumbnail,
      thumbnailLarge: thumbnail.replace('hqdefault', 'maxresdefault'),
      popularity: (item.views as number) || 0,
      source: 'piped',
      videoId,
      type: 'track',
    };
  }

  private extractVideoId(url: string): string {
    if (!url) return '';
    // /watch?v=VIDEO_ID format
    const match = url.match(/[?&]v=([^&]+)/) || url.match(/\/watch\/([^?&]+)/);
    if (match) return match[1];
    // Direct video ID
    if (url.length === 11 && !url.includes('/')) return url;
    return url;
  }

  // ========== API Methods ==========

  async search(query: string, signal?: AbortSignal): Promise<SearchResults> {
    const cached = await this.cache.get<SearchResults>('piped_search', query);
    if (cached) return cached;

    try {
      // Search for music songs specifically
      const response = await this.fetchWithRetry(
        `/search?q=${encodeURIComponent(query)}&filter=music_songs`,
        { signal }
      );
      const data = await response.json();
      const items = (data.items || []) as Record<string, unknown>[];

      const tracks = items
        .filter((item: Record<string, unknown>) => item.type === 'stream')
        .slice(0, 20)
        .map((item: Record<string, unknown>) => this.pipedItemToTrack(item));

      const results: SearchResults = {
        tracks,
        artists: [],
        albums: [],
        playlists: [],
      };

      await this.cache.set('piped_search', query, results);
      return results;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw error;
      console.error('Piped search failed:', error);
      return { tracks: [], artists: [], albums: [], playlists: [] };
    }
  }

  async searchTracks(query: string, signal?: AbortSignal): Promise<Track[]> {
    const results = await this.search(query, signal);
    return results.tracks;
  }

  async getSuggestions(query: string): Promise<string[]> {
    try {
      const response = await this.fetchWithRetry(
        `/suggestions?query=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      return Array.isArray(data) ? data.slice(0, 10) : [];
    } catch {
      return [];
    }
  }

  async getStreamUrl(videoId: string): Promise<string | null> {
    const cacheKey = `stream_${videoId}`;
    const cached = await this.cache.get<string>('piped_stream', cacheKey);
    if (cached) return cached;

    try {
      const response = await this.fetchWithRetry(`/streams/${videoId}`);
      const data = await response.json();

      // Check if it's an Official Music Video or VEVO
      const uploader = ((data.uploader as string) || '').toLowerCase();
      const title = ((data.title as string) || '').toLowerCase();
      const isOfficialMusicVideo = uploader.endsWith('vevo') || 
                                   uploader.includes('official') || 
                                   title.includes('official video') ||
                                   title.includes('music video');

      // 1. Try to get highest quality audio-only stream (Skip for Official Music Videos due to YouTube 403 block)
      const audioStreams = (data.audioStreams || []) as {
        url: string;
        bitrate: number;
        mimeType: string;
        quality: string;
      }[];

      let bestUrl: string | null = null;

      if (!isOfficialMusicVideo && audioStreams.length > 0) {
        // Sort by bitrate descending, prefer high quality audio
        const sortedAudio = audioStreams
          .filter(s => s.url && s.mimeType?.includes('audio'))
          .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
        
        if (sortedAudio.length > 0) {
          bestUrl = sortedAudio[0].url;
        }
      }

      // 2. Fallback (or Primary for Music Videos) — grabbed lowest quality video stream to save bandwidth, 
      // since HTML5 <audio> decodes MP4 audio track natively and avoids VEVO 403 blocks!
      if (!bestUrl) {
        const videoStreams = (data.videoStreams || []) as {
          url: string;
          bitrate: number;
          mimeType: string;
          quality: string;
          videoOnly: boolean;
        }[];

        if (videoStreams.length > 0) {
          const sortedVideo = videoStreams
            .filter(s => s.url && s.videoOnly === false) // Must explicitly ensure it's a multiplexed (A+V) stream
            .sort((a, b) => (a.bitrate || 0) - (b.bitrate || 0)); // Ascending - lowest quality first
          
          if (sortedVideo.length > 0) {
            bestUrl = sortedVideo[0].url;
          }
        }
      }

      if (bestUrl) {
        await this.cache.set('piped_stream', cacheKey, bestUrl);
        return bestUrl;
      }

      // 3. Keep fallback logic if both are completely empty
      throw new Error("No streams available on Piped instance");
    } catch (error) {
      console.warn('All Piped instances failed for stream. Attempting RapidAPI fallback...', error);

      const rapidapiKey = useRapidApiStore.getState().rapidapiKey;
      if (!rapidapiKey) return null;

      try {
        const fallbackRes = await fetch(`https://youtube-data16.p.rapidapi.com/files/audio/${videoId}`, {
          headers: {
            'X-Rapidapi-Key': rapidapiKey,
            'X-Rapidapi-Host': 'youtube-data16.p.rapidapi.com'
          }
        });

        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          if (Array.isArray(fallbackData) && fallbackData.length > 0) {
            const sorted = fallbackData
              .filter(s => s.url)
              .sort((a, b) => (b.averageBitrate || 0) - (a.averageBitrate || 0));

            const best = sorted[0];
            if (best?.url) {
              await this.cache.set('piped_stream', cacheKey, best.url);
              return best.url;
            }
          }
        }
      } catch (fallbackError) {
        console.error('RapidAPI stream fallback also failed:', fallbackError);
      }

      return null;
    }
  }

  async getTrackDetails(videoId: string): Promise<Track | null> {
    const cacheKey = `details_${videoId}`;
    const cached = await this.cache.get<Track>('piped_details', cacheKey);
    if (cached) return cached;

    try {
      const response = await this.fetchWithRetry(`/streams/${videoId}`);
      const data = await response.json();

      if (data.error) return null;

      const track = this.pipedItemToTrack(data);
      // pipedItemToTrack already normalizes it to a track.
      // But /streams/:id returns slightly different root fields than search
      // Let's refine the track object here:
      track.title = (data.title as string) || track.title;
      track.artist.name = (data.uploader as string) || track.artist.name;
      track.artists = [{ id: 0, name: track.artist.name }];
      track.thumbnail = (data.thumbnailUrl as string) || track.thumbnail;
      track.thumbnailLarge = track.thumbnail;
      track.duration = (data.duration as number) || track.duration;

      await this.cache.set('piped_details', cacheKey, track);
      return track;
    } catch (error) {
      console.error('Failed to get Piped track details:', error);
      return null;
    }
  }

  async getRelatedTracks(videoId: string): Promise<Track[]> {
    const cacheKey = `related_${videoId}`;
    const cached = await this.cache.get<Track[]>('piped_related', cacheKey);
    if (cached) return cached;

    try {
      const response = await this.fetchWithRetry(`/streams/${videoId}`);
      const data = await response.json();
      const related = (data.relatedStreams || []) as Record<string, unknown>[];

      const tracks = related
        .filter((item: Record<string, unknown>) =>
          item.type === 'stream' && (item.duration as number) > 30 && (item.duration as number) < 600
        )
        .slice(0, 15)
        .map((item: Record<string, unknown>) => this.pipedItemToTrack(item));

      await this.cache.set('piped_related', cacheKey, tracks);
      return tracks;
    } catch (error) {
      console.error('Failed to get Piped related tracks:', error);
      return [];
    }
  }

  async getTrending(region: string = 'IN'): Promise<Track[]> {
    const cacheKey = `trending_${region}`;
    const cached = await this.cache.get<Track[]>('piped_trending', cacheKey);
    if (cached) return cached;

    try {
      const response = await this.fetchWithRetry(`/trending?region=${region}`);
      const data = await response.json();
      const items = Array.isArray(data) ? data : [];

      // Filter for music-like content (shorter duration, music channels)
      const tracks = items
        .filter((item: Record<string, unknown>) =>
          (item.duration as number) > 30 &&
          (item.duration as number) < 600
        )
        .slice(0, 20)
        .map((item: Record<string, unknown>) => this.pipedItemToTrack(item));

      await this.cache.set('piped_trending', cacheKey, tracks);
      return tracks;
    } catch (error) {
      console.error('Failed to get Piped trending:', error);
      return [];
    }
  }

  clearCache() {
    this.cache.clear();
  }
}

export const pipedClient = new PipedClient();
export { DEFAULT_PIPED_INSTANCES };
