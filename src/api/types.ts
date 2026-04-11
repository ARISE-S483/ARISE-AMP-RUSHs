export interface Track {
  id: number | string;
  title: string;
  artist: { id: number; name: string; picture?: string };
  artists?: { id: number; name: string }[];
  album?: {
    id: number;
    title: string;
    cover?: string;
    releaseDate?: string;
  };
  duration: number; // seconds
  audioQuality?: string;
  trackNumber?: number;
  popularity?: number;
  type?: string;
  isUnavailable?: boolean;
  explicit?: boolean;
  streamStartDate?: string;
  // Computed for UI
  thumbnail?: string;
  thumbnailLarge?: string;
  // Multi-source fields
  source?: 'tidal' | 'piped' | 'youtube' | 'jiosaavn' | 'local' | 'rapidapi' | 'shazam' | 'spotify' | 'genius' | 'deezer';
  videoId?: string;        // YouTube video ID (Piped source)
  streamUrl?: string;      // Direct stream URL (when pre-resolved)
  previewUrl?: string;     // 30s preview URL (Spotify, Deezer)
}

export interface Album {
  id: number | string;
  title: string;
  artist: { id: number; name: string };
  artists?: { id: number; name: string }[];
  cover?: string;
  releaseDate?: string;
  numberOfTracks?: number;
  duration?: number;
  type?: string;
  explicit?: boolean;
  // Computed for UI
  thumbnail?: string;
  thumbnailLarge?: string;
  tracks?: Track[];
}

export interface Artist {
  id: number | string;
  name: string;
  picture?: string;
  thumbnail?: string;
  thumbnailLarge?: string;
  subscriberCount?: number;
  description?: string;
  verified?: boolean;
  albums?: Album[];
  eps?: Album[];
  tracks?: Track[];
  videos?: Track[];
  relatedArtists?: Artist[];
}

export interface Playlist {
  id: string | number;
  title: string;
  thumbnail: string;
  trackCount?: number;
  tracks?: Track[];
  description?: string;
  creator?: string;
  isLocal?: boolean;
  uuid?: string;
  numberOfTracks?: number;
  image?: string;
}

export interface SearchResults {
  tracks: Track[];
  albums: Album[];
  artists: Artist[];
  playlists: Playlist[];
  videos?: Track[];
}

export interface ExploreCategory {
  title: string;
  items: (Track | Album | Artist | Playlist)[];
  type: 'tracks' | 'albums' | 'artists' | 'playlists' | 'mixed';
}

export interface LyricsLine {
  time: number;
  text: string;
}

export interface Lyrics {
  lines: LyricsLine[];
  source: string;
  synced: boolean;
}

export type RepeatMode = 'off' | 'all' | 'one';
export type QueueSource = 'search' | 'album' | 'playlist' | 'recommendation' | 'library';

export interface APIInstance {
  url: string;
  version?: string;
}
