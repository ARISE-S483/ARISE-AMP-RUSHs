import { Track } from './types';
import { useRapidApiStore } from '@/stores/rapidapiStore';

const BASE_URL = 'https://musicapi13.p.rapidapi.com';

export const rapidapiClient = {
  async searchTracks(query: string, signal?: AbortSignal): Promise<Track[]> {
    const apiKey = useRapidApiStore.getState().rapidapiKey;
    if (!apiKey) return [];

    try {
      const response = await fetch(`${BASE_URL}/public/search`, {
        method: 'POST',
        headers: {
          'X-Rapidapi-Key': apiKey,
          'X-Rapidapi-Host': 'musicapi13.p.rapidapi.com',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          track: query,
          artist: "",
          sources: ["spotify", "appleMusic"],
          type: "track"
        }),
        signal
      });

      if (!response.ok) return [];

      const json = await response.json();
      const results: Track[] = [];

      if (json.tracks && Array.isArray(json.tracks)) {
        for (const item of json.tracks) {
          if (item.status === 'success' && item.data) {
            results.push({
              id: item.data.externalId || Math.random().toString(),
              title: item.data.name || 'Unknown Title',
              artist: {
                id: 0,
                name: item.data.artistNames?.[0] || 'Unknown Artist'
              },
              album: {
                id: 0,
                title: item.data.albumName || ''
              },
              thumbnail: item.data.imageUrl || '',
              duration: item.data.duration ? Math.floor(item.data.duration / 1000) : 0,
              source: 'rapidapi', // Mapped cleanly to avoid collision
              explicit: false
            });
          }
        }
      }

      // Deduplicate by name/artist roughly
      const unique = results.filter((track, index, self) =>
        index === self.findIndex((t) => (
          t.title === track.title && t.artist?.name === track.artist?.name
        ))
      );

      return unique;

    } catch (error) {
      console.error('RapidAPI search error:', error);
      return [];
    }
  }
};
