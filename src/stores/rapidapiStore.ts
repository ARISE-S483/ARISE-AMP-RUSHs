import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface RapidApiState {
  rapidapiKey: string;
  setRapidapiKey: (key: string) => void;
  clearRapidapiKey: () => void;
}

export const useRapidApiStore = create<RapidApiState>()(
  persist(
    (set) => ({
      rapidapiKey: '',
      setRapidapiKey: (key) => set({ rapidapiKey: key }),
      clearRapidapiKey: () => set({ rapidapiKey: '' }),
    }),
    {
      name: 'rapidapi-store',
    }
  )
);
