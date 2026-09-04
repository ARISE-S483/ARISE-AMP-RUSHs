import { musicAPI } from '@/api/musicAPI';
import type { Track } from '@/api/types';
import { useSpotifyStore } from '@/stores/spotifyStore';

export type ImportSource = 'youtube' | 'spotify' | 'apple' | 'tidal' | 'unknown';

export interface ImportProgress {
  total: number;
  matched: number;
  current: number;
  status: 'parsing' | 'matching' | 'done' | 'error';
  error?: string;
  playlistName?: string;
}

type ProgressCallback = (progress: ImportProgress) => void;

/** Detect platform from URL */
export function detectSource(url: string): ImportSource {
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
  if (/spotify\.com/i.test(url)) return 'spotify';
  if (/music\.apple\.com/i.test(url)) return 'apple';
  if (/tidal\.com/i.test(url)) return 'tidal';
  return 'unknown';
}

/** Extract playlist ID from various URL formats */
function extractPlaylistId(url: string, source: ImportSource): string | null {
  switch (source) {
    case 'youtube': {
      const match = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
      return match ? match[1] : null;
    }
    case 'spotify': {
      const match = url.match(/playlist\/([a-zA-Z0-9]+)/);
      return match ? match[1] : null;
    }
    case 'apple': {
      const match = url.match(/playlist\/[^/]+\/pl\.([a-zA-Z0-9-]+)/);
      return match ? `pl.${match[1]}` : null;
    }
    case 'tidal': {
      const match = url.match(/playlist\/([a-f0-9-]+)/i);
      return match ? match[1] : null;
    }
    default:
      return null;
  }
}

/** Search-match a track title+artist on TIDAL */
async function matchTrack(title: string, artist?: string): Promise<Track | null> {
  const query = artist ? `${artist} ${title}` : title;
  try {
    const results = await musicAPI.searchTracks(query);
    return results.length > 0 ? results[0] : null;
  } catch {
    return null;
  }
}

/** Import from YouTube via native InnerTube API */
async function importYouTube(playlistId: string, onProgress: ProgressCallback): Promise<{ name: string; tracks: Track[] }> {
  onProgress({ total: 1, matched: 0, current: 0, status: 'parsing', playlistName: 'Fetching playlist...' });

  const playlist = await musicAPI.getPlaylist(playlistId);
  if (!playlist || !playlist.tracks) {
    throw new Error('Could not fetch YouTube playlist');
  }

  const name = playlist.title || 'YouTube Import';
  const playlistTracks = playlist.tracks;

  onProgress({ total: playlistTracks.length, matched: playlistTracks.length, current: playlistTracks.length, status: 'done', playlistName: name });

  return { name, tracks: playlistTracks };
}

/** Import from Spotify via Official API */
async function importSpotify(playlistId: string, onProgress: ProgressCallback): Promise<{ name: string; tracks: Track[] }> {
  const { clientId, clientSecret } = useSpotifyStore.getState();

  if (!clientId || !clientSecret) {
    onProgress({ total: 0, matched: 0, current: 0, status: 'error', error: 'Please enter your Spotify Client ID and Secret in Settings -> Integrations to enable Spotify imports.' });
    throw new Error('Spotify API credentials required.');
  }

  onProgress({ total: 0, matched: 0, current: 0, status: 'parsing', playlistName: 'Authenticating...' });

  // 1. Get access token
  const authString = btoa(`${clientId.trim()}:${clientSecret.trim()}`);
  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  if (!tokenRes.ok) {
    onProgress({ total: 0, matched: 0, current: 0, status: 'error', error: 'Failed to authenticate with Spotify API. Please check your Client ID and Secret in Settings.' });
    throw new Error('Invalid Spotify credentials or API error.');
  }
  const tokenData = await tokenRes.json();
  const token = tokenData.access_token;

  onProgress({ total: 0, matched: 0, current: 0, status: 'parsing', playlistName: 'Fetching playlist...' });

  // 2. Fetch Playlist details (limit 100 for simplicity without pagination, or could loop)
  const plRes = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  // Get name as well
  const plMetaRes = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}?fields=name`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!plRes.ok || !plMetaRes.ok) {
    onProgress({ total: 0, matched: 0, current: 0, status: 'error', error: 'Failed to fetch Spotify playlist. Ensure it is public or not broken.' });
    throw new Error('Failed to fetch Spotify playlist metadata.');
  }

  const plData = await plRes.json();
  const plMeta = await plMetaRes.json();
  const playlistName = plMeta.name || 'Spotify Import';
  const items = plData.items || [];

  onProgress({ total: items.length, matched: 0, current: 0, status: 'matching', playlistName });

  const tracks: Track[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.track) continue;
    const streamTitle = item.track.name;
    const uploaderName = item.track.artists?.[0]?.name || '';

    const matched = await matchTrack(streamTitle, uploaderName);
    if (matched) tracks.push(matched);

    onProgress({ total: items.length, matched: tracks.length, current: i + 1, status: 'matching', playlistName });
  }

  return { name: playlistName, tracks };
}

/** Import from TIDAL directly */
async function importTidal(playlistId: string, onProgress: ProgressCallback): Promise<{ name: string; tracks: Track[] }> {
  onProgress({ total: 0, matched: 0, current: 0, status: 'parsing', playlistName: 'TIDAL Playlist' });

  const result = await musicAPI.getPlaylist(playlistId);
  if (!result || !result.tracks.length) throw new Error('Could not load TIDAL playlist');

  onProgress({ total: result.tracks.length, matched: result.tracks.length, current: result.tracks.length, status: 'done', playlistName: result.playlist.title });

  return { name: result.playlist.title, tracks: result.tracks };
}

/** Main import function — auto-detects source */
export async function importPlaylist(
  url: string,
  onProgress: ProgressCallback
): Promise<{ name: string; tracks: Track[] }> {
  const source = detectSource(url);

  if (source === 'unknown') {
    // Try as raw TIDAL playlist ID
    const uuidMatch = url.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
    if (uuidMatch) {
      return importTidal(uuidMatch[1], onProgress);
    }
    throw new Error('Unrecognized URL format. Supported: YouTube, Spotify, TIDAL');
  }

  const playlistId = extractPlaylistId(url, source);
  if (!playlistId) throw new Error(`Could not extract playlist ID from ${source} URL`);

  switch (source) {
    case 'youtube': return importYouTube(playlistId, onProgress);
    case 'spotify': return importSpotify(playlistId, onProgress);
    case 'tidal': return importTidal(playlistId, onProgress);
    case 'apple': {
      onProgress({ total: 0, matched: 0, current: 0, status: 'error', error: 'Apple Music import is not yet supported. Try a YouTube or TIDAL playlist URL.' });
      return { name: 'Apple Music Import', tracks: [] };
    }
    default:
      throw new Error('Unsupported platform');
  }
}
