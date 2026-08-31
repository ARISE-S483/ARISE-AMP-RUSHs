// yt-dlp API client — robust fallback for YouTube stream resolution
// Fetches stream URLs via the local proxy or remote yt-dlp API wrappers

export interface YtdlpInstance {
  url: string;
  enabled: boolean;
  status?: 'online' | 'offline' | 'checking';
  latency?: number;
}

const STORAGE_KEY = 'melodies_ytdlp_instances';

const DEFAULT_INSTANCES: YtdlpInstance[] = [
  { url: '/api/ytmusic/ytdlp', enabled: true }
];

function loadInstances(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as YtdlpInstance[];
      return parsed.filter(i => i.enabled).map(i => i.url);
    }
  } catch { /* */ }
  return DEFAULT_INSTANCES.filter(i => i.enabled).map(i => i.url);
}

class YtdlpClient {
  private currentInstanceIndex: number = 0;

  async getStreamUrl(videoId: string): Promise<string | null> {
    const instances = loadInstances();
    if (instances.length === 0) return null;

    // Try instances starting from the current index, wrapping around
    for (let i = 0; i < instances.length; i++) {
      const index = (this.currentInstanceIndex + i) % instances.length;
      const baseUrl = instances[index];
      
      try {
        const url = `${baseUrl}/${videoId}`;
        const res = await fetch(url);
        
        if (res.ok) {
          const data = await res.json();
          if (data.url) {
             // Successful instance, keep it for next time
             this.currentInstanceIndex = index;
             return data.url;
          }
        }
      } catch (err) {
        console.warn(`[ytdlpClient] Instance ${baseUrl} failed:`, err);
        // Continue to the next instance
      }
    }

    return null;
  }
}

export const ytdlpClient = new YtdlpClient();
