// Ytify Client — search and audio streaming via https://ytify.pp.ua/
// Search: https://api.ytify.workers.dev/search?q={query}&f=song
// Audio Stream: https://ytify.pp.ua/s/{videoId} (Accept: application/json)

import type { Track, SearchResults } from './types';

export interface YtifySearchItem {
  id: string;
  title: string;
  author: string;
  authorId?: string;
  albumId?: string;
  duration?: string;
  img?: string;
  subtext?: string;
  type?: 'song' | 'video' | 'artist' | 'album' | 'playlist';
}

export interface YtifyStreamFormat {
  itag?: number;
  mimeType?: string;
  type?: string;
  bitrate?: string | number;
  contentLength?: string;
  url: string;
}

export interface YtifyStreamResponse {
  title?: string;
  author?: string;
  authorId?: string;
  lengthSeconds?: number;
  adaptiveFormats?: YtifyStreamFormat[];
  error?: string;
}

export interface StreamDetails {
  url: string;
  directUrl: string;
  mimeType: string;
  bitrate: number;
  loudnessDb: number;
  source: 'ytify' | 'invidious' | 'native';
  instance?: string;
}

function parseDurationString(d?: string): number {
  if (!d) return 0;
  const parts = d.split(':').map(Number);
  if (parts.length === 2) {
    return (parts[0] * 60) + parts[1];
  } else if (parts.length === 3) {
    return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
  }
  return Number(d) || 0;
}

class YtifyClient {
  private apiBase = 'https://api.ytify.workers.dev';
  private streamBase = 'https://ytify.pp.ua';

  // Map Ytify item to app Track
  itemToTrack(item: YtifySearchItem): Track {
    const duration = parseDurationString(item.duration);
    let coverUrl = `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`;
    if (item.img) {
      if (item.img.startsWith('/')) {
        coverUrl = `https://yt3.googleusercontent.com${item.img}=s500-c-k-c0x00ffffff-no-rj`;
      } else {
        coverUrl = item.img;
      }
    }

    return {
      id: item.id,
      videoId: item.id,
      title: item.title,
      artist: (item.author || '').replace(/ - Topic$/, '').trim() || 'Unknown Artist',
      album: item.subtext || '',
      duration,
      coverUrl,
      source: 'youtube',
    };
  }

  // Search via Ytify API
  async search(query: string, filter: string = 'song', signal?: AbortSignal): Promise<SearchResults> {
    if (!query.trim()) return { tracks: [], albums: [], artists: [], playlists: [], videos: [] };

    try {
      // First try local proxy endpoint to bypass any browser CORS
      let rawData: YtifySearchItem[] | null = null;
      try {
        const localRes = await fetch(`/api/ytmusic/ytify/search?q=${encodeURIComponent(query)}&f=${encodeURIComponent(filter)}`, {
          signal: signal || AbortSignal.timeout(6000),
        });
        if (localRes.ok) {
          rawData = await localRes.json();
        }
      } catch {
        // Fallback to direct worker fetch
      }

      if (!rawData) {
        const directRes = await fetch(`${this.apiBase}/search?q=${encodeURIComponent(query)}&f=${encodeURIComponent(filter)}`, {
          headers: {
            'Accept': 'application/json',
            'Origin': 'https://ytify.pp.ua',
          },
          signal: signal || AbortSignal.timeout(6000),
        });
        if (directRes.ok) {
          rawData = await directRes.json();
        }
      }

      if (Array.isArray(rawData)) {
        const tracks = rawData.map(item => this.itemToTrack(item));
        return {
          tracks,
          albums: [],
          artists: [],
          playlists: [],
          videos: [],
        };
      }
    } catch (err) {
      console.warn('[ytify] search failed:', err);
    }

    return { tracks: [], albums: [], artists: [], playlists: [], videos: [] };
  }

  // Search suggestions via Ytify
  async getSuggestions(query: string): Promise<string[]> {
    if (!query.trim()) return [];
    try {
      // Local endpoint first
      try {
        const localRes = await fetch(`/api/ytmusic/ytify/suggestions?q=${encodeURIComponent(query)}`);
        if (localRes.ok) {
          const list = await localRes.json();
          if (Array.isArray(list)) return list;
        }
      } catch {
        // Fallback
      }

      const res = await fetch(`${this.apiBase}/search-suggestions?q=${encodeURIComponent(query)}&music=true`, {
        headers: { 'Accept': 'application/json', 'Origin': 'https://ytify.pp.ua' },
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) return list;
      }
    } catch {
      // Ignore
    }
    return [];
  }

  // Audio Stream via https://ytify.pp.ua/s/:id
  async getStreamDetails(track: Track): Promise<StreamDetails | null> {
    const videoId = track.videoId || (typeof track.id === 'string' ? track.id.replace('YT:', '') : String(track.id));
    if (!videoId) return null;

    try {
      // 1. Try local server-side Ytify endpoint first
      try {
        const localRes = await fetch(`/api/ytmusic/ytify/stream/${encodeURIComponent(videoId)}`, {
          signal: AbortSignal.timeout(6000),
        });
        if (localRes.ok) {
          const data = await localRes.json();
          if (data && data.url) {
            return {
              url: data.url,
              directUrl: data.directUrl || data.url,
              mimeType: data.mimeType || 'audio/webm',
              bitrate: data.bitrate || 160000,
              loudnessDb: 0,
              source: 'ytify',
              instance: 'https://ytify.pp.ua',
            };
          }
        }
      } catch {
        // Fallback
      }

      // 2. Direct fetch from https://ytify.pp.ua/s/:id with Accept: application/json
      const res = await fetch(`${this.streamBase}/s/${encodeURIComponent(videoId)}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
        signal: AbortSignal.timeout(6000),
      });

      if (res.ok) {
        const data: YtifyStreamResponse = await res.json();
        const formats = data.adaptiveFormats || [];
        const audioFormats = formats.filter(f => {
          const type = (f.mimeType || f.type || '').toLowerCase();
          return type.startsWith('audio/') || f.itag === 140 || f.itag === 251 || f.itag === 250;
        });

        if (audioFormats.length > 0) {
          audioFormats.sort((a, b) => (Number(b.bitrate) || 0) - (Number(a.bitrate) || 0));
          const best = audioFormats[0];
          const directUrl = best.url;
          const proxiedUrl = `/api/ytmusic/proxy?url=${encodeURIComponent(directUrl)}`;

          return {
            url: proxiedUrl,
            directUrl,
            mimeType: best.mimeType || best.type || 'audio/webm',
            bitrate: Number(best.bitrate) || 160000,
            loudnessDb: 0,
            source: 'ytify',
            instance: 'https://ytify.pp.ua',
          };
        }
      }
    } catch (err) {
      console.warn('[ytify] getStreamDetails error:', err);
    }

    return null;
  }

  // Test connection to Ytify stream endpoint
  async testConnection(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      // Test with well-known ID via local proxy or direct
      const res = await fetch(`/api/ytmusic/ytify/stream/dQw4w9WgXcQ`, {
        signal: AbortSignal.timeout(6000),
      }).catch(() => fetch(`${this.streamBase}/s/dQw4w9WgXcQ`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(6000),
      }));

      const latencyMs = Date.now() - start;
      if (res && res.ok) {
        return { ok: true, latencyMs };
      }
      return { ok: false, latencyMs, error: res ? `HTTP ${res.status}` : 'No response' };
    } catch (err: any) {
      return { ok: false, latencyMs: Date.now() - start, error: err?.message || 'Connection timeout' };
    }
  }
}

export const ytifyClient = new YtifyClient();
