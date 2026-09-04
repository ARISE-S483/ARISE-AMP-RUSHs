// Invidious API Client — audio stream extraction according to https://docs.invidious.io/api/
// Endpoint: GET /api/v1/videos/:id
// Filters adaptiveFormats for audio streams, selects best bitrate, and proxies for CORS/Range support.

import type { Track } from './types';
import { useSettingsStore } from '@/stores/settingsStore';

export interface InvidiousAudioFormat {
  url: string;
  itag?: string;
  type?: string;
  bitrate?: string | number;
  container?: string;
  encoding?: string;
  audioQuality?: string;
  audioSampleRate?: string;
  audioChannels?: number;
  clen?: string;
}

export interface InvidiousVideoResponse {
  type?: string;
  title?: string;
  videoId?: string;
  adaptiveFormats?: InvidiousAudioFormat[];
  formatStreams?: InvidiousAudioFormat[];
  lengthSeconds?: number;
  error?: string;
}

export interface StreamDetails {
  url: string;
  directUrl: string;
  mimeType: string;
  bitrate: number;
  loudnessDb: number;
  source: 'invidious' | 'native';
  instance?: string;
}

export const KNOWN_INVIDIOUS_INSTANCES = [
  'https://inv.nadeko.net',
  'https://invidious.nerdvpn.de',
  'https://invidious.tiekoetter.com',
  'https://invidious.f5.si',
  'https://yt.chocolatemoo53.com',
  'https://invidious.drgns.space',
  'https://inv.tux.pizza',
];

class InvidiousClient {
  private activeInstance: string = KNOWN_INVIDIOUS_INSTANCES[0];
  private failedInstances = new Set<string>();

  getActiveInstance(): string {
    const custom = useSettingsStore.getState().invidiousInstanceUrl;
    if (custom && custom.trim().startsWith('http')) {
      return custom.trim().replace(/\/+$/, '');
    }
    return this.activeInstance;
  }

  setActiveInstance(url: string) {
    this.activeInstance = url.replace(/\/+$/, '');
  }

  // Ping instance /api/v1/stats
  async testInstance(instanceUrl: string): Promise<{ ok: boolean; latencyMs: number; version?: string; error?: string }> {
    const cleanUrl = instanceUrl.trim().replace(/\/+$/, '');
    const startTime = performance.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${cleanUrl}/api/v1/stats`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Melodies-Invidious/1.0' },
      });
      clearTimeout(timeout);
      const latencyMs = Math.round(performance.now() - startTime);

      if (!res.ok) {
        return { ok: false, latencyMs, error: `HTTP ${res.status} ${res.statusText}` };
      }
      const data = await res.json().catch(() => ({}));
      const version = data.version || data.software?.version || 'Online';
      return { ok: true, latencyMs, version };
    } catch (e: any) {
      const latencyMs = Math.round(performance.now() - startTime);
      return { ok: false, latencyMs, error: e?.message || 'Connection failed' };
    }
  }

  // Query Invidious API for video details
  async fetchVideo(videoId: string, instanceUrl?: string): Promise<{ data: InvidiousVideoResponse | null; instance: string }> {
    const instance = instanceUrl || this.getActiveInstance();
    try {
      // First try via server-side endpoint which concurrently probes healthy instances
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const serverRes = await fetch(`/api/ytmusic/invidious/stream/${encodeURIComponent(videoId)}?instance=${encodeURIComponent(instance)}`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (serverRes.ok) {
        const json = await serverRes.json();
        if (json && json.url) {
          return { data: json, instance: json.instance || instance };
        }
      }
    } catch {
      // fallback to direct fetch
    }

    // Direct fetch from Invidious instance (short timeout)
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(`${instance}/api/v1/videos/${encodeURIComponent(videoId)}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        return { data, instance };
      }
    } catch {
      // Direct fetch failed or CORS blocked
    }

    return { data: null, instance };
  }

  // Extract best audio format from Invidious API response
  extractBestAudio(videoData: InvidiousVideoResponse, instance: string): { format: InvidiousAudioFormat; url: string } | null {
    const formats: InvidiousAudioFormat[] = [
      ...(videoData.adaptiveFormats || []),
      ...(videoData.formatStreams || []),
    ];

    const audioFormats = formats.filter(f => {
      if (!f || !f.url) return false;
      const type = (f.type || '').toLowerCase();
      const container = (f.container || '').toLowerCase();
      return type.startsWith('audio/') || container === 'webm' || container === 'm4a' || !!f.audioQuality;
    });

    if (audioFormats.length === 0) return null;

    // Sort by bitrate descending
    audioFormats.sort((a, b) => {
      const brA = parseInt(String(a.bitrate || '0'), 10) || 0;
      const brB = parseInt(String(b.bitrate || '0'), 10) || 0;
      return brB - brA;
    });

    const best = audioFormats[0];
    let resolvedUrl = best.url;

    // If relative url, prepend instance
    if (resolvedUrl.startsWith('/')) {
      resolvedUrl = `${instance}${resolvedUrl}`;
    }

    return { format: best, url: resolvedUrl };
  }

  // Get stream details for a track
  async getStreamDetails(track: Track): Promise<StreamDetails | null> {
    const videoId = track.videoId || (typeof track.id === 'string' ? track.id.replace('YT:', '') : String(track.id));
    if (!videoId) return null;

    const primaryInstance = this.getActiveInstance();

    try {
      const { data, instance } = await this.fetchVideo(videoId, primaryInstance);

      // If server already returned formatted stream details
      if (data && (data as any).directUrl && (data as any).url) {
        const s = data as any;
        return {
          url: s.url,
          directUrl: s.directUrl,
          mimeType: s.mimeType || 'audio/webm',
          bitrate: s.bitrate || 160000,
          loudnessDb: s.loudnessDb || 0,
          source: 'invidious',
          instance,
        };
      }

      if (data && (data.adaptiveFormats || data.formatStreams)) {
        const best = this.extractBestAudio(data, instance);
        if (best) {
          const directUrl = best.url;
          const proxiedUrl = `/api/ytmusic/proxy?url=${encodeURIComponent(directUrl)}`;
          const bitrate = parseInt(String(best.format.bitrate || '160000'), 10) || 160000;
          const mimeType = best.format.type || (best.format.container ? `audio/${best.format.container}` : 'audio/webm');

          return {
            url: proxiedUrl,
            directUrl,
            mimeType,
            bitrate,
            loudnessDb: 0,
            source: 'invidious',
            instance,
          };
        }
      }
    } catch (err) {
      console.warn('[invidious] getStreamDetails error:', err);
    }

    return null;
  }
}

export const invidiousClient = new InvidiousClient();
