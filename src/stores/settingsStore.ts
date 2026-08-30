// Settings store - mirrors Monochrome's settings categories
import { create } from 'zustand';
export type VisualizerStyle = 'bars' | 'wave' | 'circular' | 'none';
export type LyricsSize = 'small' | 'medium' | 'large';
export type NowPlayingStyle = 'default' | 'fullscreen' | 'minimal';
export type BackgroundStyle = 'none' | 'blur' | 'gradient' | 'solid';
export type BackgroundImage = 'blue-mountains' | 'cosmic-purple' | 'dark-forest' | 'neon-city' | 'valkyrie' | 'custom' | 'none';

interface SettingsState {
  // Audio
  audioQuality: string;
  preferDolbyAtmos: boolean;
  nativeOsAtmos: boolean;
  showQualityBadges: boolean;
  albumReleaseYear: boolean;
  gaplessPlayback: boolean;
  silenceRemoval: boolean;
  crossfade: boolean;
  crossfadeDuration: number;
  replayGainMode: string;
  replayGainPreamp: number;
  monoAudio: boolean;
  exponentialVolume: boolean;
  playbackSpeed: number;
  preservePitch: boolean;
  binauralDsp: boolean;
  autoEnableSpatial: boolean;
  binauralCrossfeed: boolean;
  binauralCrossfeedLevel: string;
  binauralHrtfPreset: string;
  binauralWidening: boolean;
  binauralWidth: number;
  equalizerEnabled: boolean;

  // Downloads
  downloadQuality: string;
  losslessContainer: string;
  bulkDownloadMethod: string;
  rememberLastFolder: boolean;
  singleToFolder: boolean;
  forceZipBlob: boolean;
  writeArtistsSeparately: boolean;
  downloadLyrics: boolean;
  romajiLyrics: boolean;
  coverArtSize: string;
  filenameTemplate: string;

  // Appearance
  backgroundImage: BackgroundImage;
  customBackgroundUrl: string;
  customBackgroundType: 'image' | 'video' | 'none';
  backgroundOverlayOpacity: number; // 0-100
  backgroundBlurAmount: number; // 0-100 px
  glassOpacity: number; // 0-100
  glassBlur: number; // 0-100
  backgroundStyle: BackgroundStyle;
  dynamicColors: boolean;
  showQualityBadge: boolean;
  showTrackDate: boolean;
  animatedCovers: boolean;

  // Now Playing
  nowPlayingStyle: NowPlayingStyle;
  fullscreenOnClick: boolean;

  fsBackgroundOverlayOpacity: number;
  fsBackgroundBlurAmount: number;
  fsGlassOpacity: number;
  fsGlassBlur: number;

  // Custom Background Init
  initCustomBackground: () => Promise<void>;

  // Lyrics
  lyricsEnabled: boolean;
  lyricsSize: LyricsSize;
  karaokeMode: boolean;

  // Visualizer
  visualizerStyle: VisualizerStyle;
  visualizerDimming: boolean;

  // Sidebar
  showRecentlyPlayed: boolean;
  showFavorites: boolean;
  showPlaylists: boolean;

  // Streaming
  useYtdlpFirst: boolean;
  autoRefreshInstances: boolean;

  // Actions
  setSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  resetSettings: () => void;
}

const STORAGE_KEY = 'melodies_settings';

const defaultSettings = {
  audioQuality: 'AUTO',
  preferDolbyAtmos: false,
  nativeOsAtmos: true,
  showQualityBadges: true,
  albumReleaseYear: true,
  gaplessPlayback: true,
  silenceRemoval: false,
  crossfade: false,
  crossfadeDuration: 1,
  replayGainMode: 'off',
  replayGainPreamp: 0,
  monoAudio: false,
  exponentialVolume: true,
  playbackSpeed: 1.0,
  preservePitch: true,
  binauralDsp: false,
  autoEnableSpatial: false,
  binauralCrossfeed: true,
  binauralCrossfeedLevel: 'medium',
  binauralHrtfPreset: 'studio',
  binauralWidening: true,
  binauralWidth: 1.0,
  equalizerEnabled: false,
  downloadQuality: 'LOSSLESS',
  losslessContainer: 'nochange',
  bulkDownloadMethod: 'zip',
  rememberLastFolder: false,
  singleToFolder: false,
  forceZipBlob: false,
  writeArtistsSeparately: false,
  downloadLyrics: false,
  romajiLyrics: false,
  coverArtSize: '1280x1280',
  filenameTemplate: '',
  backgroundImage: 'valkyrie' as BackgroundImage,
  customBackgroundUrl: '',
  customBackgroundType: 'none' as 'image' | 'video' | 'none',
  backgroundOverlayOpacity: 0,
  backgroundBlurAmount: 2,
  glassOpacity: 0,
  glassBlur: 0,
  backgroundStyle: 'blur' as BackgroundStyle,
  dynamicColors: true,
  showQualityBadge: true,
  showTrackDate: false,
  animatedCovers: true,
  nowPlayingStyle: 'default' as NowPlayingStyle,
  fullscreenOnClick: false,
  fsBackgroundOverlayOpacity: 50,
  fsBackgroundBlurAmount: 80,
  fsGlassOpacity: 40,
  fsGlassBlur: 30,
  lyricsEnabled: true,
  lyricsSize: 'medium' as LyricsSize,
  karaokeMode: true,
  visualizerStyle: 'bars' as VisualizerStyle,
  visualizerDimming: false,
  showRecentlyPlayed: true,
  showFavorites: true,
  showPlaylists: true,
  useYtdlpFirst: true,
  autoRefreshInstances: false,
};

function loadSettings(): typeof defaultSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) };
    }
  } catch { /* */ }
  return { ...defaultSettings };
}

function saveSettings(state: Partial<typeof defaultSettings>) {
  try {
    const current = loadSettings();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...state }));
  } catch { /* */ }
}

import { loadBackgroundData } from '@/lib/backgroundStore';

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...loadSettings(),

  setSetting: (key, value) => {
    set({ [key]: value } as Partial<SettingsState>);
    saveSettings({ [key]: value });
  },

  resetSettings: () => {
    set(defaultSettings);
    localStorage.removeItem(STORAGE_KEY);
  },

  initCustomBackground: async () => {
    const { backgroundImage } = get();
    if (backgroundImage !== 'custom') return;
    
    try {
      const data = await loadBackgroundData();
      if (data) {
        const url = URL.createObjectURL(data.blob);
        set({ customBackgroundUrl: url, customBackgroundType: data.type });
      }
    } catch (e) {
      console.error('Failed to load custom background from IndexedDB:', e);
    }
  },
}));
