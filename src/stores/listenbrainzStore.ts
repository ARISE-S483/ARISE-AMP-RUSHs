import { create } from 'zustand';

interface ListenBrainzState {
  userToken: string;
  username: string;
  enabled: boolean;
  setUserToken: (token: string) => void;
  setUsername: (name: string) => void;
  setEnabled: (enabled: boolean) => void;
}

const STORAGE_KEY = 'melodies_listenbrainz';

function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* */ }
  return { userToken: '', username: '', enabled: false };
}

function saveState(state: Partial<ListenBrainzState>) {
  try {
    const current = loadState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...state }));
  } catch { /* */ }
}

export const useListenBrainzStore = create<ListenBrainzState>((set) => ({
  ...loadState(),
  setUserToken: (userToken) => { set({ userToken }); saveState({ userToken }); },
  setUsername: (username) => { set({ username }); saveState({ username }); },
  setEnabled: (enabled) => { set({ enabled }); saveState({ enabled }); },
}));

export async function submitListen(track: string, artist: string, album?: string) {
  const { userToken, enabled } = useListenBrainzStore.getState();
  if (!enabled || !userToken) return;

  try {
    const payload = {
      listen_type: 'single',
      payload: [{
        listened_at: Math.floor(Date.now() / 1000),
        track_metadata: {
          track_name: track,
          artist_name: artist,
          ...(album ? { release_name: album } : {}),
        },
      }],
    };

    await fetch('https://api.listenbrainz.org/1/submit-listens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${userToken}`,
      },
      body: JSON.stringify(payload),
    });
    console.log('[ListenBrainz] Submitted:', { track, artist, album });
  } catch (e) {
    console.error('[ListenBrainz] Submit failed:', e);
  }
}

export async function submitNowPlaying(track: string, artist: string, album?: string) {
  const { userToken, enabled } = useListenBrainzStore.getState();
  if (!enabled || !userToken) return;

  try {
    const payload = {
      listen_type: 'playing_now',
      payload: [{
        track_metadata: {
          track_name: track,
          artist_name: artist,
          ...(album ? { release_name: album } : {}),
        },
      }],
    };

    await fetch('https://api.listenbrainz.org/1/submit-listens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${userToken}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error('[ListenBrainz] Now playing failed:', e);
  }
}
