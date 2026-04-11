import { Track, Album, Artist, Playlist } from './types';
import { useRapidApiStore } from '@/stores/rapidapiStore';

const DEEZER_HOST = 'deezerdevs-deezer.p.rapidapi.com';

function getHeaders() {
  const apiKey = useRapidApiStore.getState().rapidapiKey;
  return {
    'X-Rapidapi-Key': apiKey,
    'X-Rapidapi-Host': DEEZER_HOST,
    'Content-Type': 'application/json'
  };
}

export const deezerClient = {
  // 1. GET Search
  async searchTracks(query: string, signal?: AbortSignal): Promise<Track[]> {
    if (!useRapidApiStore.getState().rapidapiKey) return [];
    try {
      const response = await fetch(`https://${DEEZER_HOST}/search?q=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: getHeaders(),
        signal
      });
      if (!response.ok) return [];
      const json = await response.json();
      return (json.data || []).slice(0, 15).map((item: any) => ({
        id: item.id || Math.random().toString(),
        title: item.title || 'Unknown Title',
        artist: { id: item.artist?.id || 0, name: item.artist?.name || 'Unknown Artist' },
        album: { id: item.album?.id || 0, title: item.album?.title || '' },
        thumbnail: item.album?.cover_big || item.album?.cover_medium || item.album?.cover || '',
        thumbnailLarge: item.album?.cover_xl || item.album?.cover_big || '',
        duration: item.duration || 0,
        source: 'rapidapi',
        explicit: item.explicit_lyrics || false,
        streamUrl: item.preview || undefined
      }));
    } catch { return []; }
  },

  // 2. GET Track
  async getTrack(id: string | number): Promise<Track | null> {
    if (!useRapidApiStore.getState().rapidapiKey) return null;
    try {
      const response = await fetch(`https://${DEEZER_HOST}/track/${id}`, { headers: getHeaders() });
      if (!response.ok) return null;
      const item = await response.json();
      if (item.error) return null;
      return {
        id: item.id,
        title: item.title,
        artist: { id: item.artist?.id || 0, name: item.artist?.name || 'Unknown' },
        album: { id: item.album?.id || 0, title: item.album?.title || '' },
        thumbnail: item.album?.cover_big || item.album?.cover_medium || '',
        thumbnailLarge: item.album?.cover_xl || item.album?.cover_big || '',
        duration: item.duration || 0,
        source: 'rapidapi',
        explicit: item.explicit_lyrics || false,
        streamUrl: item.preview || undefined
      };
    } catch { return null; }
  },

  // 3. GET Album
  async getAlbum(id: string | number): Promise<Album | null> {
    if (!useRapidApiStore.getState().rapidapiKey) return null;
    try {
      const response = await fetch(`https://${DEEZER_HOST}/album/${id}`, { headers: getHeaders() });
      if (!response.ok) return null;
      const item = await response.json();
      if (item.error) return null;
      return {
        id: item.id,
        title: item.title,
        artist: { id: item.artist?.id || 0, name: item.artist?.name || 'Unknown' },
        cover: item.cover_big || item.cover_medium || '',
        thumbnail: item.cover_medium || item.cover || '',
        thumbnailLarge: item.cover_xl || item.cover_big || '',
        releaseDate: item.release_date,
        numberOfTracks: item.nb_tracks || 0,
        duration: item.duration || 0,
        type: 'ALBUM',
        explicit: item.explicit_lyrics || false,
        tracks: (item.tracks?.data || []).map((t: any) => ({
          id: t.id,
          title: t.title,
          artist: { id: t.artist?.id || 0, name: t.artist?.name || 'Unknown' },
          duration: t.duration || 0,
          source: 'rapidapi',
          streamUrl: t.preview || undefined
        }))
      };
    } catch { return null; }
  },

  // 4. GET Artist
  async getArtist(id: string | number): Promise<Artist | null> {
    if (!useRapidApiStore.getState().rapidapiKey) return null;
    try {
      const response = await fetch(`https://${DEEZER_HOST}/artist/${id}`, { headers: getHeaders() });
      if (!response.ok) return null;
      const item = await response.json();
      if (item.error) return null;
      
      // Also fetch their top tracks
      let tracks: Track[] = [];
      try {
        const topRes = await fetch(`https://${DEEZER_HOST}/artist/${id}/top?limit=10`, { headers: getHeaders() });
        const topJson = await topRes.json();
        if (topJson.data) {
          tracks = topJson.data.map((t: any) => ({
            id: t.id,
            title: t.title,
            artist: { id: t.artist?.id || 0, name: t.artist?.name || item.name },
            album: { id: t.album?.id || 0, title: t.album?.title || '' },
            thumbnail: t.album?.cover_medium || '',
            duration: t.duration || 0,
            source: 'rapidapi',
            streamUrl: t.preview || undefined
          }));
        }
      } catch { /* ignore */ }

      return {
        id: item.id,
        name: item.name,
        picture: item.picture_xl || item.picture_big || '',
        thumbnail: item.picture_medium || item.picture || '',
        thumbnailLarge: item.picture_xl || item.picture_big || '',
        tracks
      };
    } catch { return null; }
  },

  // 5. GET Playlist
  async getPlaylist(id: string | number): Promise<Playlist | null> {
    if (!useRapidApiStore.getState().rapidapiKey) return null;
    try {
      const response = await fetch(`https://${DEEZER_HOST}/playlist/${id}`, { headers: getHeaders() });
      if (!response.ok) return null;
      const item = await response.json();
      if (item.error) return null;
      return {
        id: String(item.id),
        title: item.title,
        description: item.description || '',
        creator: item.creator?.name || '',
        thumbnail: item.picture_medium || item.picture || '',
        trackCount: item.nb_tracks || 0,
        numberOfTracks: item.nb_tracks || 0,
        tracks: (item.tracks?.data || []).map((t: any) => ({
          id: t.id,
          title: t.title,
          artist: { id: t.artist?.id || 0, name: t.artist?.name || 'Unknown' },
          album: { id: t.album?.id || 0, title: t.album?.title || '' },
          thumbnail: t.album?.cover_medium || '',
          duration: t.duration || 0,
          source: 'rapidapi',
          streamUrl: t.preview || undefined
        }))
      };
    } catch { return null; }
  },

  // 6. GET Infos
  async getInfos(): Promise<any> {
    if (!useRapidApiStore.getState().rapidapiKey) return null;
    try {
      const response = await fetch(`https://${DEEZER_HOST}/infos`, { headers: getHeaders() });
      return response.ok ? await response.json() : null;
    } catch { return null; }
  },

  // 7. GET Radio
  async getRadio(): Promise<any> {
    if (!useRapidApiStore.getState().rapidapiKey) return null;
    try {
      const response = await fetch(`https://${DEEZER_HOST}/radio`, { headers: getHeaders() });
      return response.ok ? await response.json() : null;
    } catch { return null; }
  }
};
