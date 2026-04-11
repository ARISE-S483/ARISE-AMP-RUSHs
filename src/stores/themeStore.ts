// Theme system for customizable colors
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

const BUILT_IN_THEMES: Theme[] = [
  {
    id: 'default-purple',
    name: 'Midnight Purple',
    author: 'Melodies',
    isBuiltIn: true,
    colors: {
      background: '260 60% 6%',
      foreground: '260 20% 95%',
      primary: '265 90% 60%',
      secondary: '260 40% 15%',
      accent: '265 50% 22%',
      muted: '260 35% 18%',
      card: '260 45% 12%',
    },
  },
  {
    id: 'ocean-blue',
    name: 'Ocean Blue',
    author: 'Melodies',
    isBuiltIn: true,
    colors: {
      background: '220 60% 6%',
      foreground: '220 20% 95%',
      primary: '210 90% 55%',
      secondary: '220 40% 15%',
      accent: '210 50% 22%',
      muted: '220 35% 18%',
      card: '220 45% 12%',
    },
  },
  {
    id: 'rose-gold',
    name: 'Rose Gold',
    author: 'Melodies',
    isBuiltIn: true,
    colors: {
      background: '350 30% 6%',
      foreground: '350 15% 95%',
      primary: '340 80% 60%',
      secondary: '350 30% 15%',
      accent: '340 40% 22%',
      muted: '350 25% 18%',
      card: '350 35% 12%',
    },
  },
  {
    id: 'forest-green',
    name: 'Forest Green',
    author: 'Melodies',
    isBuiltIn: true,
    colors: {
      background: '150 40% 5%',
      foreground: '150 15% 95%',
      primary: '142 70% 45%',
      secondary: '150 30% 14%',
      accent: '142 40% 20%',
      muted: '150 25% 17%',
      card: '150 35% 11%',
    },
  },
  {
    id: 'amber-warm',
    name: 'Amber Warmth',
    author: 'Melodies',
    isBuiltIn: true,
    colors: {
      background: '30 40% 5%',
      foreground: '30 15% 95%',
      primary: '38 90% 50%',
      secondary: '30 30% 14%',
      accent: '35 40% 20%',
      muted: '30 25% 17%',
      card: '30 35% 11%',
    },
  },
  {
    id: 'monochrome',
    name: 'Monochrome',
    author: 'Melodies',
    isBuiltIn: true,
    colors: {
      background: '0 0% 5%',
      foreground: '0 0% 95%',
      primary: '0 0% 70%',
      secondary: '0 0% 14%',
      accent: '0 0% 20%',
      muted: '0 0% 17%',
      card: '0 0% 11%',
    },
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    author: 'Melodies',
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
  getActiveTheme: () => Theme;
  getAllThemes: () => Theme[];
  setActiveTheme: (id: string) => void;
  addCustomTheme: (theme: Omit<Theme, 'id'>) => void;
  removeCustomTheme: (id: string) => void;
}

const STORAGE_KEY = 'melodies_theme';

function loadThemeState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* */ }
  return { activeThemeId: 'default-purple', customThemes: [] };
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
    return [...BUILT_IN_THEMES, ...customThemes].find(t => t.id === activeThemeId) || BUILT_IN_THEMES[0];
  },

  getAllThemes: () => {
    return [...BUILT_IN_THEMES, ...get().customThemes];
  },

  setActiveTheme: (id) => {
    set({ activeThemeId: id });
    const state = get();
    saveThemeState({ activeThemeId: id, customThemes: state.customThemes });
    applyTheme(state.getActiveTheme());
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
      const activeThemeId = s.activeThemeId === id ? 'default-purple' : s.activeThemeId;
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
}

// Initialize theme on load
const initialTheme = useThemeStore.getState().getActiveTheme();
if (initialTheme.id !== 'default-purple') {
  applyTheme(initialTheme);
}
