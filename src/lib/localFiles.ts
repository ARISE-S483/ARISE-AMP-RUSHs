import { parseAudioMetadata } from './taglib';
import type { Track } from '@/api/types';

export async function parseLocalAudioFiles(files: FileList | File[]): Promise<Track[]> {
  const tracks: Track[] = [];
  const fileArray = Array.from(files).filter(f => f.type.startsWith('audio/') || f.name.endsWith('.flac'));

  for (let i = 0; i < fileArray.length; i++) {
    const file = fileArray[i];
    
    try {
      const meta = await parseAudioMetadata(file);
      
      let coverUrl: string | undefined;
      if (meta.coverData && meta.coverMime) {
        const blob = new Blob([meta.coverData as unknown as BlobPart], { type: meta.coverMime });
        coverUrl = URL.createObjectURL(blob);
      }

      const title = meta.title || file.name.replace(/\.[^/.]+$/, '');
      const artistName = meta.artist || 'Unknown Artist';
      const albumTitle = meta.albumTitle || 'Unknown Album';

      const track: Track = {
        id: `local-${file.name}-${file.lastModified}-${i}`,
        title,
        artist: { id: 0, name: artistName },
        album: { id: 0, title: albumTitle, cover: coverUrl },
        duration: meta.duration || 0,
        source: 'local',
        streamUrl: URL.createObjectURL(file), // Generate local playback URL
        thumbnail: coverUrl,
        thumbnailLarge: coverUrl,
      };

      tracks.push(track);
    } catch (e) {
      console.warn('Failed to parse local file:', file.name, e);
      // Fallback
      tracks.push({
        id: `local-${file.name}-${file.lastModified}-${i}`,
        title: file.name.replace(/\.[^/.]+$/, ''),
        artist: { id: 0, name: 'Unknown Artist' },
        duration: 0,
        source: 'local',
        streamUrl: URL.createObjectURL(file),
      });
    }
  }

  return tracks;
}
