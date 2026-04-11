import { useState, useEffect, useRef, useCallback, forwardRef } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useIsMobile } from '@/hooks/use-mobile';
import { ProgressBar } from './ProgressBar';
import { VolumeControl } from './VolumeControl';
import { Visualizer } from './Visualizer';
import { downloadTrack } from '@/lib/download';
import { formatTime } from '@/lib/format';
import { musicAPI } from '@/api/musicAPI';
import { toast } from 'sonner';
import {
  Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Repeat1, Heart,
  ListMusic, Mic2, AudioWaveform, Loader2,
  Download, Disc3, ChevronDown, FolderPlus, Plus,
  Radio, Timer, TimerOff, X, GripVertical,
  Trash2, Music, Music2, Globe, RotateCcw,
  Minus, Link2
} from 'lucide-react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';

// ─── Types ───
type FullscreenTab = 'player' | 'lyrics' | 'queue';
interface LyricsLine { time: number; text: string; }

const OFFSET_STEP = 0.1;
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

// ─── Add to Playlist Menu ───
const AddToPlaylistMenu = forwardRef<HTMLDivElement, { size?: number }>(
  function AddToPlaylistMenu({ size = 22 }, ref) {
    const [open, setOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [name, setName] = useState('');
    const innerRef = useRef<HTMLDivElement>(null);
    const currentTrack = usePlayerStore(s => s.currentTrack);
    const { playlists, createPlaylist, addToPlaylist } = useLibraryStore();

    useEffect(() => {
      const handler = (e: MouseEvent) => {
        if (innerRef.current && !innerRef.current.contains(e.target as Node)) {
          setOpen(false);
          setCreating(false);
        }
      };
      if (open) document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    if (!currentTrack) return null;

    const handleAdd = (playlistId: string) => {
      addToPlaylist(playlistId, currentTrack);
      toast.success('Added to playlist');
      setOpen(false);
    };

    const handleCreate = () => {
      if (name.trim()) {
        const pl = createPlaylist(name.trim());
        addToPlaylist(String(pl.id), currentTrack);
        toast.success(`Created "${name.trim()}" and added track`);
        setName('');
        setCreating(false);
        setOpen(false);
      }
    };

    return (
      <div className="relative" ref={(node) => {
        (innerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }}>
        <button
          onClick={() => setOpen(!open)}
          className={`p-2.5 rounded-full transition-colors ${open ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          title="Add to playlist"
        >
          <FolderPlus size={size} />
        </button>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 8 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-52 rounded-xl bg-card border border-border shadow-xl overflow-hidden z-[70]"
            >
              <div className="p-2 border-b border-border">
                <p className="text-xs font-medium text-muted-foreground px-2 py-1">Add to playlist</p>
              </div>
              <div className="max-h-48 overflow-y-auto scrollbar-thin p-1">
                {playlists.map(pl => (
                  <button
                    key={pl.id}
                    onClick={() => handleAdd(String(pl.id))}
                    className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-sm text-foreground hover:bg-accent/50 transition-colors text-left"
                  >
                    <ListMusic size={14} className="text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{pl.title}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">{pl.trackCount}</span>
                  </button>
                ))}
                {playlists.length === 0 && !creating && (
                  <p className="text-xs text-muted-foreground px-2.5 py-3 text-center">No playlists yet</p>
                )}
              </div>
              <div className="p-1.5 border-t border-border">
                {creating ? (
                  <div className="flex items-center gap-1.5 px-1">
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false); }}
                      placeholder="Playlist name..."
                      className="flex-1 px-2 py-1.5 text-xs bg-input rounded-md border border-border outline-none focus:ring-1 focus:ring-ring"
                      autoFocus
                    />
                    <button onClick={handleCreate} className="text-xs text-primary font-medium px-2 py-1.5">Add</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setCreating(true)}
                    className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                  >
                    <Plus size={14} />
                    <span>New playlist</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

// ─── Sleep Timer ───
function SleepTimerButton({ size = 22 }: { size?: number }) {
  const [showMenu, setShowMenu] = useState(false);
  const sleepTimerRemaining = usePlayerStore(s => s.sleepTimerRemaining);
  const setSleepTimer = usePlayerStore(s => s.setSleepTimer);
  const clearSleepTimer = usePlayerStore(s => s.clearSleepTimer);
  const menuRef = useRef<HTMLDivElement>(null);

  const isActive = sleepTimerRemaining !== null && sleepTimerRemaining > 0;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    if (showMenu) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  const formatRemaining = () => {
    if (!sleepTimerRemaining) return '';
    const m = Math.floor(sleepTimerRemaining / 60);
    const s = sleepTimerRemaining % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={`p-2.5 rounded-full transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        title={isActive ? `Sleep timer: ${formatRemaining()}` : 'Sleep timer'}
      >
        {isActive ? <TimerOff size={size} /> : <Timer size={size} />}
      </button>
      {isActive && (
        <span className="absolute -top-1 -right-1 text-[8px] bg-primary text-primary-foreground rounded-full px-1 font-mono">
          {formatRemaining()}
        </span>
      )}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 8 }}
            className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-36 rounded-xl bg-card border border-border shadow-xl overflow-hidden z-[70]"
          >
            <div className="p-1">
              {[5, 10, 15, 30, 45, 60].map(min => (
                <button
                  key={min}
                  onClick={() => { setSleepTimer(min); setShowMenu(false); }}
                  className="w-full px-3 py-1.5 text-sm text-foreground hover:bg-accent/50 rounded-lg transition-colors text-left"
                >
                  {min} min
                </button>
              ))}
              {isActive && (
                <button
                  onClick={() => { clearSleepTimer(); setShowMenu(false); }}
                  className="w-full px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors text-left"
                >
                  Cancel timer
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Source Quality Badge ───
function TrackSourceBadge({ track, large = false }: { track: any, large?: boolean }) {
  if (!track?.source) return null;
  
  const sourceStr = track.source.toLowerCase();
  let label = '';
  let colorClass = '';

  if (sourceStr === 'youtube' || sourceStr === 'piped') {
    label = 'OPUS';
    colorClass = 'bg-red-500/20 text-red-400 border-red-500/30';
  } else if (sourceStr === 'tidal' || sourceStr === 'monocrate') {
    label = 'HD/LOSSLESS/HIFI';
    colorClass = 'bg-cyan-400/20 text-cyan-300 border-cyan-400/30';
  } else if (sourceStr === 'jiosaavn') {
    label = 'JioSaavn';
    colorClass = 'bg-green-500/20 text-green-400 border-green-500/30';
  } else {
    label = sourceStr;
    colorClass = 'bg-white/10 text-white/70 border-white/20';
  }

  return (
    <span className={`px-1.5 py-0.5 rounded font-mono leading-none border uppercase ${colorClass} ${
      large ? 'text-[10px]' : 'text-[8px]'
    }`}>
      {label}
    </span>
  );
}

function PlayerTab({ activeTab, setActiveTab, onCollapse }: { activeTab: FullscreenTab; setActiveTab: (tab: FullscreenTab) => void; onCollapse: () => void }) {
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const isPlaying = usePlayerStore(s => s.isPlaying);
  const isLoading = usePlayerStore(s => s.isLoading);
  const isShuffled = usePlayerStore(s => s.isShuffled);
  const repeatMode = usePlayerStore(s => s.repeatMode);
  const isVisualizerActive = usePlayerStore(s => s.isVisualizerActive);
  const isRadioEnabled = usePlayerStore(s => s.isRadioEnabled);
  const queue = usePlayerStore(s => s.queue);
  const queueIndex = usePlayerStore(s => s.queueIndex);
  const togglePlayPause = usePlayerStore(s => s.togglePlayPause);
  const next = usePlayerStore(s => s.next);
  const previous = usePlayerStore(s => s.previous);
  const toggleShuffle = usePlayerStore(s => s.toggleShuffle);
  const cycleRepeat = usePlayerStore(s => s.cycleRepeat);
  const toggleVisualizer = usePlayerStore(s => s.toggleVisualizer);
  const toggleRadio = usePlayerStore(s => s.toggleRadio);
  const initAudioContext = usePlayerStore(s => s.initAudioContext);
  const toggleQueue = usePlayerStore(s => s.toggleQueue);
  const isMobile = useIsMobile();

  const { addToFavorites, removeFromFavorites, isFavorite } = useLibraryStore();

  if (!currentTrack) return null;

  const liked = isFavorite(String(currentTrack.id));
  const nextTrack = queueIndex + 1 < queue.length ? queue[queueIndex + 1] : null;

  const handleVisualizerToggle = () => {
    initAudioContext();
    toggleVisualizer();
  };

  const handleDownload = async () => {
    toast.info(`Downloading "${currentTrack.title}"...`);
    try {
      await downloadTrack(currentTrack);
      toast.success('Download started!');
    } catch {
      toast.error('Download failed');
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/search?q=${encodeURIComponent(currentTrack.title + ' ' + (currentTrack.artist?.name || ''))}`;
    navigator.clipboard.writeText(url).then(() => toast.success('Link copied!')).catch(() => {});
  };

  if (isMobile) {
    return (
      <div className="flex flex-col items-center w-full max-w-sm mx-auto px-6 flex-1 justify-between py-6">
        {/* Top collapse bar */}
        <div className="w-full flex items-center justify-between">
            <button onClick={onCollapse} className="p-2 -ml-2 text-white/70 hover:text-white">
                <ChevronDown size={28} />
            </button>
            <button className="p-2 -mr-2 text-white/70 hover:text-white">
                <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-current" />
                    <div className="w-1.5 h-1.5 rounded-full bg-current" />
                    <div className="w-1.5 h-1.5 rounded-full bg-current" />
                </div>
            </button>
        </div>

        {/* Title and Artist Centered */}
        <div className="text-center w-full space-y-1 mt-4">
          <h2 className="text-2xl font-semibold text-white tracking-wide truncate">{currentTrack.title}</h2>
          <p className="text-sm font-light text-white/60 tracking-wider truncate">{currentTrack.artist?.name}</p>
        </div>

        {/* Massive Circular Art */}
        <div className="flex-1 flex flex-col justify-center w-full max-h-[50vh]">
          <div className="relative aspect-square w-full max-w-[320px] mx-auto rounded-full overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-[4px] border-white/5">
            {currentTrack.thumbnail ? (
              <img
                src={currentTrack.thumbnailLarge || currentTrack.thumbnail}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-white/5 flex items-center justify-center">
                <Disc3 size={80} className="text-white/20" />
              </div>
            )}
          </div>
        </div>

        {/* Controls Area */}
        <div className="w-full space-y-8 pb-4">
          <div className="w-full">
            <ProgressBar />
          </div>

          <div className="flex items-center justify-around translate-y-2">
             <button onClick={previous} className="p-2 text-white/80 hover:text-white hover:scale-110 transition-transform">
              <SkipBack size={32} fill="currentColor" />
             </button>
             <button
              onClick={togglePlayPause}
              className="p-4 text-white hover:scale-105 transition-transform"
             >
                {isLoading ? (
                  <Loader2 size={40} className="animate-spin" />
                ) : isPlaying ? (
                  <Pause size={48} fill="currentColor" />
                ) : (
                  <Play size={48} fill="currentColor" className="ml-2" />
                )}
             </button>
             <button onClick={next} className="p-2 text-white/80 hover:text-white hover:scale-110 transition-transform">
               <SkipForward size={32} fill="currentColor" />
             </button>
          </div>

          {/* Bottom Dock */}
          <div className="flex items-center justify-between w-full pt-4">
             <button onClick={toggleShuffle} className={`p-2 transition-colors ${isShuffled ? 'text-white' : 'text-white/40'}`}>
                <Shuffle size={20} />
             </button>
             <button onClick={() => liked ? removeFromFavorites(String(currentTrack.id)) : addToFavorites(currentTrack)} className="p-2 transition-colors">
                <Heart size={20} className={liked ? 'fill-white text-white' : 'text-white/40'} />
             </button>
             <button onClick={handleDownload} className="p-2 transition-colors text-white/40 hover:text-white">
                <Download size={20} />
             </button>
             <button onClick={() => setActiveTab('lyrics')} className="p-2 transition-colors text-white/40 hover:text-white">
                <Mic2 size={20} />
             </button>
             <button onClick={() => setActiveTab('queue')} className="p-2 transition-colors text-white/40 hover:text-white">
                <ListMusic size={20} />
             </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto px-6 flex-1 justify-center gap-5">
      {/* Square album art - monochrome style */}
      <div className="relative flex-shrink-0">
        <div className="w-56 h-56 md:w-64 md:h-64 rounded-2xl overflow-hidden shadow-2xl shadow-black/40 border border-border/20">
          {currentTrack.thumbnail ? (
            <img
              src={currentTrack.thumbnailLarge || currentTrack.thumbnail}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-secondary flex items-center justify-center">
              <Disc3 size={64} className="text-muted-foreground" />
            </div>
          )}
        </div>
      </div>

      {/* Track info */}
      <div className="text-center w-full space-y-1.5">
        <h2 className="text-xl md:text-2xl font-bold text-foreground truncate">{currentTrack.title}</h2>
        <div className="flex items-center justify-center gap-2">
          <Link 
            to={`/artist/${encodeURIComponent(currentTrack.artist?.id || currentTrack.artist?.name || 'unknown')}`}
            className="hover:underline"
            onClick={onCollapse}
          >
            <p className="text-sm text-muted-foreground truncate">{currentTrack.artist?.name}</p>
          </Link>
          <TrackSourceBadge track={currentTrack} large />
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full">
        <ProgressBar />
      </div>

      {/* Transport controls */}
      <div className="flex items-center gap-7">
        <button
          onClick={toggleShuffle}
          className={`p-2 transition-colors ${isShuffled ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Shuffle size={20} />
        </button>
        <button onClick={previous} className="p-2 text-foreground hover:scale-110 transition-transform">
          <SkipBack size={28} fill="currentColor" />
        </button>
        <button
          onClick={togglePlayPause}
          className="w-16 h-16 rounded-full bg-foreground text-background flex items-center justify-center hover:scale-105 transition-transform shadow-lg"
        >
          {isLoading ? (
            <Loader2 size={28} className="animate-spin" />
          ) : isPlaying ? (
            <Pause size={28} fill="currentColor" />
          ) : (
            <Play size={28} fill="currentColor" className="ml-1" />
          )}
        </button>
        <button onClick={next} className="p-2 text-foreground hover:scale-110 transition-transform">
          <SkipForward size={28} fill="currentColor" />
        </button>
        <button
          onClick={cycleRepeat}
          className={`p-2 transition-colors ${repeatMode !== 'off' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          {repeatMode === 'one' ? <Repeat1 size={20} /> : <Repeat size={20} />}
        </button>
      </div>

      {/* Action buttons row - monochrome style */}
      <div className="flex items-center justify-center gap-1">
        <button
          onClick={() => liked ? removeFromFavorites(String(currentTrack.id)) : addToFavorites(currentTrack)}
          className="p-2.5 rounded-full transition-colors"
        >
          <Heart size={22} className={liked ? 'fill-primary text-primary' : 'text-muted-foreground hover:text-foreground'} />
        </button>
        <AddToPlaylistMenu size={22} />
        <button onClick={handleDownload} className="p-2.5 rounded-full text-muted-foreground hover:text-foreground transition-colors">
          <Download size={22} />
        </button>
        <button onClick={handleShare} className="p-2.5 rounded-full text-muted-foreground hover:text-foreground transition-colors">
          <Link2 size={22} />
        </button>
        <button onClick={() => toggleQueue()} className="p-2.5 rounded-full text-muted-foreground hover:text-foreground transition-colors">
          <ListMusic size={22} />
        </button>
        <button onClick={handleVisualizerToggle} className={`p-2.5 rounded-full transition-colors ${isVisualizerActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
          <AudioWaveform size={22} />
        </button>
        <button
          onClick={toggleRadio}
          className={`p-2.5 rounded-full transition-colors ${isRadioEnabled ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          title={isRadioEnabled ? 'Radio: ON' : 'Radio: OFF'}
        >
          <Radio size={22} />
        </button>
      </div>

      {/* Tab switcher - monochrome pill style */}
      <div className="flex items-center justify-center gap-1 bg-secondary/40 rounded-full p-0.5 w-fit mx-auto">
        {(['queue', 'player', 'lyrics'] as FullscreenTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-full transition-all ${
              activeTab === tab
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'player' ? (
              <Music size={16} />
            ) : tab === 'lyrics' ? (
              <Mic2 size={16} />
            ) : (
              <ListMusic size={16} />
            )}
          </button>
        ))}
      </div>

      {/* Bottom: Sleep timer + Volume */}
      <div 
        className="flex items-center justify-center gap-2 pt-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
      >
        <SleepTimerButton size={18} />
        <VolumeControl />
      </div>
    </div>
  );
}

// ─── Tab: Lyrics ───
function LyricsTab() {
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const currentTime = usePlayerStore(s => s.currentTime);
  const seek = usePlayerStore(s => s.seek);

  const [lyrics, setLyrics] = useState<LyricsLine[]>([]);
  const [synced, setSynced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [source, setSource] = useState('');
  const [offset, setOffsetState] = useState(0);
  const activeLineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentTrack) setOffsetState(getStoredOffset(currentTrack.id));
  }, [currentTrack?.id]);

  const setOffset = useCallback((newOffset: number) => {
    const rounded = Math.round(newOffset * 10) / 10;
    setOffsetState(rounded);
    if (currentTrack) storeOffset(currentTrack.id, rounded);
  }, [currentTrack]);

  useEffect(() => {
    if (!currentTrack) return;
    setLoading(true); setError(''); setLyrics([]); setSource('');
    const albumName = currentTrack.album?.title;
    const duration = currentTrack.duration;
    musicAPI.getLyrics(currentTrack.title, currentTrack.artist?.name || '', albumName, duration).then(result => {
      if (result) { setLyrics(result.lines); setSynced(result.synced); setSource(result.source); }
      else setError('No lyrics found');
      setLoading(false);
    }).catch(() => { setError('Failed to load lyrics'); setLoading(false); });
  }, [currentTrack?.id]);

  useEffect(() => {
    if (synced && activeLineRef.current) {
      activeLineRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentTime, synced]);

  const adjustedTime = currentTime + offset;
  const activeLine = (() => {
    if (!synced) return -1;
    for (let i = lyrics.length - 1; i >= 0; i--) {
      if (adjustedTime >= lyrics[i].time) return i;
    }
    return -1;
  })();

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full max-w-lg mx-auto">
      {/* Lyrics header with offset controls */}
      <div className="flex items-center justify-between px-6 py-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          {source && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Globe size={10} />
              <span>{source}</span>
            </div>
          )}
        </div>
        {synced && (
          <div className="flex items-center gap-0.5 bg-secondary/40 rounded-lg px-1.5 py-0.5">
            <button onClick={() => setOffset(offset - OFFSET_STEP)} className="p-0.5 text-muted-foreground hover:text-foreground transition-colors">
              <Minus size={12} />
            </button>
            <span className="text-[10px] font-mono text-foreground min-w-[42px] text-center">
              {offset >= 0 ? '+' : ''}{offset.toFixed(1)}s
            </span>
            <button onClick={() => setOffset(offset + OFFSET_STEP)} className="p-0.5 text-muted-foreground hover:text-foreground transition-colors">
              <Plus size={12} />
            </button>
            {offset !== 0 && (
              <button onClick={() => setOffset(0)} className="p-0.5 text-muted-foreground hover:text-foreground transition-colors ml-0.5">
                <RotateCcw size={10} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Lyrics body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-4">
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
            className={`py-2.5 cursor-pointer transition-all duration-500 leading-relaxed ${
              synced
                ? i === activeLine
                  ? 'text-foreground text-2xl md:text-3xl font-bold scale-[1.02] origin-left'
                  : i < activeLine
                    ? 'text-muted-foreground/25 text-lg'
                    : 'text-muted-foreground/45 text-lg'
                : 'text-foreground/90 text-base leading-loose'
            }`}
            onClick={() => synced && seek(line.time)}
          >
            {line.text || '♪'}
          </div>
        ))}
        <div className="h-40" />
      </div>
    </div>
  );
}

// ─── Tab: Queue (Monochrome style) ───
function QueueTab({ onCollapse }: { onCollapse: () => void }) {
  const queue = usePlayerStore(s => s.queue);
  const queueIndex = usePlayerStore(s => s.queueIndex);
  const isPlaying = usePlayerStore(s => s.isPlaying);
  const isRadioEnabled = usePlayerStore(s => s.isRadioEnabled);
  const isFetchingRadio = usePlayerStore(s => s.isFetchingRadio);
  const play = usePlayerStore(s => s.play);
  const removeFromQueue = usePlayerStore(s => s.removeFromQueue);
  const clearQueue = usePlayerStore(s => s.clearQueue);
  const reorderQueue = usePlayerStore(s => s.reorderQueue);

  const { addToFavorites, removeFromFavorites, isFavorite } = useLibraryStore();

  const totalDuration = queue.reduce((sum, t) => sum + (t.duration || 0), 0);

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
      if (!isFavorite(String(track.id))) { addToFavorites(track); added++; }
    }
    if (added > 0) toast.success(`Added ${added} tracks to favorites`);
    else toast.info('All tracks already in favorites');
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full max-w-lg mx-auto">
      {/* Queue header */}
      <div className="flex items-center justify-between px-4 py-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">
            {queue.length} tracks · {formatTime(totalDuration)}
          </span>
          {isRadioEnabled && (
            <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
              <Radio size={10} /> Radio
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={handleDownloadAll} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors" title="Download all">
            <Download size={14} />
          </button>
          <button onClick={handleFavoriteAll} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors" title="Favorite all">
            <Heart size={14} />
          </button>
          {queue.length > 1 && (
            <button onClick={clearQueue} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors" title="Clear queue">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Queue items - monochrome style */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {queue.map((track, i) => {
          const isCurrent = i === queueIndex;
          const isPast = i < queueIndex;
          const liked = isFavorite(String(track.id));

          return (
            <div
              key={`${track.id}-${i}`}
              style={{ opacity: isPast ? 0.4 : 1 }}
              draggable={!isCurrent}
              onDragStart={(e) => handleDragStart(e, i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDragEnd={(e) => handleDragEnd(e)}
              className={`flex items-center gap-2.5 px-3 py-2.5 group cursor-pointer transition-colors ${
                isCurrent ? 'bg-foreground/5 border border-border/50 mx-2 rounded-lg' : 'hover:bg-accent/20'
              }`}
              onClick={() => !isCurrent && play(track, queue, i)}
            >
              {/* Drag handle */}
              <div className="w-4 flex-shrink-0 flex items-center justify-center">
                {isCurrent ? (
                  isPlaying ? (
                    <div className="flex items-end gap-[2px] h-3">
                      <div className="w-[2px] bg-primary animate-pulse h-full rounded-full" />
                      <div className="w-[2px] bg-primary animate-pulse h-2/3 rounded-full" style={{ animationDelay: '0.15s' }} />
                      <div className="w-[2px] bg-primary animate-pulse h-1/3 rounded-full" style={{ animationDelay: '0.3s' }} />
                    </div>
                  ) : (
                    <Pause size={12} className="text-primary" />
                  )
                ) : (
                  <GripVertical size={14} className="text-muted-foreground/40 group-hover:text-muted-foreground cursor-grab" />
                )}
              </div>

              {/* Thumbnail */}
              <img
                src={track.thumbnail || ''}
                alt={track.title}
                className={`w-10 h-10 rounded object-cover flex-shrink-0 bg-secondary ${
                  isCurrent ? 'ring-1 ring-primary/40' : ''
                }`}
              />

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className={`text-sm font-medium truncate ${isCurrent ? 'text-primary' : 'text-foreground'}`}>{track.title}</p>
                  <TrackSourceBadge track={track} />
                </div>
                <Link 
                  to={`/artist/${encodeURIComponent(track.artist?.id || track.artist?.name || 'unknown')}`}
                  className="hover:underline block w-fit"
                  onClick={(e) => { e.stopPropagation(); onCollapse(); }}
                >
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{track.artist?.name || 'Unknown Artist'}</p>
                </Link>
              </div>

              {/* Duration */}
              <span className="text-xs text-muted-foreground font-mono flex-shrink-0">{formatTime(track.duration)}</span>

              {/* Actions - always visible like monochrome */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); liked ? removeFromFavorites(String(track.id)) : addToFavorites(track); }}
                  className="p-1 transition-colors"
                >
                  <Heart size={14} className={liked ? 'fill-primary text-primary' : 'text-muted-foreground/40 hover:text-foreground'} />
                </button>
                {!isCurrent && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFromQueue(i); }}
                    className="p-1 text-muted-foreground/40 hover:text-destructive transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {isFetchingRadio && (
          <p className="text-xs text-primary p-4 text-center animate-pulse">Loading radio tracks...</p>
        )}
        {queue.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Music2 size={32} className="text-muted-foreground/20" />
            <p className="text-xs text-muted-foreground">
              {isRadioEnabled ? 'Radio will add tracks automatically' : 'Queue is empty'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Fullscreen Player ───
const TABS: FullscreenTab[] = ['queue', 'player', 'lyrics'];

export function FullscreenPlayer({ onCollapse }: { onCollapse: () => void }) {
  const [activeTab, setActiveTab] = useState<FullscreenTab>('player');
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const isVisualizerActive = usePlayerStore(s => s.isVisualizerActive);
  const { fsBackgroundOverlayOpacity, fsBackgroundBlurAmount, fsGlassOpacity, fsGlassBlur } = useSettingsStore();
  const isMobile = useIsMobile();

  if (!currentTrack) return null;

  const tabIndex = TABS.indexOf(activeTab);

  const handleSwipe = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 60) {
      if (info.offset.x < 0 && tabIndex < TABS.length - 1) {
        setActiveTab(TABS[tabIndex + 1]);
      } else if (info.offset.x > 0 && tabIndex > 0) {
        setActiveTab(TABS[tabIndex - 1]);
      }
    }
  };

  const bgImage = currentTrack.thumbnailLarge || currentTrack.thumbnail;

  return (
    <motion.div
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      className="fixed inset-0 z-[60] flex flex-col overflow-hidden"
      style={{ textShadow: '0 0 10px currentColor, 0 0 20px currentColor' }}
    >
      {/* Dynamically blurring album art as background layer */}
      {bgImage && (
        <div 
          className="absolute inset-0 z-[-2] transition-all duration-1000 bg-cover bg-center"
          style={{ 
            backgroundImage: `url(${bgImage})`,
            opacity: fsGlassOpacity / 100,
            filter: `saturate(200%) blur(${fsGlassBlur}px)`
          }}
        />
      )}
      {/* Dark overlay for contrast */}
      <div 
        className="absolute inset-0 z-[-1] pointer-events-none" 
        style={{
          backgroundColor: `rgba(0,0,0,${fsBackgroundOverlayOpacity / 100})`,
          backdropFilter: `blur(${fsBackgroundBlurAmount}px) saturate(150%)`,
          WebkitBackdropFilter: `blur(${fsBackgroundBlurAmount}px) saturate(150%)`,
        }}
      />

      {isVisualizerActive && (
        <div className="absolute inset-0 pointer-events-none opacity-15">
          <Visualizer />
        </div>
      )}

      {/* Top bar - only close button */}
      <div 
        className="relative z-10 w-full flex items-center justify-end px-4 pb-1"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
      >
        <button onClick={onCollapse} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
          <X size={24} />
        </button>
      </div>

      {/* Tab content with swipe */}
      <motion.div
        className="relative z-10 flex-1 flex flex-col min-h-0"
        drag={isMobile ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.15}
        onDragEnd={handleSwipe}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col min-h-0"
          >
            {activeTab === 'player' && <PlayerTab activeTab={activeTab} setActiveTab={setActiveTab} onCollapse={onCollapse} />}
            {activeTab === 'lyrics' && <LyricsTab />}
            {activeTab === 'queue' && <QueueTab onCollapse={onCollapse} />}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Mini transport at bottom for lyrics/queue tabs */}
      {activeTab !== 'player' && <MiniTransport onCollapse={onCollapse} />}
    </motion.div>
  );
}

// ─── Mini Transport (shown when on lyrics/queue tabs) ───
function MiniTransport({ onCollapse }: { onCollapse: () => void }) {
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const isPlaying = usePlayerStore(s => s.isPlaying);
  const isLoading = usePlayerStore(s => s.isLoading);
  const togglePlayPause = usePlayerStore(s => s.togglePlayPause);
  const next = usePlayerStore(s => s.next);
  const previous = usePlayerStore(s => s.previous);

  if (!currentTrack) return null;

  return (
    <div 
      className="relative z-10 px-4 pt-2"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
    >
      <div className="w-full max-w-lg mx-auto">
        <ProgressBar compact />
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <img
              src={currentTrack.thumbnail || ''}
              alt=""
              className="w-8 h-8 rounded-full object-cover flex-shrink-0 bg-secondary"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">{currentTrack.title}</p>
              <Link 
                to={`/artist/${encodeURIComponent(currentTrack.artist?.id || currentTrack.artist?.name || 'unknown')}`}
                className="hover:underline block w-fit"
                onClick={onCollapse}
              >
                <p className="text-[10px] text-muted-foreground truncate">{currentTrack.artist?.name}</p>
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={previous} className="p-1.5 text-foreground">
              <SkipBack size={16} fill="currentColor" />
            </button>
            <button onClick={togglePlayPause} className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center">
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
            </button>
            <button onClick={next} className="p-1.5 text-foreground">
              <SkipForward size={16} fill="currentColor" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
