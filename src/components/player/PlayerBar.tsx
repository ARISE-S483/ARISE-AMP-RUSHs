import { useState } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { useIsMobile } from '@/hooks/use-mobile';
import { VolumeControl } from './VolumeControl';
import { downloadTrack } from '@/lib/download';
import { formatTime } from '@/lib/format';
import { toast } from 'sonner';
import { FullscreenPlayer } from './FullscreenPlayer';
import { Link } from 'react-router-dom';
import {
  Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Repeat1, Heart,
  ListMusic, Mic2, Loader2,
  Download, Disc3, FolderPlus, Plus,
  Timer, TimerOff, Radio
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrackSourceBadge } from '../common/TrackSourceBadge';

// ─── Live Radio Button ───
function LiveRadioButton() {
  const isRadioEnabled = usePlayerStore(s => s.isRadioEnabled);
  const toggleRadio = usePlayerStore(s => s.toggleRadio);

  return (
    <button
      onClick={toggleRadio}
      className={`relative p-1.5 transition-all group ${
        isRadioEnabled
          ? 'text-green-400'
          : 'text-white/60 hover:text-white'
      }`}
      title={isRadioEnabled ? 'Live Radio ON' : 'Live Radio OFF'}
    >
      <Radio size={15} className={isRadioEnabled ? 'animate-pulse' : ''} />
      {isRadioEnabled && (
        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-400 animate-ping opacity-75" />
      )}
      {isRadioEnabled && (
        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-400" />
      )}
    </button>
  );
}

// ─── Mini Add to Playlist ───
function AddToPlaylistMini() {
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const { playlists, createPlaylist, addToPlaylist } = useLibraryStore();
  const [open, setOpen] = useState(false);

  if (!currentTrack) return null;

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className={`p-1.5 transition-colors ${open ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`} title="Add to playlist">
        <FolderPlus size={16} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 8 }}
            className="absolute bottom-full mb-2 right-0 w-48 rounded-xl glass-card shadow-2xl overflow-hidden z-[70]"
          >
            <div className="max-h-40 overflow-y-auto p-1">
              {playlists.map(pl => (
                <button
                  key={pl.id}
                  onClick={() => { addToPlaylist(String(pl.id), currentTrack); toast.success('Added'); setOpen(false); }}
                  className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs text-foreground hover:bg-accent/50 transition-colors text-left"
                >
                  <ListMusic size={12} className="text-muted-foreground" />
                  <span className="truncate">{pl.title}</span>
                </button>
              ))}
              {playlists.length === 0 && (
                <p className="text-xs text-muted-foreground px-2 py-2 text-center">No playlists</p>
              )}
            </div>
            <div className="p-1 border-t border-border">
              <button
                onClick={() => {
                  const pl = createPlaylist('New Playlist');
                  addToPlaylist(String(pl.id), currentTrack);
                  toast.success('Created playlist');
                  setOpen(false);
                }}
                className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
              >
                <Plus size={12} /> New playlist
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Sleep Timer Mini ───
function SleepTimerMini() {
  const sleepTimerRemaining = usePlayerStore(s => s.sleepTimerRemaining);
  const setSleepTimer = usePlayerStore(s => s.setSleepTimer);
  const clearSleepTimer = usePlayerStore(s => s.clearSleepTimer);
  const [open, setOpen] = useState(false);
  const isActive = sleepTimerRemaining !== null && sleepTimerRemaining > 0;

  const formatRemaining = () => {
    if (!sleepTimerRemaining) return '';
    const m = Math.floor(sleepTimerRemaining / 60);
    const s = sleepTimerRemaining % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`p-1.5 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        title={isActive ? `Sleep: ${formatRemaining()}` : 'Sleep timer'}
      >
        {isActive ? <TimerOff size={16} /> : <Timer size={16} />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 8 }}
            className="absolute bottom-full mb-2 right-0 w-32 rounded-xl glass-card shadow-2xl overflow-hidden z-[70]"
          >
            <div className="p-1">
              {[5, 10, 15, 30, 45, 60].map(min => (
                <button
                  key={min}
                  onClick={() => { setSleepTimer(min); setOpen(false); }}
                  className="w-full px-3 py-1.5 text-xs text-foreground hover:bg-accent/50 rounded-lg transition-colors text-left"
                >
                  {min} min
                </button>
              ))}
              {isActive && (
                <button
                  onClick={() => { clearSleepTimer(); setOpen(false); }}
                  className="w-full px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 rounded-lg transition-colors text-left"
                >
                  Cancel
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Center Progress Bar ───
function CenterProgress() {
  const currentTime = usePlayerStore(s => s.currentTime);
  const duration = usePlayerStore(s => s.duration);
  const seek = usePlayerStore(s => s.seek);
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seek(pct * duration);
  };

  return (
    <div className="flex items-center gap-2 w-full">
      <span className="text-[10px] text-white/70 font-mono w-8 text-right flex-shrink-0">
        {formatTime(currentTime)}
      </span>
      <div
        className="flex-1 h-1 rounded-full bg-white/20 cursor-pointer group relative"
        onClick={handleClick}
      >
        <div
          className="h-full rounded-full transition-[width] duration-100"
          style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #00e5ff, #00bcd4)' }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
          style={{ left: `calc(${progress}% - 5px)` }}
        />
      </div>
      <span className="text-[10px] text-white/70 font-mono w-8 flex-shrink-0">
        {formatTime(duration)}
      </span>
    </div>
  );
}

// ─── Main PlayerBar ───
export function PlayerBar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const isPlaying = usePlayerStore(s => s.isPlaying);
  const isLoading = usePlayerStore(s => s.isLoading);
  const currentTime = usePlayerStore(s => s.currentTime);
  const duration = usePlayerStore(s => s.duration);
  const isShuffled = usePlayerStore(s => s.isShuffled);
  const repeatMode = usePlayerStore(s => s.repeatMode);
  const togglePlayPause = usePlayerStore(s => s.togglePlayPause);
  const next = usePlayerStore(s => s.next);
  const previous = usePlayerStore(s => s.previous);
  const toggleShuffle = usePlayerStore(s => s.toggleShuffle);
  const cycleRepeat = usePlayerStore(s => s.cycleRepeat);
  const toggleQueue = usePlayerStore(s => s.toggleQueue);
  const toggleLyrics = usePlayerStore(s => s.toggleLyrics);
  const isQueueOpen = usePlayerStore(s => s.isQueueOpen);
  const isLyricsOpen = usePlayerStore(s => s.isLyricsOpen);

  const { addToFavorites, removeFromFavorites, isFavorite } = useLibraryStore();
  const isMobile = useIsMobile();

  if (!currentTrack) return null;

  const liked = isFavorite(String(currentTrack.id));

  const handleDownload = async () => {
    toast.info(`Downloading "${currentTrack.title}"...`);
    try {
      await downloadTrack(currentTrack);
      toast.success('Download started!');
    } catch {
      toast.error('Download failed');
    }
  };

  // Mobile: compact bar
  if (isMobile) {
    return (
      <>
        <AnimatePresence>
          {isExpanded && <FullscreenPlayer onCollapse={() => setIsExpanded(false)} />}
        </AnimatePresence>
        <AnimatePresence>
          {!isExpanded && (
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 350 }}
              className="fixed z-[55] left-0 right-0 px-2"
              style={{ bottom: 'calc(var(--bottom-nav-height) + 8px)' }}
            >
              <div
                className="flex items-center gap-3 px-3 py-2 rounded-[20px] bg-background/60 backdrop-blur-3xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] border border-white/10 relative overflow-hidden"
                onClick={() => setIsExpanded(true)}
              >
                <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-secondary shadow-md">
                  {currentTrack.thumbnail ? (
                    <img src={currentTrack.thumbnail} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Disc3 size={16} className="text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{currentTrack.title}</p>
                  <Link 
                    to={`/artist/${encodeURIComponent(currentTrack.artist?.id || currentTrack.artist?.name || 'unknown')}`}
                    onClick={(e) => e.stopPropagation()}
                    className="hover:underline"
                  >
                    <p className="text-xs text-muted-foreground truncate">{currentTrack.artist?.name}</p>
                  </Link>
                </div>
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <button onClick={() => { liked ? removeFromFavorites(String(currentTrack.id)) : addToFavorites(currentTrack); }} className="p-1.5">
                    <Heart size={16} className={liked ? 'fill-primary text-primary' : 'text-muted-foreground'} />
                  </button>
                  <button onClick={togglePlayPause} className="p-1.5 text-foreground">
                    {isLoading ? <Loader2 size={20} className="animate-spin" /> : isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                  </button>
                  <button onClick={next} className="p-1.5 text-muted-foreground">
                    <SkipForward size={16} fill="currentColor" />
                  </button>
                </div>

                {/* Mobile Mini Progress Bar */}
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10">
                  <div
                    className="h-full bg-primary/80 transition-[width] duration-100 ease-linear rounded-r-full"
                    style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  // Desktop: full-width gradient player bar with album art background
  return (
    <>
      <AnimatePresence>
        {isExpanded && <FullscreenPlayer onCollapse={() => setIsExpanded(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {!isExpanded && (
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            className="fixed z-50"
            style={{
              bottom: 12,
              left: 130,
              width: '75%',
            }}
          >
            <div
              className="vision-border relative overflow-hidden h-[64px] rounded-2xl"
              onDoubleClick={() => setIsExpanded(true)}
              style={{
                background: 'transparent',
                backdropFilter: 'blur(30px) saturate(120%)',
                WebkitBackdropFilter: 'blur(30px) saturate(120%)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.15), inset 0 1px 0 0 rgba(255,255,255,0.15), inset 0 -1px 0 0 rgba(255,255,255,0.05)',
              }}
            >
              {/* Removed album art background to match main app transparency */}

              {/* Content */}
              <div className="relative z-[2] flex items-center h-full px-4 gap-4">

                {/* LEFT: Album art + track info */}
                <button
                  onClick={() => setIsExpanded(true)}
                  className="flex items-center gap-3 min-w-0 w-[220px] flex-shrink-0 text-left"
                >
                  <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 shadow-lg ring-2 ring-white/20">
                    {currentTrack.thumbnail ? (
                      <img src={currentTrack.thumbnail} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-white/20 flex items-center justify-center">
                        <Disc3 size={18} className="text-white/60" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-white truncate leading-tight drop-shadow-sm">{currentTrack.title}</p>
                      {currentTrack.explicit && (
                        <span className="flex-shrink-0 w-3.5 h-3.5 rounded-[2px] bg-white/15 border border-white/25 flex items-center justify-center text-[8px] font-bold text-white/80">E</span>
                      )}
                      <TrackSourceBadge track={currentTrack} />
                    </div>
                    <Link 
                      to={`/artist/${encodeURIComponent(currentTrack.artist?.id || currentTrack.artist?.name || 'unknown')}`}
                      onClick={(e) => e.stopPropagation()}
                      className="hover:underline block w-fit"
                    >
                      <p className="text-xs text-white/70 truncate leading-tight mt-0.5">{currentTrack.artist?.name}</p>
                    </Link>
                  </div>
                </button>

                {/* CENTER: Transport + Progress */}
                <div className="flex-1 flex flex-col items-center justify-center gap-0.5 min-w-0 max-w-2xl mx-auto">
                  {/* Transport controls */}
                  <div className="flex items-center gap-4">
                    <button onClick={previous} className="p-1 text-white/80 hover:text-white transition-colors">
                      <SkipBack size={16} fill="currentColor" />
                    </button>
                    <button
                      onClick={togglePlayPause}
                      className="p-1 text-white hover:scale-110 transition-transform"
                    >
                      {isLoading ? (
                        <Loader2 size={20} className="animate-spin" />
                      ) : isPlaying ? (
                        <Pause size={20} fill="currentColor" />
                      ) : (
                        <Play size={20} fill="currentColor" className="ml-0.5" />
                      )}
                    </button>
                    <button onClick={next} className="p-1 text-white/80 hover:text-white transition-colors">
                      <SkipForward size={16} fill="currentColor" />
                    </button>
                  </div>

                  {/* Progress bar */}
                  <CenterProgress />
                </div>

                {/* RIGHT: Queue + Volume */}
                <div className="flex items-center gap-2 flex-shrink-0 w-[220px] justify-end" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => liked ? removeFromFavorites(String(currentTrack.id)) : addToFavorites(currentTrack)}
                    className="p-1.5 transition-colors"
                  >
                    <Heart size={15} className={liked ? 'fill-pink-400 text-pink-400' : 'text-white/60 hover:text-white'} />
                  </button>
                  <LiveRadioButton />
                  <button onClick={toggleQueue} className={`p-1.5 transition-colors ${isQueueOpen ? 'text-cyan-300' : 'text-white/60 hover:text-white'}`}>
                    <ListMusic size={15} />
                  </button>
                  <VolumeControl />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
