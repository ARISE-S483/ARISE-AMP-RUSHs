import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Download, Sparkles, Check, Share2, Music } from 'lucide-react';
import { toast } from 'sonner';
import { SimpLogo } from '@/components/common/SimpLogo';
import { Track } from '@/api/types';

interface ShareLyricsCardProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
  lyricsLines: Array<{ time: number; text: string }>;
  currentLineIndex?: number;
}

const CARD_THEMES = [
  { id: 'simp-cyan', name: 'Simp Cyan', bg: 'linear-gradient(135deg, #8ECAE6 0%, #219EBC 50%, #023047 100%)', text: '#FFFFFF' },
  { id: 'sunset-velvet', name: 'Sunset Velvet', bg: 'linear-gradient(135deg, #F72585 0%, #B5179E 50%, #7209B7 100%)', text: '#FFFFFF' },
  { id: 'cosmic-purple', name: 'Cosmic Purple', bg: 'linear-gradient(135deg, #4361EE 0%, #3F37C9 50%, #480CA8 100%)', text: '#FFFFFF' },
  { id: 'emerald-night', name: 'Emerald Night', bg: 'linear-gradient(135deg, #52B788 0%, #2D6A4F 50%, #081C15 100%)', text: '#FFFFFF' },
  { id: 'amoled-noir', name: 'AMOLED Noir', bg: 'linear-gradient(135deg, #18181b 0%, #09090b 100%)', text: '#E4E4E7' },
];

export function ShareLyricsCard({ isOpen, onClose, track, lyricsLines, currentLineIndex = 0 }: ShareLyricsCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [selectedIndices, setSelectedIndices] = useState<number[]>(() => {
    if (lyricsLines.length === 0) return [];
    const start = Math.max(0, currentLineIndex);
    const end = Math.min(lyricsLines.length, start + 2);
    const res: number[] = [];
    for (let i = start; i < end; i++) res.push(i);
    return res;
  });
  const [activeThemeId, setActiveThemeId] = useState<string>('simp-cyan');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const activeTheme = CARD_THEMES.find(t => t.id === activeThemeId) || CARD_THEMES[0];

  if (!isOpen || !track) return null;

  const toggleLine = (idx: number) => {
    if (selectedIndices.includes(idx)) {
      if (selectedIndices.length === 1) return; // Keep at least one line
      setSelectedIndices(selectedIndices.filter(i => i !== idx));
    } else {
      if (selectedIndices.length >= 4) {
        toast.info('Maximum 4 lines for share card');
        return;
      }
      setSelectedIndices([...selectedIndices, idx].sort((a, b) => a - b));
    }
  };

  const selectedLyrics = selectedIndices
    .map(i => lyricsLines[i]?.text)
    .filter(Boolean);

  // Export card as PNG using HTML Canvas
  const generateCanvas = async (): Promise<HTMLCanvasElement | null> => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Draw Background
    const grad = ctx.createLinearGradient(0, 0, 1080, 1350);
    if (activeTheme.id === 'simp-cyan') {
      grad.addColorStop(0, '#8ECAE6');
      grad.addColorStop(0.5, '#219EBC');
      grad.addColorStop(1, '#023047');
    } else if (activeTheme.id === 'sunset-velvet') {
      grad.addColorStop(0, '#F72585');
      grad.addColorStop(0.5, '#B5179E');
      grad.addColorStop(1, '#7209B7');
    } else if (activeTheme.id === 'cosmic-purple') {
      grad.addColorStop(0, '#4361EE');
      grad.addColorStop(0.5, '#3F37C9');
      grad.addColorStop(1, '#480CA8');
    } else if (activeTheme.id === 'emerald-night') {
      grad.addColorStop(0, '#52B788');
      grad.addColorStop(0.5, '#2D6A4F');
      grad.addColorStop(1, '#081C15');
    } else {
      grad.addColorStop(0, '#1c1c24');
      grad.addColorStop(1, '#0c0c10');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1080, 1350);

    // Inner frosted card container
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.beginPath();
    ctx.roundRect(80, 80, 920, 1190, 48);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Top Header: SimpMusic brand
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px Inter, sans-serif';
    ctx.fillText('SimpMusic', 140, 175);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.font = 'normal 24px Inter, sans-serif';
    ctx.fillText('• Synced Lyrics', 330, 175);

    // Track metadata
    const thumbnail = track.thumbnail;
    if (thumbnail) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
          img.src = thumbnail;
        });
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(140, 240, 180, 180, 28);
        ctx.clip();
        ctx.drawImage(img, 140, 240, 180, 180);
        ctx.restore();
      } catch {}
    }

    // Title & Artist
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 44px Inter, sans-serif';
    const cleanTitle = track.title.length > 28 ? track.title.slice(0, 26) + '...' : track.title;
    ctx.fillText(cleanTitle, 350, 320);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = '500 32px Inter, sans-serif';
    const cleanArtist = (track.artist?.name || 'Unknown Artist').slice(0, 32);
    ctx.fillText(cleanArtist, 350, 375);

    // Lyrics Quote
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 48px Inter, sans-serif';
    let lyricY = 560;
    selectedLyrics.forEach(line => {
      const words = line.split(' ');
      let currentLine = '';
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > 800) {
          ctx.fillText(currentLine, 140, lyricY);
          lyricY += 68;
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) {
        ctx.fillText(currentLine, 140, lyricY);
        lyricY += 80;
      }
    });

    // Footer Watermark
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '500 24px Inter, sans-serif';
    ctx.fillText('simpmusic.org', 140, 1210);

    return canvas;
  };

  const handleCopyImage = async () => {
    setIsExporting(true);
    try {
      const canvas = await generateCanvas();
      if (!canvas) throw new Error('Canvas rendering failed');
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          // @ts-ignore
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          toast.success('Lyrics card copied to clipboard!');
        } catch {
          handleDownloadImage();
        }
      });
    } catch {
      toast.error('Failed to copy card');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadImage = async () => {
    setIsExporting(true);
    try {
      const canvas = await generateCanvas();
      if (!canvas) return;
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${track.title.replace(/[^a-z0-9]/gi, '_')}_SimpMusic_Lyrics.png`;
      a.click();
      toast.success('Lyrics card downloaded!');
    } catch {
      toast.error('Failed to download card');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 backdrop-blur-lg p-4" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-2xl rounded-3xl bg-[#090e1a]/95 border border-white/15 p-6 shadow-2xl text-white select-none backdrop-blur-2xl flex flex-col md:flex-row gap-6 max-h-[90vh] overflow-hidden"
        >
          {/* LEFT: Live Card Preview */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <div
              ref={cardRef}
              style={{ background: activeTheme.bg }}
              className="w-full max-w-[320px] aspect-[4/5] rounded-3xl p-5 shadow-2xl flex flex-col justify-between relative overflow-hidden border border-white/20"
            >
              {/* Card Inner Overlay */}
              <div className="absolute inset-0 bg-black/25 pointer-events-none" />

              {/* Card Top Branding */}
              <div className="relative z-10 flex items-center gap-2">
                <SimpLogo size={22} monochrome />
                <span className="text-xs font-bold text-white tracking-tight">SimpMusic</span>
                <span className="text-[10px] text-white/70 font-medium">• Lyrics</span>
              </div>

              {/* Card Mid: Track & Selected Lyrics */}
              <div className="relative z-10 my-auto space-y-4">
                <div className="space-y-2">
                  {selectedLyrics.map((text, i) => (
                    <p key={i} className="text-base md:text-lg font-bold text-white leading-snug drop-shadow-md">
                      "{text}"
                    </p>
                  ))}
                  {selectedLyrics.length === 0 && (
                    <p className="text-xs text-white/50 italic">Select lines on the right to quote</p>
                  )}
                </div>
              </div>

              {/* Card Bottom: Metadata & Album Art */}
              <div className="relative z-10 flex items-center gap-3 pt-3 border-t border-white/20">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/10 shrink-0 shadow-md">
                  {track.thumbnail ? (
                    <img src={track.thumbnail} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/50">
                      <Music size={16} />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-white truncate">{track.title}</p>
                  <p className="text-[11px] text-white/70 truncate">{track.artist?.name}</p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Line Selector & Actions */}
          <div className="flex-1 flex flex-col justify-between overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="text-base font-semibold">Share Lyrics Card</h3>
                <p className="text-xs text-white/50">Pick lines and card gradient</p>
              </div>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Lyrics Lines Picker */}
            <div className="flex-1 overflow-y-auto scrollbar-thin my-3 pr-1 space-y-1.5 max-h-56">
              <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider block mb-1">
                Select lines ({selectedIndices.length}/4)
              </span>
              {lyricsLines.map((line, idx) => {
                const isSelected = selectedIndices.includes(idx);
                return (
                  <button
                    key={idx}
                    onClick={() => toggleLine(idx)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex items-start justify-between gap-2 ${
                      isSelected
                        ? 'bg-sky-500/25 border border-sky-400/50 text-white font-medium'
                        : 'bg-white/5 hover:bg-white/10 text-white/70 border border-transparent'
                    }`}
                  >
                    <span className="truncate flex-1">{line.text}</span>
                    {isSelected && <Check size={14} className="text-sky-400 shrink-0 mt-0.5" />}
                  </button>
                );
              })}
              {lyricsLines.length === 0 && (
                <p className="text-xs text-white/50 py-4 text-center">No synchronized lyrics available for this track</p>
              )}
            </div>

            {/* Color Themes */}
            <div className="py-2">
              <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider block mb-2">
                Card Theme
              </span>
              <div className="flex items-center gap-2">
                {CARD_THEMES.map(theme => (
                  <button
                    key={theme.id}
                    onClick={() => setActiveThemeId(theme.id)}
                    style={{ background: theme.bg }}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${
                      activeThemeId === theme.id ? 'scale-125 border-white shadow-lg' : 'border-transparent opacity-80 hover:opacity-100'
                    }`}
                    title={theme.name}
                  />
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-white/10 flex items-center gap-2">
              <button
                onClick={handleCopyImage}
                disabled={isExporting || selectedLyrics.length === 0}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors disabled:opacity-50"
              >
                <Copy size={14} />
                <span>Copy Image</span>
              </button>
              <button
                onClick={handleDownloadImage}
                disabled={isExporting || selectedLyrics.length === 0}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold shadow-lg transition-colors disabled:opacity-50"
              >
                <Download size={14} />
                <span>Download PNG</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
