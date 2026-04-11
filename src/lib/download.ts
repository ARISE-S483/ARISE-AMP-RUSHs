// Download utility - fetches stream and triggers browser download
import { musicAPI } from '@/api/musicAPI';
import { useSettingsStore } from '@/stores/settingsStore';
import type { Track } from '@/api/types';

export interface DownloadProgress {
  trackId: string | number;
  progress: number; // 0-100
  status: 'pending' | 'downloading' | 'complete' | 'error';
  error?: string;
}

type DownloadListener = (progress: DownloadProgress) => void;
const listeners = new Set<DownloadListener>();
const activeDownloads = new Map<string, DownloadProgress>();

export function onDownloadProgress(fn: DownloadListener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify(progress: DownloadProgress) {
  activeDownloads.set(String(progress.trackId), progress);
  listeners.forEach(fn => fn(progress));
}

export function getActiveDownloads(): DownloadProgress[] {
  return Array.from(activeDownloads.values());
}

export async function downloadTrack(track: Track): Promise<void> {
  const { downloadQuality } = useSettingsStore.getState();
  const trackId = String(track.id);

  notify({ trackId: track.id, progress: 0, status: 'downloading' });

  try {
    const streamUrl = await musicAPI.getStreamUrl(track, downloadQuality);
    if (!streamUrl) {
      notify({ trackId: track.id, progress: 0, status: 'error', error: 'No stream URL available' });
      return;
    }

    notify({ trackId: track.id, progress: 30, status: 'downloading' });

    const response = await fetch(streamUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const blob = await response.blob();
    notify({ trackId: track.id, progress: 90, status: 'downloading' });

    // Determine extension from content-type
    const contentType = response.headers.get('content-type') || blob.type || '';
    let ext = 'mp3';
    if (contentType.includes('flac')) ext = 'flac';
    else if (contentType.includes('mp4') || contentType.includes('m4a')) ext = 'm4a';
    else if (contentType.includes('wav')) ext = 'wav';
    else if (contentType.includes('ogg')) ext = 'ogg';

    // Build filename
    const sanitize = (s: string) => s.replace(/[<>:"/\\|?*]/g, '_').trim();
    const artistName = track.artist?.name || 'Unknown Artist';
    const trackTitle = track.title || 'Unknown Track';
    const filename = `${sanitize(artistName)} - ${sanitize(trackTitle)}.${ext}`;

    // Embed metadata
    let finalBlob = blob;
    try {
      const { addMetadataToAudioBlob } = await import('./taglib');
      const coverUrl = track.thumbnailLarge || track.thumbnail;
      let coverData: Uint8Array | undefined;
      let coverMime: string | undefined;

      if (coverUrl) {
        try {
          const coverRes = await fetch(coverUrl);
          if (coverRes.ok) {
            coverData = new Uint8Array(await coverRes.arrayBuffer());
            coverMime = coverRes.headers.get('content-type') || 'image/jpeg';
          }
        } catch {
          // ignore cover fetch error
        }
      }

      finalBlob = await addMetadataToAudioBlob(blob, {
        title: trackTitle,
        artist: artistName,
        albumTitle: track.album?.title,
        coverData,
        coverMime,
      });
    } catch (e) {
      console.warn('Failed to embed metadata:', e);
    }

    // Trigger download
    const url = URL.createObjectURL(finalBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    notify({ trackId: track.id, progress: 100, status: 'complete' });

    // Clean up after a delay
    setTimeout(() => activeDownloads.delete(trackId), 5000);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Download failed';
    notify({ trackId: track.id, progress: 0, status: 'error', error: msg });
  }
}
