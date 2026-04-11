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
      rapidapiKey: 'c3389df2admshb2bb562e9c3ef4ep1352f5jsn590784329e57',
      setRapidapiKey: (key) => set({ rapidapiKey: key }),
      clearRapidapiKey: () => set({ rapidapiKey: '' }),
    }),
    {
      name: 'rapidapi-store',
    }
  )
);
