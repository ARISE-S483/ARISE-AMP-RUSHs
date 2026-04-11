import { useRapidApiStore } from '@/stores/rapidapiStore';
import type { Track } from './types';

const SHAZAM_HOST = 'shazam.p.rapidapi.com';

/**
 * Shazam API client (via RapidAPI)
 * Provides song search, discovery, and "What's playing?" recognition.
 * Endpoints: GET /search, GET /songs/get-details, GET /charts/track
 */
export const shazamClient = {
  async searchTracks(query: string, signal?: AbortSignal): Promise<Track[]> {
    const { rapidapiKey } = useRapidApiStore.getState();
    if (!rapidapiKey) return [];

    try {
      const params = new URLSearchParams({
        term: query,
        locale: 'en-US',
        offset: '0',
        limit: '10'
      });

      const response = await fetch(`https://${SHAZAM_HOST}/search?${params}`, {
        headers: {
          'X-Rapidapi-Key': rapidapiKey,
          'X-Rapidapi-Host': SHAZAM_HOST,
        },
        signal
      });

      if (!response.ok) return [];

      const json = await response.json();
      const results: Track[] = [];
      const tracks = json.tracks?.hits || [];

      for (const hit of tracks.slice(0, 15)) {
        const track = hit.track;
        if (!track) continue;

        results.push({
          id: track.key || Math.random().toString(),
          title: track.title || '',
          artist: {
            id: 0,
            name: track.subtitle || 'Unknown Artist',
          },
          album: { id: 0, title: '' },
          thumbnail: track.images?.coverart || track.images?.coverarthq || '',
          duration: 0,
          source: 'shazam',
          explicit: false,
        });
      }

      return results;
    } catch (error) {
      console.error('Shazam search error:', error);
      return [];
    }
  },

  /**
   * Get trending/chart tracks
   */
  async getCharts(signal?: AbortSignal): Promise<Track[]> {
    const { rapidapiKey } = useRapidApiStore.getState();
    if (!rapidapiKey) return [];

    try {
      const response = await fetch(`https://${SHAZAM_HOST}/charts/track?locale=en-US&pageSize=20&startFrom=0`, {
        headers: {
          'X-Rapidapi-Key': rapidapiKey,
          'X-Rapidapi-Host': SHAZAM_HOST,
        },
        signal,
      });

      if (!response.ok) return [];

      const json = await response.json();
      const results: Track[] = [];
      const tracks = json.tracks || [];

      for (const track of tracks.slice(0, 20)) {
        results.push({
          id: track.key || Math.random().toString(),
          title: track.title || '',
          artist: {
            id: 0,
            name: track.subtitle || 'Unknown Artist',
          },
          album: { id: 0, title: '' },
          thumbnail: track.images?.coverart || track.images?.coverarthq || '',
          duration: 0,
          source: 'shazam',
          explicit: false,
        });
      }

      return results;
    } catch (error) {
      console.error('Shazam charts error:', error);
      return [];
    }
  },
};
