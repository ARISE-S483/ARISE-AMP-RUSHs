import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface EqualizerState {
  enabled: boolean;
  bandCount: number;
  freqMin: number;
  freqMax: number;
  gains: number[];
  preamp: number;
  preset: string;
  bandTypes?: string[];
  bandQs?: number[];
  customFrequencies?: number[];

  // Actions
  setEnabled: (enabled: boolean) => void;
  setBandCount: (count: number) => void;
  setFreqRange: (min: number, max: number) => void;
  setGains: (gains: number[]) => void;
  setPreamp: (preamp: number) => void;
  setPreset: (preset: string) => void;
  setBandTypes: (types: string[]) => void;
  setBandQs: (qs: number[]) => void;
  setCustomFrequencies: (freqs: number[]) => void;
  interpolateGains: (oldGains: number[], newCount: number) => number[];
}

export const useEqualizerStore = create<EqualizerState>()(
  persist(
    (set, get) => ({
      enabled: false,
      bandCount: 16,
      freqMin: 20,
      freqMax: 20000,
      gains: new Array(16).fill(0),
      preamp: 0,
      preset: 'flat',
      bandTypes: undefined,
      bandQs: undefined,
      customFrequencies: undefined,

      setEnabled: (enabled) => set({ enabled }),
      setBandCount: (count) => {
        const newCount = Math.max(3, Math.min(32, count));
        const newGains = get().interpolateGains(get().gains, newCount);
        set({ bandCount: newCount, gains: newGains });
      },
      setFreqRange: (min, max) => set({ freqMin: min, freqMax: max }),
      setGains: (gains) => set({ gains }),
      setPreamp: (preamp) => set({ preamp }),
      setPreset: (preset) => set({ preset }),
      setBandTypes: (bandTypes) => set({ bandTypes }),
      setBandQs: (bandQs) => set({ bandQs }),
      setCustomFrequencies: (customFrequencies) => set({ customFrequencies }),

      interpolateGains: (oldGains, targetBands) => {
        if (targetBands === oldGains.length) return [...oldGains];
        
        const result = [];
        for (let i = 0; i < targetBands; i++) {
            const sourceIndex = (i / (targetBands - 1)) * (oldGains.length - 1);
            const indexLow = Math.floor(sourceIndex);
            const indexHigh = Math.min(Math.ceil(sourceIndex), oldGains.length - 1);
            const fraction = sourceIndex - indexLow;

            const lowValue = oldGains[indexLow] || 0;
            const highValue = oldGains[indexHigh] || 0;
            const interpolated = lowValue + (highValue - lowValue) * fraction;
            result.push(Math.round(interpolated * 10) / 10);
        }
        return result;
      }
    }),
    {
      name: 'equalizer-settings',
    }
  )
);
