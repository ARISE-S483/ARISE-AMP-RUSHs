import { create } from 'zustand';

interface SpotifyState {
  clientId: string;
  clientSecret: string;
  setClientId: (id: string) => void;
  setClientSecret: (secret: string) => void;
}

const STORAGE_KEY = 'melodies_spotify';

function loadSpotify() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* */ }
  return { clientId: '', clientSecret: '' };
}

function saveSpotify(state: Partial<SpotifyState>) {
  try {
    const current = loadSpotify();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...state }));
  } catch { /* */ }
}

export const useSpotifyStore = create<SpotifyState>((set) => ({
  ...loadSpotify(),
  setClientId: (clientId) => { set({ clientId }); saveSpotify({ clientId }); },
  setClientSecret: (clientSecret) => { set({ clientSecret }); saveSpotify({ clientSecret }); },
}));
