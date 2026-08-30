import React from 'react';
import type { Track } from '@/api/types';

interface TrackSourceBadgeProps {
  track: Track | null | undefined;
}

export function TrackSourceBadge({ track }: TrackSourceBadgeProps) {
  if (!track) return null;
  
  const audioQuality = (track.audioQuality || '').toUpperCase();
  const sourceStr = (track.source || '').toLowerCase();
  
  let label = '';
  let colorClass = '';

  if (audioQuality.includes('ATMOS') || audioQuality.includes('AC4') || audioQuality.includes('EAC3')) {
    label = 'ATMOS';
    colorClass = 'bg-purple-500/20 text-purple-400 border-purple-500/40';
  } else if (audioQuality === 'HI_RES_LOSSLESS' || audioQuality === 'MAX') {
    label = 'HI-RES';
    colorClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
  } else if (audioQuality === 'LOSSLESS' || sourceStr === 'tidal') {
    label = 'FLAC';
    colorClass = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
  } else if (audioQuality === 'HIGH' || audioQuality === 'MP3_320') {
    label = '320K';
    colorClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
  } else if (sourceStr === 'youtube' || sourceStr === 'piped') {
    label = 'OPUS';
    colorClass = 'bg-red-500/20 text-red-400 border-red-500/30';
  } else if (sourceStr === 'jiosaavn') {
    label = '320K';
    colorClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
  } else if (sourceStr) {
    label = sourceStr;
    colorClass = 'bg-white/10 text-white/70 border-white/20';
  } else {
    return null;
  }

  return (
    <span className={`px-1.5 py-0.5 rounded-full font-mono font-bold text-[8px] leading-none border uppercase flex-shrink-0 ${colorClass}`}>
      {label}
    </span>
  );
}
