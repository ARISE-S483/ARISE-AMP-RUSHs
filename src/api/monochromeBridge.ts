// @ts-nocheck
import { MusicAPI } from '../monochrome-legacy/js/music-api.js';
import type { SearchResults, Track, Album, Artist } from './types';

let isInitialized = false;

async function ensureInitialized() {
  if (!isInitialized) {
    if (!MusicAPI.instance) {
      await MusicAPI.initialize({});
    }
    isInitialized = true;
  }
}

export async function monoSearch(query: string): Promise<SearchResults> {
  await ensureInitialized();
  const api = MusicAPI.instance;
  const res = await api.search(query);
  
  // Adapt to ARISE-AMP-RUSH2 types
  return {
    tracks: res.tracks?.map(t => ({
      id: String(t.id),
      title: t.title,
      artist: t.artists?.map(a => a.name).join(', ') || 'Unknown Artist',
      album: t.album?.title || '',
      coverUrl: api.getCoverUrl(t),
      duration: t.duration,
      provider: 'monochrome'
    })) || [],
    albums: res.albums?.map(a => ({
      id: String(a.id),
      title: a.title,
      artist: a.artists?.map(ar => ar.name).join(', ') || 'Unknown Artist',
      coverUrl: api.getCoverUrl(a),
      provider: 'monochrome'
    })) || [],
    artists: res.artists?.map(a => ({
      id: String(a.id),
      name: a.name,
      imageUrl: api.getCoverUrl(a),
      provider: 'monochrome'
    })) || []
  };
}

export async function monoGetTrack(id: string): Promise<Track> {
  await ensureInitialized();
  const api = MusicAPI.instance;
  const t = await api.getTrack(id);
  
  return {
    id: String(t.id),
    title: t.title,
    artist: t.artists?.map(a => a.name).join(', ') || 'Unknown Artist',
    album: t.album?.title || '',
    coverUrl: api.getCoverUrl(t),
    duration: t.duration,
    streamUrl: '', // This needs to be fetched when playing
    provider: 'monochrome'
  };
}

export async function monoGetAlbum(id: string): Promise<Album> {
  await ensureInitialized();
  const api = MusicAPI.instance;
  const a = await api.getAlbum(id);
  
  return {
    id: String(a.id),
    title: a.title,
    artist: a.artists?.map(ar => ar.name).join(', ') || 'Unknown Artist',
    coverUrl: api.getCoverUrl(a),
    year: a.releaseDate ? a.releaseDate.substring(0, 4) : undefined,
    tracks: a.tracks?.map(t => ({
      id: String(t.id),
      title: t.title,
      artist: t.artists?.map(ar => ar.name).join(', ') || 'Unknown Artist',
      album: a.title,
      coverUrl: api.getCoverUrl(a),
      duration: t.duration,
      provider: 'monochrome'
    })) || [],
    provider: 'monochrome'
  };
}
