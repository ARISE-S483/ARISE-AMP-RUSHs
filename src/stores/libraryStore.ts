// Library store - favorites, recently played, local playlists
import { create } from 'zustand';
import type { Track, Playlist } from '@/api/types';

import { get as idbGet, set as idbSet } from 'idb-keyval';

interface LibraryState {
  favorites: Track[];
  recentlyPlayed: Track[];
  playlists: Playlist[];
  localTracks: Track[];
  isLoaded: boolean;
  addToFavorites: (track: Track) => void;
  removeFromFavorites: (trackId: string) => void;
  isFavorite: (trackId: string) => boolean;
  addToRecentlyPlayed: (track: Track) => void;
  createPlaylist: (name: string) => Playlist;
  deletePlaylist: (id: string) => void;
  renamePlaylist: (id: string, name: string) => void;
  addToPlaylist: (playlistId: string, track: Track) => void;
  removeFromPlaylist: (playlistId: string, trackId: string) => void;
  addLocalTracks: (tracks: Track[]) => void;
  removeLocalTrack: (trackId: string) => void;
  clearLocalTracks: () => void;
}

function saveToStorage(key: string, data: unknown) {
  idbSet(key, data).catch(console.error);
  
  // Broadcast update if sync is active
  import('./syncStore').then(({ useSyncStore }) => {
    const store = useSyncStore.getState();
    if (store.status === 'connected') {
      if (key === 'melodies_favorites') {
        store.broadcastState({ type: 'SYNC_STATE', payload: { favorites: data as any } });
      } else if (key === 'melodies_playlists') {
        store.broadcastState({ type: 'SYNC_STATE', payload: { playlists: data as any } });
      }
    }
  }).catch(() => {});
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  favorites: [],
  recentlyPlayed: [],
  playlists: [],
  localTracks: [],
  isLoaded: false,

  addToFavorites: (track) => {
    const { favorites } = get();
    if (favorites.some(t => String(t.id) === String(track.id))) return;
    const updated = [track, ...favorites];
    set({ favorites: updated });
    saveToStorage('melodies_favorites', updated);
  },

  removeFromFavorites: (trackId) => {
    const updated = get().favorites.filter(t => String(t.id) !== trackId);
    set({ favorites: updated });
    saveToStorage('melodies_favorites', updated);
  },

  isFavorite: (trackId) => get().favorites.some(t => String(t.id) === trackId),

  addToRecentlyPlayed: (track) => {
    const { recentlyPlayed } = get();
    const filtered = recentlyPlayed.filter(t => String(t.id) !== String(track.id));
    const updated = [track, ...filtered].slice(0, 50);
    set({ recentlyPlayed: updated });
    saveToStorage('melodies_recent', updated);
  },

  createPlaylist: (name) => {
    const playlist: Playlist = {
      id: `local_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      title: name,
      thumbnail: '',
      trackCount: 0,
      tracks: [],
      isLocal: true,
    };
    const updated = [...get().playlists, playlist];
    set({ playlists: updated });
    saveToStorage('melodies_playlists', updated);
    return playlist;
  },

  deletePlaylist: (id) => {
    const updated = get().playlists.filter(p => String(p.id) !== id);
    set({ playlists: updated });
    saveToStorage('melodies_playlists', updated);
  },

  renamePlaylist: (id, name) => {
    const updated = get().playlists.map(p => String(p.id) === id ? { ...p, title: name } : p);
    set({ playlists: updated });
    saveToStorage('melodies_playlists', updated);
  },

  addToPlaylist: (playlistId, track) => {
    const updated = get().playlists.map(p => {
      if (String(p.id) !== playlistId) return p;
      if (p.tracks?.some(t => String(t.id) === String(track.id))) return p;
      const tracks = [...(p.tracks || []), track];
      return { ...p, tracks, trackCount: tracks.length, thumbnail: p.thumbnail || track.thumbnail || '' };
    });
    set({ playlists: updated });
    saveToStorage('melodies_playlists', updated);
  },

  removeFromPlaylist: (playlistId, trackId) => {
    const updated = get().playlists.map(p => {
      if (String(p.id) !== playlistId) return p;
      const tracks = (p.tracks || []).filter(t => String(t.id) !== trackId);
      return { ...p, tracks, trackCount: tracks.length };
    });
    set({ playlists: updated });
    saveToStorage('melodies_playlists', updated);
  },

  addLocalTracks: (newTracks) => {
    const { localTracks } = get();
    // Deduplicate by title + artist
    const existing = new Set(localTracks.map(t => `${t.title}_${t.artist.name}`));
    const toAdd = newTracks.filter(t => !existing.has(`${t.title}_${t.artist.name}`));
    const updated = [...localTracks, ...toAdd];
    set({ localTracks: updated });
    saveToStorage('melodies_local_tracks', updated);
  },

  removeLocalTrack: (trackId) => {
    const updated = get().localTracks.filter(t => String(t.id) !== trackId);
    set({ localTracks: updated });
    saveToStorage('melodies_local_tracks', updated);
  },

  clearLocalTracks: () => {
    set({ localTracks: [] });
    saveToStorage('melodies_local_tracks', []);
  },
}));

export function addToRecentlyPlayed(track: Track) {
  useLibraryStore.getState().addToRecentlyPlayed(track);
}

// Initialize and migrate data from localStorage to IndexedDB
async function initStore() {
  const keys = ['melodies_favorites', 'melodies_recent', 'melodies_playlists', 'melodies_local_tracks'];
  const state: any = {};
  
  for (const key of keys) {
    let data = await idbGet(key);
    
    // Migration logic
    if (!data) {
      const lsData = localStorage.getItem(key);
      if (lsData) {
        try {
          data = JSON.parse(lsData);
          await idbSet(key, data);
          // localStorage.removeItem(key); // keep for a while just in case
        } catch { /* parse error */ }
      }
    }
    
    state[key] = data || [];
  }
  
  useLibraryStore.setState({
    favorites: state.melodies_favorites,
    recentlyPlayed: state.melodies_recent,
    playlists: state.melodies_playlists,
    localTracks: state.melodies_local_tracks,
    isLoaded: true
  });
}

initStore();
