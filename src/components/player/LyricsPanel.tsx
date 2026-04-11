import { useEffect, useState, useRef, useCallback } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { useIsMobile } from '@/hooks/use-mobile';
import { musicAPI } from '@/api/musicAPI';
import { X, Music, Globe, RotateCcw, Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LyricsLine { time: number; text: string; }

const OFFSET_STEP = 0.1; // seconds
const OFFSET_STORAGE_KEY = 'melodies_lyrics_offset_';

function getStoredOffset(trackId: string | number): number {
  try {
    const val = localStorage.getItem(OFFSET_STORAGE_KEY + trackId);
    return val ? parseFloat(val) : 0;
  } catch { return 0; }
}

function storeOffset(trackId: string | number, offset: number) {
  try {
    if (offset === 0) localStorage.removeItem(OFFSET_STORAGE_KEY + trackId);
    else localStorage.setItem(OFFSET_STORAGE_KEY + trackId, String(offset));
  } catch { /* */ }
}

export function LyricsPanel() {
  const isOpen = usePlayerStore(s => s.isLyricsOpen);
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const currentTime = usePlayerStore(s => s.currentTime);
  const toggleLyrics = usePlayerStore(s => s.toggleLyrics);
  const seek = usePlayerStore(s => s.seek);
  const isMobile = useIsMobile();

  const [lyrics, setLyrics] = useState<LyricsLine[]>([]);
  const [synced, setSynced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [source, setSource] = useState('');
  const [offset, setOffsetState] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  // Load offset when track changes
  useEffect(() => {
    if (currentTrack) {
      setOffsetState(getStoredOffset(currentTrack.id));
    }
  }, [currentTrack?.id]);

  const setOffset = useCallback((newOffset: number) => {
    const rounded = Math.round(newOffset * 10) / 10;
    setOffsetState(rounded);
    if (currentTrack) storeOffset(currentTrack.id, rounded);
  }, [currentTrack]);

  useEffect(() => {
    if (!currentTrack || !isOpen) return;
    setLoading(true); setError(''); setLyrics([]); setSource('');

    const albumName = currentTrack.album?.title;
    const duration = currentTrack.duration;

    musicAPI.getLyrics(currentTrack.title, currentTrack.artist.name, albumName, duration).then(result => {
      if (result) { setLyrics(result.lines); setSynced(result.synced); setSource(result.source); }
      else setError('No lyrics found');
      setLoading(false);
    }).catch(() => { setError('Failed to load lyrics'); setLoading(false); });
  }, [currentTrack?.id, isOpen]);

  useEffect(() => {
    if (synced && activeLineRef.current) {
      activeLineRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentTime, synced]);

  // Apply offset to current time for active line calculation
  const adjustedTime = currentTime + offset;

  const activeLine = (() => {
    if (!synced) return -1;
    for (let i = lyrics.length - 1; i >= 0; i--) {
      if (adjustedTime >= lyrics[i].time) return i;
    }
    return -1;
  })();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: isMobile ? '100%' : 320 }}
          animate={{ x: 0 }}
          exit={{ x: isMobile ? '100%' : 320 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className={`fixed z-40 flex flex-col bg-background/95 backdrop-blur-xl border-l border-border ${
            isMobile ? 'inset-y-0 right-0 w-full' : 'right-0 top-0 bottom-[90px] w-[380px]'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-sm text-foreground">Lyrics</h3>
              {source && (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Globe size={10} />
                  <span>{source}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              {/* Timing offset controls */}
              {synced && (
                <div className="flex items-center gap-0.5 mr-2 bg-secondary/60 rounded-lg px-1.5 py-0.5">
                  <button
                    onClick={() => setOffset(offset - OFFSET_STEP)}
                    className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                    title="Decrease offset"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="text-[10px] font-mono text-foreground min-w-[42px] text-center">
                    {offset >= 0 ? '+' : ''}{offset.toFixed(1)}s
                  </span>
                  <button
                    onClick={() => setOffset(offset + OFFSET_STEP)}
                    className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                    title="Increase offset"
                  >
                    <Plus size={12} />
                  </button>
                  {offset !== 0 && (
                    <button
                      onClick={() => setOffset(0)}
                      className="p-0.5 text-muted-foreground hover:text-foreground transition-colors ml-0.5"
                      title="Reset offset"
                    >
                      <RotateCcw size={10} />
                    </button>
                  )}
                </div>
              )}
              <button onClick={toggleLyrics} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Lyrics content */}
          <div ref={containerRef} className="flex-1 overflow-y-auto scrollbar-thin px-6 py-8">
            {loading && (
              <div className="flex flex-col items-center justify-center h-40 gap-3">
                <div className="w-6 h-6 border-2 border-muted-foreground border-t-foreground rounded-full animate-spin" />
                <p className="text-xs text-muted-foreground">Finding lyrics...</p>
              </div>
            )}
            {error && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Music size={32} className="text-muted-foreground/20" />
                <p className="text-center text-muted-foreground text-sm">{error}</p>
              </div>
            )}
            {lyrics.map((line, i) => (
              <div
                key={i}
                ref={i === activeLine ? activeLineRef : undefined}
                className={`py-2 cursor-pointer transition-all duration-500 leading-relaxed ${
                  synced
                    ? i === activeLine
                      ? 'text-foreground text-xl md:text-2xl font-bold scale-[1.02] origin-left'
                      : i < activeLine
                        ? 'text-muted-foreground/30 text-base'
                        : 'text-muted-foreground/50 text-base'
                    : 'text-foreground/90 text-base leading-loose'
                }`}
                onClick={() => synced && seek(line.time)}
              >
                {line.text || '♪'}
              </div>
            ))}
            {/* Bottom padding for scroll */}
            <div className="h-32" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
