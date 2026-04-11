import { useRapidApiStore } from '@/stores/rapidapiStore';

const GENIUS_HOST = 'genius-song-lyrics1.p.rapidapi.com';

interface GeniusLyrics {
  lines: { time: number; text: string }[];
  synced: boolean;
  source: string;
}

/**
 * Genius Song Lyrics client (via RapidAPI)
 * Provides rich song metadata, artist info, and lyrics annotations.
 * Endpoints: GET /search, GET /song/details, GET /song/lyrics
 */
export const geniusClient = {
  /**
   * Search for songs on Genius
   */
  async search(query: string): Promise<Array<{
    id: number;
    title: string;
    artist: string;
    thumbnail: string;
    url: string;
  }>> {
    const { rapidapiKey } = useRapidApiStore.getState();
    if (!rapidapiKey) return [];

    try {
      const params = new URLSearchParams({ q: query, per_page: '10', page: '1' });
      const response = await fetch(`https://${GENIUS_HOST}/search/?${params}`, {
        headers: {
          'X-Rapidapi-Key': rapidapiKey,
          'X-Rapidapi-Host': GENIUS_HOST,
        },
      });

      if (!response.ok) return [];

      const json = await response.json();
      const hits = json.hits || [];

      return hits.map((hit: any) => ({
        id: hit.result?.id || 0,
        title: hit.result?.title || '',
        artist: hit.result?.primary_artist?.name || 'Unknown',
        thumbnail: hit.result?.song_art_image_thumbnail_url || '',
        url: hit.result?.url || '',
      }));
    } catch {
      return [];
    }
  },

  /**
   * Get lyrics for a song by Genius song ID
   */
  async getLyricsById(songId: number): Promise<GeniusLyrics | null> {
    const { rapidapiKey } = useRapidApiStore.getState();
    if (!rapidapiKey) return null;

    try {
      const response = await fetch(`https://${GENIUS_HOST}/song/lyrics/?id=${songId}`, {
        headers: {
          'X-Rapidapi-Key': rapidapiKey,
          'X-Rapidapi-Host': GENIUS_HOST,
        },
      });

      if (!response.ok) return null;

      const json = await response.json();
      const lyricsData = json.lyrics?.lyrics?.body?.plain || json.lyrics?.plain || '';

      if (!lyricsData) return null;

      const lines = lyricsData
        .split('\n')
        .filter((l: string) => l.trim())
        .map((text: string, i: number) => ({ time: i * 3, text: text.trim() }));

      return { lines, synced: false, source: 'Genius' };
    } catch {
      return null;
    }
  },

  /**
   * Search and get lyrics by title + artist
   */
  async getLyrics(title: string, artist: string): Promise<GeniusLyrics | null> {
    try {
      const results = await this.search(`${title} ${artist}`);
      if (results.length === 0) return null;

      // Find best match
      const match = results.find(r =>
        r.title.toLowerCase().includes(title.toLowerCase()) ||
        title.toLowerCase().includes(r.title.toLowerCase())
      ) || results[0];

      return await this.getLyricsById(match.id);
    } catch {
      return null;
    }
  },
};
