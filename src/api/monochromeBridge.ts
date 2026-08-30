// @ts-nocheck
// Monochrome Bridge - Wraps legacy MusicAPI for React consumption
// All music functions route through monochrome's unified API

import { MusicAPI } from '../monochrome-legacy/js/music-api.js';
import { apiSettings } from '../monochrome-legacy/js/storage.js';
import { HiFiClient } from '../monochrome-legacy/js/HiFi';
import { SubsonicClient } from './subsonicClient';
import type { SearchResults, Track, Album, Artist, Playlist, Lyrics } from './types';

// Helper to get subsonic instances from localStorage
function getSubsonicInstances(): any[] {
  try {
    const stored = localStorage.getItem('melodies_instances');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.filter((i: any) => i.type === 'subsonic' && i.enabled);
    }
  } catch { }
  return [];
}

let activeSubsonicClient: SubsonicClient | null = null;
function getSubsonicClient(): SubsonicClient | null {
  if (activeSubsonicClient) return activeSubsonicClient;
  const instances = getSubsonicInstances();
  if (instances.length > 0) {
    const sub = instances[0];
    activeSubsonicClient = new SubsonicClient({
      url: sub.url,
      username: sub.username || '',
      password: sub.password || ''
    });
    return activeSubsonicClient;
  }
  return null;
}

// ─── Subsonic Adapters ───
function adaptSubsonicTrack(t: any, client: SubsonicClient): Track {
  if (!t) return null as any;
  const coverUrl = client.getCoverUrl(t.coverArt || t.id);
  return {
    id: t.id,
    title: t.title || 'Unknown Track',
    artist: { id: t.artistId || 0, name: t.artist || 'Unknown Artist' },
    artists: [{ id: t.artistId || 0, name: t.artist || 'Unknown Artist' }],
    album: t.album ? {
      id: t.albumId || 0,
      title: t.album,
      cover: coverUrl,
      releaseDate: t.year ? t.year.toString() : '',
    } : undefined,
    duration: t.duration || 0,
    audioQuality: t.suffix === 'flac' ? 'LOSSLESS' : 'HIGH',
    trackNumber: t.track || 0,
    popularity: 0,
    type: 'track',
    explicit: false,
    thumbnail: coverUrl,
    thumbnailLarge: coverUrl,
    source: 'subsonic',
    streamUrl: client.getStreamUrl(t.id)
  };
}

function adaptSubsonicAlbum(a: any, client: SubsonicClient): Album {
  if (!a) return null as any;
  const coverUrl = client.getCoverUrl(a.coverArt || a.id);
  return {
    id: a.id,
    title: a.title || 'Unknown Album',
    artist: { id: a.artistId || 0, name: a.artist || 'Unknown Artist' },
    artists: [{ id: a.artistId || 0, name: a.artist || 'Unknown Artist' }],
    cover: coverUrl,
    releaseDate: a.year ? a.year.toString() : '',
    numberOfTracks: a.songCount || 0,
    duration: a.duration || 0,
    type: 'ALBUM',
    explicit: false,
    thumbnail: coverUrl,
    thumbnailLarge: coverUrl,
    tracks: a.song ? a.song.map((t: any) => adaptSubsonicTrack(t, client)) : []
  };
}

function adaptSubsonicArtist(a: any, client: SubsonicClient): Artist {
  if (!a) return null as any;
  const coverUrl = client.getCoverUrl(a.coverArt || a.id);
  return {
    id: a.id,
    name: a.name || 'Unknown Artist',
    picture: coverUrl,
    thumbnail: coverUrl,
    thumbnailLarge: coverUrl,
    description: '',
    albums: a.album ? a.album.map((al: any) => adaptSubsonicAlbum(al, client)) : [],
    tracks: [],
    videos: []
  };
}

function adaptSubsonicPlaylist(p: any, client: SubsonicClient): Playlist {
  if (!p) return null as any;
  const coverUrl = client.getCoverUrl(p.coverArt || p.id);
  return {
    id: p.id,
    title: p.name || 'Unknown Playlist',
    thumbnail: coverUrl,
    trackCount: p.songCount || 0,
    tracks: p.entry ? p.entry.map((t: any) => adaptSubsonicTrack(t, client)) : [],
    description: p.comment || '',
    creator: p.owner || '',
    numberOfTracks: p.songCount || 0,
    image: coverUrl
  };
}

const MONOCHROME_API_INSTANCES = [
  "https://eu-central.monochrome.tf",
  "https://us-west.monochrome.tf",
  "https://arran.monochrome.tf",
  "https://api.monochrome.tf/",
  "https://monochrome-api.samidy.com",
  "https://triton.squid.wtf",
  "https://wolf.qqdl.site",
  "https://maus.qqdl.site",
  "https://vogel.qqdl.site",
  "https://hund.qqdl.site",
  "https://katze.qqdl.site",
  "https://tidal.qqdl.site",
  "https://tidal.kinoplus.online"
];

const MONOCHROME_STREAMING_INSTANCES = [
  "https://arran.monochrome.tf",
  "https://triton.squid.wtf",
  "https://wolf.qqdl.site",
  "https://maus.qqdl.site",
  "https://vogel.qqdl.site",
  "https://katze.qqdl.site",
  "https://hund.qqdl.site",
  "https://tidal.qqdl.site",
  "https://hifi.p1nkhamster.xyz/"
];

let musicApiInstance: MusicAPI | null = null;
let isInitialized = false;

async function ensureInitialized() {
  if (!isInitialized) {
    apiSettings.defaultInstances = {
      api: MONOCHROME_API_INSTANCES.map(url => ({ url, isUser: false })),
      streaming: MONOCHROME_STREAMING_INSTANCES.map(url => ({ url, isUser: false })),
    };
    
    apiSettings.instancesLoaded = true;

    try {
        await HiFiClient.initialize({
            storage: [localStorage],
            token: localStorage.getItem('hifi_token') || undefined,
            tokenExpiry: parseInt(localStorage.getItem('hifi_token_expiry') || '0'),
        });
    } catch (err) {
        console.error('Failed to initialize HiFiClient:', err);
    }

    if (!MusicAPI.instance) {
      try {
        await MusicAPI.initialize(apiSettings);
      } catch {
        // Already initialized
      }
    }
    isInitialized = true;
  }
  return MusicAPI.instance;
}

// ─── Helper: Adapt monochrome track → ARISE Track type ───
function adaptTrack(t: any, api: any): Track {
  if (!t) return null;
  const artistName = t.artists?.map((a: any) => a.name).join(', ') || t.artist?.name || 'Unknown Artist';
  const artistId = t.artists?.[0]?.id || t.artist?.id || 0;
  
  // Get cover URL from the API
  let thumbnail = '';
  let thumbnailLarge = '';
  try {
    thumbnail = api.getCoverUrl(t, '320') || '';
    thumbnailLarge = api.getCoverUrl(t, '1280') || '';
  } catch {
    thumbnail = t.cover || t.thumbnail || '';
    thumbnailLarge = thumbnail;
  }

  return {
    id: t.id,
    title: t.title || 'Unknown Track',
    artist: { id: artistId, name: artistName },
    artists: t.artists?.map((a: any) => ({ id: a.id || 0, name: a.name || 'Unknown' })) || [{ id: artistId, name: artistName }],
    album: t.album ? {
      id: t.album.id || 0,
      title: t.album.title || '',
      cover: t.album.cover || '',
      releaseDate: t.album.releaseDate || '',
    } : undefined,
    duration: t.duration || 0,
    audioQuality: t.audioQuality || '',
    trackNumber: t.trackNumber || 0,
    popularity: t.popularity || 0,
    type: 'track',
    explicit: t.explicit || false,
    thumbnail,
    thumbnailLarge,
    source: 'tidal',
    streamUrl: t.streamUrl || '',
  };
}

// ─── Helper: Adapt monochrome album → ARISE Album type ───
function adaptAlbum(a: any, api: any): Album {
  if (!a) return null;
  const artistName = a.artists?.map((ar: any) => ar.name).join(', ') || a.artist?.name || 'Unknown Artist';
  const artistId = a.artists?.[0]?.id || a.artist?.id || 0;

  let thumbnail = '';
  try {
    thumbnail = api.getCoverUrl(a, '640') || '';
  } catch {
    thumbnail = a.cover || a.thumbnail || '';
  }

  return {
    id: a.id,
    title: a.title || 'Unknown Album',
    artist: { id: artistId, name: artistName },
    artists: a.artists?.map((ar: any) => ({ id: ar.id || 0, name: ar.name || 'Unknown' })),
    cover: a.cover || '',
    releaseDate: a.releaseDate || '',
    numberOfTracks: a.numberOfTracks || a.tracks?.length || 0,
    duration: a.duration || 0,
    type: a.type || 'ALBUM',
    explicit: a.explicit || false,
    thumbnail,
    thumbnailLarge: thumbnail,
    tracks: a.tracks?.map((t: any) => adaptTrack(t, api)) || [],
  };
}

// ─── Helper: Adapt monochrome artist → ARISE Artist type ───
function adaptArtist(a: any, api: any): Artist {
  if (!a) return null;
  let thumbnail = '';
  try {
    thumbnail = api.getArtistPictureUrl(a, '320') || '';
  } catch {
    thumbnail = a.picture || a.thumbnail || '';
  }

  return {
    id: a.id,
    name: a.name || 'Unknown Artist',
    picture: a.picture || '',
    thumbnail,
    thumbnailLarge: thumbnail,
    description: a.biography || a.description || '',
    albums: a.albums?.map((al: any) => adaptAlbum(al, api)) || [],
    tracks: a.topTracks?.map((t: any) => adaptTrack(t, api)) || a.tracks?.map((t: any) => adaptTrack(t, api)) || [],
    videos: a.videos?.map((v: any) => adaptTrack(v, api)) || [],
  };
}

// ─── Helper: Adapt monochrome playlist → ARISE Playlist type ───
function adaptPlaylist(p: any, api: any): Playlist {
  if (!p) return null;
  let thumbnail = '';
  try {
    thumbnail = api.getCoverUrl(p, '640') || '';
  } catch {
    thumbnail = p.image || p.thumbnail || '';
  }

  return {
    id: p.uuid || p.id || '',
    title: p.title || 'Unknown Playlist',
    thumbnail,
    trackCount: p.numberOfTracks || p.tracks?.length || 0,
    tracks: p.tracks?.map((t: any) => adaptTrack(t, api)) || [],
    description: p.description || '',
    creator: p.creator?.name || '',
    numberOfTracks: p.numberOfTracks || 0,
    image: thumbnail,
  };
}

// ════════════════════════════════════════════
//  PUBLIC BRIDGE FUNCTIONS
// ════════════════════════════════════════════

// ─── Search ───
export async function monoSearch(query: string): Promise<SearchResults> {
  const subClient = getSubsonicClient();
  if (subClient) {
    try {
      const res = await subClient.search(query);
      return {
        tracks: (res.song || []).map((t: any) => adaptSubsonicTrack(t, subClient)),
        albums: (res.album || []).map((a: any) => adaptSubsonicAlbum(a, subClient)),
        artists: (res.artist || []).map((a: any) => adaptSubsonicArtist(a, subClient)),
        playlists: [],
        videos: []
      };
    } catch (e) {
      console.warn("Subsonic search failed, falling back", e);
    }
  }

  const api = await ensureInitialized();
  const res = await api.search(query);

  return {
    tracks: (res.tracks?.items || res.tracks || []).map((t: any) => adaptTrack(t, api)),
    albums: (res.albums?.items || res.albums || []).map((a: any) => adaptAlbum(a, api)),
    artists: (res.artists?.items || res.artists || []).map((a: any) => adaptArtist(a, api)),
    playlists: (res.playlists?.items || res.playlists || []).map((p: any) => adaptPlaylist(p, api)),
    videos: (res.videos?.items || res.videos || []).map((v: any) => adaptTrack(v, api)),
  };
}

export async function monoSearchTracks(query: string): Promise<Track[]> {
  const subClient = getSubsonicClient();
  if (subClient) {
    try {
      const res = await subClient.search(query);
      return (res.song || []).map((t: any) => adaptSubsonicTrack(t, subClient));
    } catch {}
  }
  const api = await ensureInitialized();
  const res = await api.searchTracks(query);
  const items = res?.items || res || [];
  return items.map((t: any) => adaptTrack(t, api));
}

export async function monoSearchArtists(query: string): Promise<Artist[]> {
  const subClient = getSubsonicClient();
  if (subClient) {
    try {
      const res = await subClient.search(query);
      return (res.artist || []).map((a: any) => adaptSubsonicArtist(a, subClient));
    } catch {}
  }
  const api = await ensureInitialized();
  const res = await api.searchArtists(query);
  const items = res?.items || res || [];
  return items.map((a: any) => adaptArtist(a, api));
}

export async function monoSearchAlbums(query: string): Promise<Album[]> {
  const subClient = getSubsonicClient();
  if (subClient) {
    try {
      const res = await subClient.search(query);
      return (res.album || []).map((a: any) => adaptSubsonicAlbum(a, subClient));
    } catch {}
  }
  const api = await ensureInitialized();
  const res = await api.searchAlbums(query);
  const items = res?.items || res || [];
  return items.map((a: any) => adaptAlbum(a, api));
}

export async function monoSearchPlaylists(query: string): Promise<Playlist[]> {
  const api = await ensureInitialized();
  const res = await api.searchPlaylists(query);
  const items = res?.items || res || [];
  return items.map((p: any) => adaptPlaylist(p, api));
}

// ─── Get individual items ───
export async function monoGetTrack(id: string | number): Promise<Track> {
  const subClient = getSubsonicClient();
  if (subClient) {
    try {
      const t = await subClient.getTrack(id.toString());
      return adaptSubsonicTrack(t, subClient);
    } catch {}
  }
  const api = await ensureInitialized();
  const t = await api.getTrack(id);
  return adaptTrack(t, api);
}

export async function monoGetAlbum(id: string | number): Promise<Album> {
  const subClient = getSubsonicClient();
  if (subClient) {
    try {
      const a = await subClient.getAlbum(id.toString());
      return adaptSubsonicAlbum(a, subClient);
    } catch {}
  }
  const api = await ensureInitialized();
  const a = await api.getAlbum(id);
  return adaptAlbum(a, api);
}

export async function monoGetArtist(id: string | number): Promise<Artist> {
  const subClient = getSubsonicClient();
  if (subClient) {
    try {
      const a = await subClient.getArtist(id.toString());
      return adaptSubsonicArtist(a, subClient);
    } catch {}
  }
  const api = await ensureInitialized();
  const a = await api.getArtist(id);
  return adaptArtist(a, api);
}

export async function monoGetPlaylist(id: string): Promise<Playlist> {
  const subClient = getSubsonicClient();
  if (subClient) {
    try {
      const p = await subClient.getPlaylist(id);
      return adaptSubsonicPlaylist(p, subClient);
    } catch {}
  }
  const api = await ensureInitialized();
  const p = await api.getPlaylist(id);
  return adaptPlaylist(p, api);
}

// ─── Streaming ───
export async function monoGetStreamUrl(id: string | number, quality: string = 'LOSSLESS'): Promise<string | null> {
  const subClient = getSubsonicClient();
  if (subClient) {
    return subClient.getStreamUrl(id.toString());
  }

  const api = await ensureInitialized();
  const targetQuality = quality === 'AUTO' || quality === 'auto' ? 'HI_RES_LOSSLESS' : quality;

  // 1. Try unified stream URL lookup
  try {
    const result = await api.getStreamUrl(id, targetQuality);
    if (typeof result === 'string') return result;
    if (result?.url) return result.url;
    if (result?.urls?.length) return result.urls[0];
  } catch (e) {
    console.debug('[monoBridge] api.getStreamUrl attempt failed, trying manifest lookup:', e);
  }

  // 2. Try direct Tidal track manifest lookup (standard for Tidal instances)
  try {
    const trackLookup = await api.tidalAPI.getTrack(id, targetQuality);
    if (trackLookup) {
      if (trackLookup.originalTrackUrl) return trackLookup.originalTrackUrl;
      if (trackLookup.info?.manifest) {
        const manifestUrl = api.tidalAPI.extractStreamUrlFromManifest(trackLookup.info.manifest);
        if (manifestUrl) return manifestUrl;
      }
      if (trackLookup.url) return trackLookup.url;
      if (trackLookup.urls?.length) return trackLookup.urls[0];
    }
  } catch (e) {
    console.debug('[monoBridge] tidalAPI.getTrack manifest attempt failed:', e);
  }

  // 3. Try video stream URL if applicable
  try {
    const videoStreamUrl = await api.getVideoStreamUrl(id);
    if (videoStreamUrl) return videoStreamUrl;
  } catch { /* ignore */ }

  return null;
}

// ─── Recommendations ───
export async function monoGetTrackRecommendations(id: string | number): Promise<Track[]> {
  const api = await ensureInitialized();
  try {
    const recs = await api.getTrackRecommendations(id);
    const items = recs?.items || recs || [];
    return items.map((t: any) => adaptTrack(t, api));
  } catch {
    return [];
  }
}

// ─── Cover Art ───
export function monoGetCoverUrl(coverId: any, size: string = '640'): string {
  try {
    if (!isInitialized) return '';
    const api = MusicAPI.instance;
    return api.getCoverUrl(coverId, size) || '';
  } catch {
    return '';
  }
}

export function monoGetArtistPictureUrl(pictureId: any, size: string = '320'): string {
  try {
    if (!isInitialized) return '';
    const api = MusicAPI.instance;
    return api.getArtistPictureUrl(pictureId, size) || '';
  } catch {
    return '';
  }
}

// ─── Artist extras ───
export async function monoGetArtistBiography(id: string | number): Promise<string | null> {
  const api = await ensureInitialized();
  try {
    return await api.getArtistBiography(id);
  } catch {
    return null;
  }
}

// ─── Lyrics (passthrough to monochrome's provider) ───
export async function monoGetLyrics(title: string, artist: string): Promise<any> {
  // Monochrome doesn't have a direct getLyrics on MusicAPI,
  // but the lyrics module handles it. Return null to let the
  // existing lyrics logic in musicAPI.ts handle it.
  return null;
}
