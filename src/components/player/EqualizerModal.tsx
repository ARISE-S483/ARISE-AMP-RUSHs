import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sliders, X, RotateCcw, Power, Music, Headphones } from 'lucide-react';
import { useEqualizerStore } from '@/stores/equalizerStore';

interface EqualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

const PRESETS: Record<string, { label: string; gains: number[] }> = {
  flat: { label: 'Flat', gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  bass_boost: { label: 'Bass Boost', gains: [6, 5, 4, 2, 0, 0, 0, 0, 0, 0] },
  treble_boost: { label: 'Treble Boost', gains: [0, 0, 0, 0, 0, 1, 3, 5, 6, 7] },
  rock: { label: 'Rock', gains: [4, 3, -1, -2, 1, 2, 3, 4, 4, 3] },
  pop: { label: 'Pop', gains: [-1, 1, 3, 4, 3, 0, -1, -1, 1, 2] },
  vocal: { label: 'Vocal Boost', gains: [-2, -2, -1, 1, 4, 4, 3, 1, 0, -1] },
  electronic: { label: 'Electronic', gains: [5, 4, 2, 0, -2, 2, 1, 2, 4, 5] },
  acoustic: { label: 'Acoustic', gains: [3, 2, 1, 1, 2, 2, 3, 3, 2, 1] },
  classical: { label: 'Classical', gains: [4, 3, 2, 2, -1, -1, 0, 2, 3, 3] },
};

function formatFreq(hz: number): string {
  if (hz >= 1000) return `${hz / 1000}k`;
  return `${hz}`;
}

export function EqualizerModal({ isOpen, onClose }: EqualizerModalProps) {
  const { enabled, gains, preset, setEnabled, setGains, setPreset } = useEqualizerStore();

  const tenBandGains = gains.length >= 10 ? gains.slice(0, 10) : [...gains, ...new Array(10 - gains.length).fill(0)];

  const handleBandChange = (index: number, val: number) => {
    const next = [...tenBandGains];
    next[index] = val;
    setGains(next);
    setPreset('custom');
  };

  const applyPreset = (key: string) => {
    const p = PRESETS[key];
    if (p) {
      setGains(p.gains);
      setPreset(key);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/60 backdrop-blur-md p-4" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-xl rounded-3xl bg-[#0b1222]/95 border border-white/15 p-6 shadow-2xl text-white select-none backdrop-blur-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
                <Sliders size={20} />
              </div>
              <div>
                <h3 className="text-base font-semibold">10-Band Equalizer</h3>
                <p className="text-xs text-white/50">SimpMusic Audio Effects & Profiles</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setEnabled(!enabled)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  enabled
                    ? 'bg-sky-500/20 text-sky-300 border-sky-400/40'
                    : 'bg-white/5 text-white/50 border-white/10'
                }`}
              >
                <Power size={13} className={enabled ? 'text-sky-400' : 'text-white/40'} />
                <span>{enabled ? 'Enabled' : 'Disabled'}</span>
              </button>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Preset Selector */}
          <div className="py-4">
            <span className="text-xs text-white/60 font-medium mb-2 block">Presets</span>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {Object.entries(PRESETS).map(([key, p]) => (
                <button
                  key={key}
                  onClick={() => applyPreset(key)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    preset === key
                      ? 'bg-sky-500 text-slate-950 shadow-[0_0_12px_rgba(142,202,230,0.5)]'
                      : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Equalizer Sliders */}
          <div className={`py-4 transition-opacity ${enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'} overflow-x-auto scrollbar-thin pb-2`}>
            <div className="grid grid-cols-10 gap-2 h-44 items-center px-1 min-w-[440px]">
              {FREQUENCIES.map((freq, i) => {
                const gain = tenBandGains[i] ?? 0;
                return (
                  <div key={freq} className="flex flex-col items-center h-full justify-between">
                    <span className="text-[10px] font-mono font-medium text-sky-300">
                      {gain > 0 ? `+${gain}` : gain}
                    </span>

                    {/* Vertical Slider */}
                    <div className="relative flex-1 flex items-center justify-center my-1 w-full">
                      <input
                        type="range"
                        min={-12}
                        max={12}
                        step={0.5}
                        value={gain}
                        onChange={e => handleBandChange(i, parseFloat(e.target.value))}
                        className="h-28 w-4 bg-white/15 rounded-lg appearance-none cursor-pointer accent-sky-400 [writing-mode:vertical-lr] [direction:rtl] touch-none"
                        style={{ WebkitAppearance: 'slider-vertical' } as React.CSSProperties}
                      />
                    </div>

                    <span className="text-[10px] font-mono text-white/60">{formatFreq(freq)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-between">
            <button
              onClick={() => applyPreset('flat')}
              className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <RotateCcw size={13} />
              <span>Reset Flat</span>
            </button>
            <button
              onClick={onClose}
              className="px-5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-900 font-semibold text-xs shadow-lg transition-colors"
            >
              Save
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
