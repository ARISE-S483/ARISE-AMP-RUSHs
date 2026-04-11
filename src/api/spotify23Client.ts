import { useRapidApiStore } from '@/stores/rapidapiStore';
import type { Track } from './types';

const SPOTIFY_HOST = 'spotify23.p.rapidapi.com';

/**
 * Spotify23 API client (via RapidAPI)
 * Provides rich metadata including 30s previews, album art, popularity scores.
 * Endpoints: GET /search, GET /tracks, GET /artists
 */
export const spotify23Client = {
  async searchTracks(query: string, signal?: AbortSignal): Promise<Track[]> {
    const { rapidapiKey } = useRapidApiStore.getState();
    if (!rapidapiKey) return [];

    try {
      const params = new URLSearchParams({
        q: query,
        type: 'tracks',
        offset: '0',
        limit: '10',
        numberOfTopResults: '5'
      });

      const response = await fetch(`https://${SPOTIFY_HOST}/search/?${params}`, {
        headers: {
          'X-Rapidapi-Key': rapidapiKey,
          'X-Rapidapi-Host': SPOTIFY_HOST,
        },
        signal
      });

      if (!response.ok) return [];

      const json = await response.json();
      const results: Track[] = [];

      // Spotify23 returns tracks in tracks.items array
      const items = json.tracks?.items || [];

      for (const item of items.slice(0, 15)) {
        const track = item.data || item;
        const title = track.name || track.title || '';
        const artists = track.artists?.items || track.artists || [];
        const artistName = artists[0]?.profile?.name || artists[0]?.name || 'Unknown Artist';
        const albumName = track.albumOfTrack?.name || track.album?.name || '';
        const thumbnail = track.albumOfTrack?.coverArt?.sources?.[0]?.url ||
                         track.album?.images?.[0]?.url || '';
        const duration = track.duration?.totalMilliseconds
          ? Math.floor(track.duration.totalMilliseconds / 1000)
          : track.duration_ms
            ? Math.floor(track.duration_ms / 1000)
            : 0;
        const preview = track.preview_url || '';

        if (!title) continue;

        results.push({
          id: track.id || track.uri || Math.random().toString(),
          title,
          artist: { id: 0, name: artistName },
          album: { id: 0, title: albumName },
          thumbnail,
          duration,
          source: 'spotify',
          previewUrl: preview,
          explicit: track.contentRating?.label === 'EXPLICIT' || track.explicit || false,
        });
      }

      return results;
    } catch (error) {
      console.error('Spotify23 search error:', error);
      return [];
    }
  },
};
