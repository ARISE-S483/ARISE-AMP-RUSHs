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
  } else if (audioQuality === 'HI_RES_LOSSLESS' || audioQuality === 'MAX' || audioQuality === 'HI_RES') {
    label = 'HI-RES';
    colorClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
  } else if (audioQuality === 'LOSSLESS' || audioQuality === 'FLAC') {
    label = 'FLAC';
    colorClass = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
  } else if (audioQuality.includes('OPUS') || audioQuality.includes('FFMPEG_OPUS')) {
    label = 'OPUS';
    colorClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
  } else if (audioQuality === 'HIGH' || audioQuality.includes('AAC')) {
    label = 'AAC';
    colorClass = 'bg-blue-500/20 text-blue-300 border-blue-500/40';
  } else if (audioQuality === 'LOW' || audioQuality.includes('MP3') || audioQuality === 'MP3_320') {
    label = 'MP3';
    colorClass = 'bg-zinc-500/20 text-zinc-300 border-zinc-500/40';
  } else if (sourceStr === 'tidal') {
    label = 'FLAC';
    colorClass = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
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
