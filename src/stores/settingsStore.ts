// Settings store - mirrors Monochrome's settings categories
import { create } from 'zustand';
export type AudioQuality = 'DEFAULT' | 'AUTO' | 'LOW' | 'HIGH' | 'LOSSLESS' | 'HI_RES_LOSSLESS';
export type DownloadQuality = 'HIGH' | 'LOSSLESS' | 'HI_RES_LOSSLESS';
export type LosslessContainer = 'flac' | 'alac' | 'wav';
export type VisualizerStyle = 'bars' | 'wave' | 'circular' | 'none';
export type LyricsSize = 'small' | 'medium' | 'large';
export type CoverArtSize = 320 | 640 | 1280;
export type NowPlayingStyle = 'default' | 'fullscreen' | 'minimal';
export type BackgroundStyle = 'none' | 'blur' | 'gradient' | 'solid';
export type BackgroundImage = 'blue-mountains' | 'cosmic-purple' | 'dark-forest' | 'neon-city' | 'valkyrie' | 'custom' | 'none';

interface SettingsState {
  // Audio
  audioQuality: AudioQuality;
  replayGain: boolean;
  monoAudio: boolean;
  exponentialVolume: boolean;
  crossfade: number; // seconds, 0 = off

  // Downloads
  downloadQuality: DownloadQuality;
  losslessContainer: LosslessContainer;
  embedMetadata: boolean;
  embedLyrics: boolean;
  coverArtSize: CoverArtSize;

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

  // Actions
  setSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  resetSettings: () => void;
}

const STORAGE_KEY = 'melodies_settings';

const defaultSettings = {
  audioQuality: 'HIGH' as AudioQuality,
  replayGain: false,
  monoAudio: false,
  exponentialVolume: true,
  crossfade: 0,
  downloadQuality: 'LOSSLESS' as DownloadQuality,
  losslessContainer: 'flac' as LosslessContainer,
  embedMetadata: true,
  embedLyrics: true,
  coverArtSize: 1280 as CoverArtSize,
  backgroundImage: 'valkyrie' as BackgroundImage,
  customBackgroundUrl: '',
  customBackgroundType: 'none' as 'image' | 'video' | 'none',
  backgroundOverlayOpacity: 70,
  backgroundBlurAmount: 2,
  glassOpacity: 10,
  glassBlur: 30,
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
