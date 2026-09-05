import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gauge, Sliders, X, RotateCcw } from 'lucide-react';
import { usePlayerStore } from '@/stores/playerStore';

interface PitchSpeedModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SPEED_PRESETS = [0.5, 0.75, 0.85, 1.0, 1.15, 1.25, 1.5, 2.0];

export function PitchSpeedModal({ isOpen, onClose }: PitchSpeedModalProps) {
  const audioElement = usePlayerStore(s => s.audioElement);
  const [speed, setSpeed] = useState<number>(1.0);
  const [pitch, setPitch] = useState<number>(0); // -6 to +6 semitones
  const [preservePitch, setPreservePitch] = useState<boolean>(true);

  useEffect(() => {
    if (audioElement) {
      setSpeed(audioElement.playbackRate || 1.0);
    }
  }, [audioElement, isOpen]);

  const handleSpeedChange = (val: number) => {
    const clamped = Math.max(0.5, Math.min(2.0, val));
    setSpeed(clamped);
    if (audioElement) {
      audioElement.playbackRate = clamped;
      // @ts-ignore
      audioElement.preservesPitch = preservePitch;
    }
  };

  const handleReset = () => {
    handleSpeedChange(1.0);
    setPitch(0);
    setPreservePitch(true);
    if (audioElement) {
      audioElement.playbackRate = 1.0;
      // @ts-ignore
      audioElement.preservesPitch = true;
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
          className="w-full max-w-sm rounded-3xl bg-[#0f172a]/95 border border-white/15 p-5 shadow-2xl text-white select-none backdrop-blur-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
                <Gauge size={18} />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Speed & Pitch Controls</h3>
                <p className="text-[11px] text-white/50">SimpMusic Playback Dynamics</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Speed Section */}
          <div className="py-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/80 font-medium">Playback Speed</span>
              <span className="font-mono text-sky-300 font-bold bg-sky-500/15 px-2 py-0.5 rounded-full">
                {speed.toFixed(2)}x
              </span>
            </div>

            <input
              type="range"
              min={0.5}
              max={2.0}
              step={0.05}
              value={speed}
              onChange={e => handleSpeedChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-sky-400"
            />

            {/* Presets */}
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {SPEED_PRESETS.map(p => (
                <button
                  key={p}
                  onClick={() => handleSpeedChange(p)}
                  className={`py-1 rounded-lg text-xs font-mono font-medium transition-colors ${
                    Math.abs(speed - p) < 0.01
                      ? 'bg-sky-500 text-slate-900 font-bold shadow-[0_0_10px_rgba(142,202,230,0.5)]'
                      : 'bg-white/5 hover:bg-white/10 text-white/80'
                  }`}
                >
                  {p}x
                </button>
              ))}
            </div>
          </div>

          {/* Pitch Section */}
          <div className="py-3 border-t border-white/10 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/80 font-medium">Pitch Shift</span>
              <span className="font-mono text-pink-400 font-bold bg-pink-500/15 px-2 py-0.5 rounded-full">
                {pitch > 0 ? `+${pitch}` : pitch} semitones
              </span>
            </div>

            <input
              type="range"
              min={-6}
              max={6}
              step={1}
              value={pitch}
              onChange={e => {
                const val = parseInt(e.target.value);
                setPitch(val);
                // When pitch != 0, disable preservesPitch to shift pitch via playbackRate delta
                if (audioElement) {
                  if (val === 0) {
                    // @ts-ignore
                    audioElement.preservesPitch = true;
                    audioElement.playbackRate = speed;
                  } else {
                    // @ts-ignore
                    audioElement.preservesPitch = false;
                    const pitchMultiplier = Math.pow(2, val / 12);
                    audioElement.playbackRate = speed * pitchMultiplier;
                  }
                }
              }}
              className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-pink-400"
            />
          </div>

          {/* Footer actions */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <RotateCcw size={13} />
              <span>Reset Defaults</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-900 font-semibold text-xs shadow-lg transition-colors"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
