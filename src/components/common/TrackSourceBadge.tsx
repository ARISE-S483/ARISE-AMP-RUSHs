import React from 'react';
import type { Track } from '@/api/types';

interface TrackSourceBadgeProps {
  track: Track | null | undefined;
}

export function TrackSourceBadge({ track }: TrackSourceBadgeProps) {
  if (!track?.source) return null;
  
  const sourceStr = track.source.toLowerCase();
  let label = '';
  let colorClass = '';

  if (sourceStr === 'youtube' || sourceStr === 'piped') {
    label = 'OPUS';
    colorClass = 'bg-red-500/20 text-red-500 border-red-500/30';
  } else if (sourceStr === 'tidal' || sourceStr === 'monocrate') {
    label = 'HD/LOSSLESS/HIFI';
    colorClass = 'bg-cyan-500/20 text-cyan-500 border-cyan-500/30';
  } else if (sourceStr === 'jiosaavn') {
    label = 'JioSaavn';
    colorClass = 'bg-green-500/20 text-green-500 border-green-500/30';
  } else {
    label = sourceStr;
    colorClass = 'bg-white/10 text-white/70 border-white/20';
  }

  return (
    <span className={`px-1.5 py-0.5 rounded-full font-mono font-bold text-[8px] leading-none border uppercase flex-shrink-0 ${colorClass}`}>
      {label}
    </span>
  );
}
