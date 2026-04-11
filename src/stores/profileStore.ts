import { create } from 'zustand';

interface ProfileState {
  displayName: string;
  avatarUrl: string;
  bio: string;
  isPublic: boolean;
  setDisplayName: (name: string) => void;
  setAvatarUrl: (url: string) => void;
  setBio: (bio: string) => void;
  setIsPublic: (isPublic: boolean) => void;
}

const STORAGE_KEY = 'melodies_profile';

function loadProfile() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* */ }
  return { displayName: 'Music Lover', avatarUrl: '', bio: '', isPublic: false };
}

function saveProfile(state: Partial<ProfileState>) {
  try {
    const current = loadProfile();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...state }));
  } catch { /* */ }
}

export const useProfileStore = create<ProfileState>((set) => ({
  ...loadProfile(),
  setDisplayName: (displayName) => { set({ displayName }); saveProfile({ displayName }); },
  setAvatarUrl: (avatarUrl) => { set({ avatarUrl }); saveProfile({ avatarUrl }); },
  setBio: (bio) => { set({ bio }); saveProfile({ bio }); },
  setIsPublic: (isPublic) => { set({ isPublic }); saveProfile({ isPublic }); },
}));
