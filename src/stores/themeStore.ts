// SimpMusic Theme System & Design Tokens
import { create } from 'zustand';

export interface ThemeColors {
  background: string;
  foreground: string;
  primary: string;
  secondary: string;
  accent: string;
  muted: string;
  card: string;
}

export interface Theme {
  id: string;
  name: string;
  author: string;
  colors: ThemeColors;
  isBuiltIn?: boolean;
}

export const SIMPMUSIC_THEMES: Theme[] = [
  {
    id: 'liquid-glass-dark',
    name: 'Liquid Glass (SimpMusic)',
    author: 'SimpMusic',
    isBuiltIn: true,
    colors: {
      background: '224 45% 6%',
      foreground: '210 30% 96%',
      primary: '197 68% 73%', // #8ECAE6 (SimpMusic Brand Cyan)
      secondary: '222 35% 14%',
      accent: '197 70% 32%',
      muted: '222 28% 18%',
      card: '223 35% 10%',
    },
  },
  {
    id: 'material-3-expressive',
    name: 'Material 3 Expressive',
    author: 'SimpMusic',
    isBuiltIn: true,
    colors: {
      background: '230 30% 7%',
      foreground: '220 20% 95%',
      primary: '265 89% 75%',
      secondary: '230 25% 16%',
      accent: '265 60% 30%',
      muted: '230 20% 20%',
      card: '230 25% 12%',
    },
  },
  {
    id: 'apple-music-dark',
    name: 'Apple Music Dynamic',
    author: 'SimpMusic',
    isBuiltIn: true,
    colors: {
      background: '240 20% 5%',
      foreground: '0 0% 98%',
      primary: '346 84% 61%',
      secondary: '240 16% 14%',
      accent: '346 60% 28%',
      muted: '240 14% 18%',
      card: '240 18% 9%',
    },
  },
  {
    id: 'amoled-black',
    name: 'AMOLED Pure Black',
    author: 'SimpMusic',
    isBuiltIn: true,
    colors: {
      background: '0 0% 2%',
      foreground: '0 0% 96%',
      primary: '197 68% 73%',
      secondary: '0 0% 10%',
      accent: '197 60% 25%',
      muted: '0 0% 14%',
      card: '0 0% 6%',
    },
  },
  {
    id: 'ocean-cyan',
    name: 'Ocean Cyan',
    author: 'SimpMusic',
    isBuiltIn: true,
    colors: {
      background: '200 45% 6%',
      foreground: '200 20% 96%',
      primary: '190 90% 50%',
      secondary: '200 35% 14%',
      accent: '190 60% 25%',
      muted: '200 25% 18%',
      card: '200 35% 10%',
    },
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    author: 'SimpMusic',
    isBuiltIn: true,
    colors: {
      background: '280 50% 4%',
      foreground: '180 100% 80%',
      primary: '320 100% 55%',
      secondary: '280 40% 12%',
      accent: '300 50% 18%',
      muted: '280 30% 16%',
      card: '280 45% 9%',
    },
  },
];

interface ThemeState {
  activeThemeId: string;
  customThemes: Theme[];
  nowPlayingStyle: 'm3-expressive' | 'apple-music' | 'spotify';
  getActiveTheme: () => Theme;
  getAllThemes: () => Theme[];
  setActiveTheme: (id: string) => void;
  setNowPlayingStyle: (style: 'm3-expressive' | 'apple-music' | 'spotify') => void;
  addCustomTheme: (theme: Omit<Theme, 'id'>) => void;
  removeCustomTheme: (id: string) => void;
}

const STORAGE_KEY = 'simpmusic_theme';
const NOW_PLAYING_STORAGE_KEY = 'simpmusic_now_playing_style';

function loadThemeState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const storedStyle = localStorage.getItem(NOW_PLAYING_STORAGE_KEY) as 'm3-expressive' | 'apple-music' | 'spotify' | null;
    const parsed = stored ? JSON.parse(stored) : {};
    return {
      activeThemeId: parsed.activeThemeId || 'liquid-glass-dark',
      customThemes: parsed.customThemes || [],
      nowPlayingStyle: storedStyle || 'apple-music',
    };
  } catch { /* */ }
  return { activeThemeId: 'liquid-glass-dark', customThemes: [], nowPlayingStyle: 'apple-music' as const };
}

function saveThemeState(state: { activeThemeId: string; customThemes: Theme[] }) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* */ }
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  ...loadThemeState(),

  getActiveTheme: () => {
    const { activeThemeId, customThemes } = get();
    return [...SIMPMUSIC_THEMES, ...customThemes].find(t => t.id === activeThemeId) || SIMPMUSIC_THEMES[0];
  },

  getAllThemes: () => {
    return [...SIMPMUSIC_THEMES, ...get().customThemes];
  },

  setActiveTheme: (id) => {
    set({ activeThemeId: id });
    const state = get();
    saveThemeState({ activeThemeId: id, customThemes: state.customThemes });
    applyTheme(state.getActiveTheme());
  },

  setNowPlayingStyle: (style) => {
    set({ nowPlayingStyle: style });
    try {
      localStorage.setItem(NOW_PLAYING_STORAGE_KEY, style);
    } catch {}
  },

  addCustomTheme: (theme) => {
    const id = `custom-${Date.now()}`;
    const newTheme = { ...theme, id };
    set(s => {
      const customThemes = [...s.customThemes, newTheme];
      saveThemeState({ activeThemeId: s.activeThemeId, customThemes });
      return { customThemes };
    });
  },

  removeCustomTheme: (id) => {
    set(s => {
      const customThemes = s.customThemes.filter(t => t.id !== id);
      const activeThemeId = s.activeThemeId === id ? 'liquid-glass-dark' : s.activeThemeId;
      saveThemeState({ activeThemeId, customThemes });
      return { customThemes, activeThemeId };
    });
  },
}));

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const { colors } = theme;
  root.style.setProperty('--background', colors.background);
  root.style.setProperty('--foreground', colors.foreground);
  root.style.setProperty('--primary', colors.primary);
  root.style.setProperty('--primary-foreground', colors.foreground);
  root.style.setProperty('--secondary', colors.secondary);
  root.style.setProperty('--secondary-foreground', `${colors.foreground.split(' ')[0]} 20% 85%`);
  root.style.setProperty('--accent', colors.accent);
  root.style.setProperty('--accent-foreground', colors.foreground);
  root.style.setProperty('--muted', colors.muted);
  root.style.setProperty('--card', colors.card);
  root.style.setProperty('--card-foreground', colors.foreground);
  root.style.setProperty('--popover', colors.card);
  root.style.setProperty('--popover-foreground', colors.foreground);
  root.style.setProperty('--border', colors.muted);
  root.style.setProperty('--input', colors.secondary);
  root.style.setProperty('--ring', colors.primary);
  root.style.setProperty('--sidebar-background', `${colors.background.split(' ')[0]} 50% 8%`);
  root.style.setProperty('--sidebar-primary', colors.primary);
  // SimpMusic semantic tokens
  root.style.setProperty('--simp-favorite', '#FF4081');
  root.style.setProperty('--simp-lyric-active', '#FFFF00');
  root.style.setProperty('--simp-seed', '#8ECAE6');
}

// Initialize theme on load
if (typeof window !== 'undefined') {
  const initialTheme = useThemeStore.getState().getActiveTheme();
  applyTheme(initialTheme);
}
