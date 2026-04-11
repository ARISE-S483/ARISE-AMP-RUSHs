import { useRef, useCallback } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatTime } from '@/lib/format';
import { downloadTrack } from '@/lib/download';
import { toast } from 'sonner';
import {
  Pause, X, GripVertical, Trash2, Radio,
  Heart, Download, Music2, FolderPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrackSourceBadge } from '../common/TrackSourceBadge';

export function QueuePanel() {
  const isOpen = usePlayerStore(s => s.isQueueOpen);
  const queue = usePlayerStore(s => s.queue);
  const queueIndex = usePlayerStore(s => s.queueIndex);
  const isPlaying = usePlayerStore(s => s.isPlaying);
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const isRadioEnabled = usePlayerStore(s => s.isRadioEnabled);
  const isFetchingRadio = usePlayerStore(s => s.isFetchingRadio);
  const play = usePlayerStore(s => s.play);
  const removeFromQueue = usePlayerStore(s => s.removeFromQueue);
  const clearQueue = usePlayerStore(s => s.clearQueue);
  const toggleQueue = usePlayerStore(s => s.toggleQueue);
  const reorderQueue = usePlayerStore(s => s.reorderQueue);
  const isMobile = useIsMobile();

  const { addToFavorites, removeFromFavorites, isFavorite } = useLibraryStore();

  const totalDuration = queue.reduce((sum, t) => sum + (t.duration || 0), 0);

  // Drag reorder
  const dragIndexRef = useRef<number | null>(null);
  const dragOverIndexRef = useRef<number | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    dragIndexRef.current = index;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    if (e.currentTarget instanceof HTMLElement) e.currentTarget.style.opacity = '0.4';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    dragOverIndexRef.current = index;
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) e.currentTarget.style.opacity = '1';
    const from = dragIndexRef.current;
    const to = dragOverIndexRef.current;
    if (from !== null && to !== null && from !== to) reorderQueue(from, to);
    dragIndexRef.current = null;
    dragOverIndexRef.current = null;
  }, [reorderQueue]);

  // Touch drag
  const touchStartRef = useRef<{ index: number; y: number } | null>(null);

  const handleTouchStart = useCallback((index: number, e: React.TouchEvent) => {
    touchStartRef.current = { index, y: e.touches[0].clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const deltaY = touch.clientY - touchStartRef.current.y;
    const itemHeight = 56;
    const steps = Math.round(deltaY / itemHeight);
    if (steps !== 0) {
      const from = touchStartRef.current.index;
      const to = Math.max(0, Math.min(queue.length - 1, from + steps));
      if (from !== to) reorderQueue(from, to);
    }
    touchStartRef.current = null;
  }, [queue.length, reorderQueue]);

  const handleDownloadAll = async () => {
    const upNext = queue.slice(queueIndex + 1);
    if (upNext.length === 0) return;
    toast.info(`Downloading ${upNext.length} tracks...`);
    for (const track of upNext) {
      try { await downloadTrack(track); } catch { /* continue */ }
    }
  };

  const handleFavoriteAll = () => {
    const upNext = queue.slice(queueIndex + 1);
    let added = 0;
    for (const track of upNext) {
      if (!isFavorite(String(track.id))) {
        addToFavorites(track);
        added++;
      }
    }
    if (added > 0) toast.success(`Added ${added} tracks to favorites`);
    else toast.info('All tracks already in favorites');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Clickable Fullscreen Dimming Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={toggleQueue}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[50]"
          />

          {/* Floating Queue Modal */}
          <motion.div
            initial={isMobile ? { y: '100%', opacity: 0 } : { y: 40, scale: 0.95, opacity: 0 }}
            animate={isMobile ? { y: 0, opacity: 1 } : { y: 0, scale: 1, opacity: 1 }}
            exit={isMobile ? { y: '100%', opacity: 0 } : { y: 40, scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className={`fixed z-[60] flex flex-col overflow-hidden bg-background/80 backdrop-blur-3xl shadow-2xl origin-bottom ${
              isMobile 
                ? 'inset-x-0 bottom-0 h-[85vh] rounded-t-[32px] border-t border-white/10' 
                : 'right-4 bottom-[100px] top-24 w-[420px] rounded-3xl border border-white/10'
            }`}
          >
            {/* Dynamic Glass Background within the Modal */}
            {currentTrack?.thumbnailLarge && (
              <div
                className="absolute inset-0 z-[-1] opacity-30 transition-all duration-1000 bg-cover bg-center"
                style={{
                  backgroundImage: `url(${currentTrack.thumbnailLarge})`,
                  filter: 'saturate(200%) blur(40px)',
                }}
              />
            )}

            {/* Header - monochrome style */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-base text-foreground">Queue</h3>
              {isRadioEnabled && (
                <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                  <Radio size={10} />
                  Radio
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleDownloadAll}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                title="Download all"
              >
                <Download size={16} />
              </button>
              <button
                onClick={handleFavoriteAll}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                title="Favorite all"
              >
                <Heart size={16} />
              </button>
              <button
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                title="Add all to playlist"
              >
                <FolderPlus size={16} />
              </button>
              {queue.length > 1 && (
                <button
                  onClick={clearQueue}
                  className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                  title="Clear queue"
                >
                  <Trash2 size={16} />
                </button>
              )}
              <button onClick={toggleQueue} className="p-2 text-muted-foreground hover:text-foreground transition-colors ml-1">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Queue items - monochrome style with visible actions */}
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {queue.map((track, i) => {
              const isCurrent = i === queueIndex;
              const isPast = i < queueIndex;
              const liked = isFavorite(String(track.id));

              return (
                <motion.div
                  key={`${track.id}-${i}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: isPast ? 0.35 : 1, x: 0 }}
                  transition={{ delay: Math.min(i, 30) * 0.03, type: 'spring', stiffness: 400, damping: 30 }}
                  whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                  draggable={!isCurrent}
                  onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, i)}
                  onDragOver={(e) => handleDragOver(e as unknown as React.DragEvent, i)}
                  onDragEnd={(e) => handleDragEnd(e as unknown as React.DragEvent)}
                  onTouchStart={(e) => handleTouchStart(i, e as unknown as React.TouchEvent)}
                  onTouchEnd={(e) => handleTouchEnd(e as unknown as React.TouchEvent)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 mx-2 my-0.5 rounded-xl cursor-pointer transition-colors group ${
                    isCurrent
                      ? 'bg-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.1)] ring-1 ring-white/10'
                      : ''
                  }`}
                  onClick={() => !isCurrent && play(track, queue, i)}
                >
                  {/* Drag handle / playing indicator */}
                  <div className="w-5 flex-shrink-0 flex items-center justify-center">
                    {isCurrent ? (
                      isPlaying ? (
                        <div className="flex items-end gap-[2px] h-3.5">
                          <div className="w-[2px] bg-primary animate-pulse h-full rounded-full" />
                          <div className="w-[2px] bg-primary animate-pulse h-2/3 rounded-full" style={{ animationDelay: '0.15s' }} />
                          <div className="w-[2px] bg-primary animate-pulse h-1/3 rounded-full" style={{ animationDelay: '0.3s' }} />
                        </div>
                      ) : (
                        <Pause size={12} className="text-primary" />
                      )
                    ) : (
                      <GripVertical size={14} className="text-muted-foreground/30 group-hover:text-muted-foreground cursor-grab transition-colors" />
                    )}
                  </div>

                  {/* Thumbnail */}
                  <div className={`w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-secondary/50 ${
                    isCurrent ? 'ring-2 ring-primary/40' : ''
                  }`}>
                    {track.thumbnail ? (
                      <img
                        src={track.thumbnail}
                        alt={track.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          if (target.nextElementSibling) {
                            (target.nextElementSibling as HTMLElement).style.display = 'flex';
                          }
                        }}
                      />
                    ) : null}
                    <div className={`w-full h-full flex items-center justify-center ${track.thumbnail ? 'hidden' : 'flex'}`}>
                      <Music2 size={18} className="text-muted-foreground/40" />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className={`text-sm font-medium truncate ${isCurrent ? 'text-primary' : 'text-foreground'}`}>
                        {track.title || 'Unknown Track'}
                      </p>
                      <TrackSourceBadge track={track} />
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {track.artist?.name || 'Unknown Artist'}
                    </p>
                  </div>

                  {/* Duration */}
                  <span className="text-xs text-muted-foreground font-mono flex-shrink-0">
                    {formatTime(track.duration)}
                  </span>

                  {/* Actions - always visible like monochrome */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      liked ? removeFromFavorites(String(track.id)) : addToFavorites(track);
                    }}
                    className="p-1 flex-shrink-0 transition-colors"
                  >
                    <Heart size={15} className={liked ? 'fill-primary text-primary' : 'text-muted-foreground/30 hover:text-foreground'} />
                  </button>
                  {!isCurrent && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFromQueue(i); }}
                      className="p-1 text-muted-foreground/30 hover:text-destructive flex-shrink-0 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </motion.div>
              );
            })}

            {isFetchingRadio && (
              <p className="text-xs text-primary p-4 text-center animate-pulse">Loading radio tracks...</p>
            )}
            {queue.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Music2 size={32} className="text-muted-foreground/20" />
                <p className="text-xs text-muted-foreground">
                  {isRadioEnabled ? 'Radio will add tracks automatically' : 'Queue is empty. Play something!'}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
  );
}
