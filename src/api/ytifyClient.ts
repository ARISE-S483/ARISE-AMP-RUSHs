// Ytify Client — implementation matching https://github.com/n-ce/ytify
// Audio streaming: direct extraction from https://yt.omada.cafe / invidious instances with proxyHandler
// Audio request in Network Tab: https://yt.omada.cafe/videoplayback?expire=...&itag=251...

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

// Instances matching n-ce/ytify src/lib/modules/getStreamData.ts
export const YTIFY_INSTANCES = [
  'https://yt.omada.cafe',
  'https://invidious.schenkel.eti.br',
  'https://invidious.kemonomimi.nl',
  'https://inv.nadeko.net',
  'https://ytify.pp.ua'
];

// proxyHandler matching n-ce/ytify src/lib/utils/helpers.ts
export function proxyHandler(url: string, proxy?: string): string {
  try {
    const link = new URL(url);
    const origin = link.origin;
    const targetProxy = proxy || 'https://yt.omada.cafe';
    return !url.includes('&fallback') ? url.replace(origin, targetProxy) : url;
  } catch {
    return url;
  }
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
      // 1. First try local proxy endpoint to bypass any browser CORS
      let rawData: YtifySearchItem[] | null = null;
      try {
        const localRes = await fetch(`/api/ytmusic/ytify/search?q=${encodeURIComponent(query)}&f=${encodeURIComponent(filter)}`, {
          signal: signal || AbortSignal.timeout(6000),
        });
        if (localRes.ok) {
          rawData = await localRes.json();
        }
      } catch {
        // Fallback
      }

      // 2. Direct fetch to Ytify Worker
      if (!rawData) {
        try {
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
        } catch {
          // Fallback
        }
      }

      // 3. Direct fetch to yt.omada.cafe search endpoint
      if (!rawData) {
        try {
          const omadaRes = await fetch(`https://yt.omada.cafe/api/v1/search?q=${encodeURIComponent(query)}`, {
            headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
            signal: signal || AbortSignal.timeout(6000),
          });
          if (omadaRes.ok) {
            const omadaJson: any = await omadaRes.json();
            if (Array.isArray(omadaJson)) {
              rawData = omadaJson.map((item: any) => ({
                id: item.videoId || item.id,
                title: item.title,
                author: item.author || '',
                duration: item.lengthSeconds ? `${Math.floor(item.lengthSeconds / 60)}:${item.lengthSeconds % 60}` : '',
                img: item.videoThumbnails?.[0]?.url,
              }));
            }
          }
        } catch {
          // Fallback
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

  // Audio Stream via n-ce/ytify architecture (direct https://yt.omada.cafe/videoplayback?... playback)
  async getStreamDetails(track: Track): Promise<StreamDetails | null> {
    const videoId = track.videoId || (typeof track.id === 'string' ? track.id.replace('YT:', '') : String(track.id));
    if (!videoId) return null;

    // Probe instances in order matching n-ce/ytify
    for (const proxy of YTIFY_INSTANCES) {
      try {
        const isYtify = proxy === 'https://ytify.pp.ua';
        const url = isYtify
          ? `${proxy}/s/${encodeURIComponent(videoId)}`
          : `${proxy}/api/v1/videos/${encodeURIComponent(videoId)}`;

        const res = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          },
          signal: AbortSignal.timeout(5000),
        });

        if (!res.ok) continue;

        const data: any = await res.json();
        const formats: YtifyStreamFormat[] = data.adaptiveFormats || data.formatStreams || [];

        const audioFormats = formats.filter(f => {
          if (!f || !f.url) return false;
          const type = (f.mimeType || f.type || '').toLowerCase();
          return type.startsWith('audio/') || f.itag === 140 || f.itag === 251 || f.itag === 250;
        });

        if (audioFormats.length === 0) continue;

        // Preferred stream selection matching ytify (itag 251 Opus 160k, then itag 140 AAC 128k)
        audioFormats.sort((a, b) => {
          if (a.itag === 251) return -1;
          if (b.itag === 251) return 1;
          if (a.itag === 140) return -1;
          if (b.itag === 140) return 1;
          return (Number(b.bitrate) || 0) - (Number(a.bitrate) || 0);
        });

        const best = audioFormats[0];
        // Apply ytify proxyHandler: replaces googlevideo origin with proxy origin (e.g. https://yt.omada.cafe)
        const targetProxy = isYtify ? 'https://yt.omada.cafe' : proxy;
        const streamUrl = proxyHandler(best.url, targetProxy);

        return {
          url: streamUrl,
          directUrl: streamUrl,
          mimeType: best.mimeType || best.type || 'audio/webm',
          bitrate: Number(best.bitrate) || 160000,
          loudnessDb: 0,
          source: 'ytify',
          instance: targetProxy,
        };
      } catch {
        // Continue to next instance
      }
    }

    return null;
  }

  // Test connection to Ytify stream endpoint
  async testConnection(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      const res = await fetch('https://yt.omada.cafe/api/v1/videos/dQw4w9WgXcQ', {
        headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
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
