import { useRapidApiStore } from '@/stores/rapidapiStore';

const MUSIXMATCH_HOST = 'musixmatch-lyrics-songs.p.rapidapi.com';

interface MusixmatchLyricLine {
  text: string;
  time: {
    total: number;
    minutes: number;
    seconds: number;
    hundredths: number;
  };
}

interface MusixmatchResponse {
  success: boolean;
  code: number;
  lyrics?: MusixmatchLyricLine[];
  plain_lyrics?: string;
  track_id_spotify?: string;
}

/**
 * Musixmatch Lyrics client (via RapidAPI)
 * Provides synced lyrics with precise timestamps for karaoke-style display.
 * Endpoint: GET /songs/lyrics?t={title}&a={artist}
 */
export const musixmatchClient = {
  async getLyrics(
    title: string,
    artist: string,
  ): Promise<{ lines: { time: number; text: string }[]; synced: boolean; source: string } | null> {
    const { rapidapiKey } = useRapidApiStore.getState();
    if (!rapidapiKey) return null;

    try {
      const params = new URLSearchParams({ t: title, a: artist });
      const response = await fetch(
        `https://${MUSIXMATCH_HOST}/songs/lyrics?${params}`,
        {
          headers: {
            'X-Rapidapi-Key': rapidapiKey,
            'X-Rapidapi-Host': MUSIXMATCH_HOST,
          },
        }
      );

      if (!response.ok) return null;

      const data: MusixmatchResponse = await response.json();
      if (!data.success) return null;

      // Synced lyrics with timestamps
      if (data.lyrics && Array.isArray(data.lyrics) && data.lyrics.length > 0) {
        const lines = data.lyrics.map((line) => ({
          time: line.time.total,
          text: line.text,
        }));

        return { lines, synced: true, source: 'Musixmatch' };
      }

      // Fallback: plain lyrics without timestamps
      if (data.plain_lyrics) {
        const lines = data.plain_lyrics
          .split('\n')
          .filter((l) => l.trim())
          .map((text, i) => ({ time: i * 3, text: text.trim() }));

        return { lines, synced: false, source: 'Musixmatch' };
      }

      return null;
    } catch (error) {
      console.error('Musixmatch lyrics error:', error);
      return null;
    }
  },

  /**
   * Get lyrics by Spotify track ID
   */
  async getLyricsBySpotifyId(
    spotifyTrackId: string,
  ): Promise<{ lines: { time: number; text: string }[]; synced: boolean; source: string } | null> {
    const { rapidapiKey } = useRapidApiStore.getState();
    if (!rapidapiKey) return null;

    try {
      const response = await fetch(
        `https://${MUSIXMATCH_HOST}/songs/lyrics/spotify?track_id=${encodeURIComponent(spotifyTrackId)}`,
        {
          headers: {
            'X-Rapidapi-Key': rapidapiKey,
            'X-Rapidapi-Host': MUSIXMATCH_HOST,
          },
        }
      );

      if (!response.ok) return null;

      const data: MusixmatchResponse = await response.json();
      if (!data.success || !data.lyrics) return null;

      const lines = data.lyrics.map((line) => ({
        time: line.time.total,
        text: line.text,
      }));

      return { lines, synced: true, source: 'Musixmatch' };
    } catch {
      return null;
    }
  },
};
