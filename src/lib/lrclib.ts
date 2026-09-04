// LRCLIB client for synchronized line-by-line lyrics (limusic parity)
export interface LyricLine {
  time: number; // in seconds
  text: string;
}

export interface LRCLyricsResponse {
  lines: LyricLine[];
  synced: boolean;
  source: 'lrclib' | 'ytmusic' | 'plain';
}

export function parseLrcLyrics(lrc: string): LyricLine[] {
  if (!lrc) return [];
  const lines: LyricLine[] = [];
  const lrcRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\](.*)/;

  const rawLines = lrc.split('\n');
  for (const raw of rawLines) {
    const match = raw.match(lrcRegex);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const millisStr = match[3] || '0';
      const millis = millisStr.length === 2 ? parseInt(millisStr, 10) * 10 : parseInt(millisStr, 10);
      const time = minutes * 60 + seconds + millis / 1000;
      const text = match[4].trim();
      if (text) {
        lines.push({ time, text });
      }
    }
  }

  return lines.sort((a, b) => a.time - b.time);
}

export async function fetchLrcLibLyrics(
  title: string,
  artist: string,
  album?: string,
  duration?: number
): Promise<LRCLyricsResponse | null> {
  try {
    const params = new URLSearchParams({
      track_name: title,
      artist_name: artist,
    });
    if (album) params.set('album_name', album);
    if (duration && duration > 0) params.set('duration', String(Math.round(duration)));

    const res = await fetch(`https://lrclib.net/api/get?${params.toString()}`, {
      headers: {
        'User-Agent': 'Melodies-Limusic-Client/1.0',
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return null;
    const data = await res.json();

    if (data.syncedLyrics) {
      const parsed = parseLrcLyrics(data.syncedLyrics);
      if (parsed.length > 0) {
        return { lines: parsed, synced: true, source: 'lrclib' };
      }
    }

    if (data.plainLyrics) {
      const plain = data.plainLyrics
        .split('\n')
        .map((line: string, i: number) => ({ time: i * 4, text: line.trim() }))
        .filter((l: { text: string }) => l.text.length > 0);
      return { lines: plain, synced: false, source: 'lrclib' };
    }

    return null;
  } catch {
    return null;
  }
}
