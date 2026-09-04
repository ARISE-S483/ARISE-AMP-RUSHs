import { create } from 'zustand';

export interface YouTubeAccount {
  signedIn: boolean;
  name?: string;
  handle?: string;
  email?: string;
  thumbnail?: string;
  channelId?: string;
}

interface AccountState {
  account: YouTubeAccount | null;
  cookie: string;
  isLoading: boolean;
  error: string | null;

  // Actions
  setCookie: (cookie: string) => Promise<boolean>;
  logout: () => void;
  loadAccount: () => Promise<void>;
}

const STORAGE_COOKIE_KEY = 'ytm_account_cookie';
const STORAGE_ACCOUNT_KEY = 'ytm_account_data';

function getStoredCookie(): string {
  try {
    return localStorage.getItem(STORAGE_COOKIE_KEY) || '';
  } catch {
    return '';
  }
}

function getStoredAccount(): YouTubeAccount | null {
  try {
    const raw = localStorage.getItem(STORAGE_ACCOUNT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const useAccountStore = create<AccountState>((set, get) => ({
  account: getStoredAccount(),
  cookie: getStoredCookie(),
  isLoading: false,
  error: null,

  setCookie: async (newCookie: string) => {
    set({ isLoading: true, error: null });
    const cleanCookie = newCookie.trim();

    if (!cleanCookie) {
      get().logout();
      set({ isLoading: false });
      return false;
    }

    try {
      localStorage.setItem(STORAGE_COOKIE_KEY, cleanCookie);
      set({ cookie: cleanCookie });

      // Fetch account details from API with this cookie
      const res = await fetch('/api/ytmusic/account', {
        headers: { 'x-youtube-cookie': cleanCookie },
      });

      if (!res.ok) {
        throw new Error('Failed to verify cookie with YouTube Music');
      }

      const data = await res.json();
      const account: YouTubeAccount = {
        signedIn: true,
        name: data.name || 'YouTube User',
        handle: data.handle || '',
        email: data.email || '',
        thumbnail: data.thumbnail || '',
        channelId: data.channelId || '',
      };

      localStorage.setItem(STORAGE_ACCOUNT_KEY, JSON.stringify(account));
      set({ account, isLoading: false, error: null });
      return true;
    } catch {
      // Even if getAccount info fails, if cookies are provided we still accept the session
      const fallbackAccount: YouTubeAccount = {
        signedIn: true,
        name: 'YouTube Music Account',
        handle: '@user',
        thumbnail: '',
      };
      localStorage.setItem(STORAGE_ACCOUNT_KEY, JSON.stringify(fallbackAccount));
      set({ account: fallbackAccount, isLoading: false, error: null });
      return true;
    }
  },

  logout: () => {
    localStorage.removeItem(STORAGE_COOKIE_KEY);
    localStorage.removeItem(STORAGE_ACCOUNT_KEY);
    set({ account: null, cookie: '', error: null, isLoading: false });
  },

  loadAccount: async () => {
    const cookie = get().cookie;
    if (!cookie) return;

    try {
      const res = await fetch('/api/ytmusic/account', {
        headers: { 'x-youtube-cookie': cookie },
      });
      if (res.ok) {
        const data = await res.json();
        const account: YouTubeAccount = {
          signedIn: true,
          name: data.name || get().account?.name || 'YouTube User',
          handle: data.handle || get().account?.handle || '',
          email: data.email || get().account?.email || '',
          thumbnail: data.thumbnail || get().account?.thumbnail || '',
          channelId: data.channelId || get().account?.channelId || '',
        };
        localStorage.setItem(STORAGE_ACCOUNT_KEY, JSON.stringify(account));
        set({ account });
      }
    } catch {
      // offline or unchanged
    }
  },
}));
