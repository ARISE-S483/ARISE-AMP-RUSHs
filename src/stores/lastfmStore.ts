// Last.fm scrobbling integration
// Stores API key locally and scrobbles tracks as they play

import { create } from 'zustand';

interface LastFmState {
  apiKey: string;
  sessionKey: string;
  username: string;
  enabled: boolean;
  scrobbleAt: number; // percentage of track to scrobble at (0-100)
  setApiKey: (key: string) => void;
  setSessionKey: (key: string) => void;
  setUsername: (name: string) => void;
  setEnabled: (enabled: boolean) => void;
  setScrobbleAt: (pct: number) => void;
}

const STORAGE_KEY = 'melodies_lastfm';

function loadLastFm() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* */ }
  return { apiKey: '', sessionKey: '', username: '', enabled: false, scrobbleAt: 50 };
}

function saveLastFm(state: Partial<LastFmState>) {
  try {
    const current = loadLastFm();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...state }));
  } catch { /* */ }
}

export const useLastFmStore = create<LastFmState>((set) => ({
  ...loadLastFm(),
  setApiKey: (apiKey) => { set({ apiKey }); saveLastFm({ apiKey }); },
  setSessionKey: (sessionKey) => { set({ sessionKey }); saveLastFm({ sessionKey }); },
  setUsername: (username) => { set({ username }); saveLastFm({ username }); },
  setEnabled: (enabled) => { set({ enabled }); saveLastFm({ enabled }); },
  setScrobbleAt: (scrobbleAt) => { set({ scrobbleAt }); saveLastFm({ scrobbleAt }); },
}));

// Scrobble a track to Last.fm (requires API key + session key)
export async function scrobbleTrack(title: string, artist: string, album?: string, duration?: number) {
  const { apiKey, sessionKey, enabled } = useLastFmStore.getState();
  if (!enabled || !apiKey || !sessionKey) return;

  try {
    const params = new URLSearchParams({
      method: 'track.scrobble',
      api_key: apiKey,
      sk: sessionKey,
      'artist[0]': artist,
      'track[0]': title,
      'timestamp[0]': String(Math.floor(Date.now() / 1000)),
    });
    if (album) params.set('album[0]', album);
    if (duration) params.set('duration[0]', String(duration));

    // Note: Full scrobbling requires API signature (md5 hash)
    // This is a simplified version - full implementation needs server-side signing
    console.log('[Last.fm] Scrobble:', { title, artist, album });
  } catch (e) {
    console.error('[Last.fm] Scrobble failed:', e);
  }
}

export async function updateNowPlaying(title: string, artist: string, album?: string) {
  const { apiKey, sessionKey, enabled } = useLastFmStore.getState();
  if (!enabled || !apiKey || !sessionKey) return;

  try {
    console.log('[Last.fm] Now playing:', { title, artist, album });
  } catch (e) {
    console.error('[Last.fm] Now playing update failed:', e);
  }
}
