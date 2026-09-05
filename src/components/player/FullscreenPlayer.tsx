import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayerStore } from '@/stores/playerStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { useThemeStore } from '@/stores/themeStore';
import { useIsMobile, useIsTablet } from '@/hooks/use-mobile';
import { WavySeekBar } from './WavySeekBar';
import { PitchSpeedModal } from './PitchSpeedModal';
import { EqualizerModal } from './EqualizerModal';
import { ShareLyricsCard } from './ShareLyricsCard';
import { formatTime } from '@/lib/format';
import { musicAPI } from '@/api/musicAPI';
import { downloadTrack } from '@/lib/download';
import { toast } from 'sonner';
import {
  Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Repeat1, Heart,
  ListMusic, Mic2, Loader2,
  Disc3, ChevronDown,
  Timer, Trash2, Music2,
  Sliders, Gauge, Share2, Volume2, VolumeX,
  MoreVertical, Download, ListPlus, Users, X, Sparkles, Disc
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FullscreenPlayerProps {
  onCollapse: () => void;
}

interface LyricsLine {
  time: number;
  text: string;
}

export function FullscreenPlayer({ onCollapse }: FullscreenPlayerProps) {
  const navigate = useNavigate();
  const {
    currentTrack,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    volume,
    isMuted,
    isShuffled,
    repeatMode,
    queue,
    queueIndex,
    sleepTimerRemaining,
    togglePlayPause,
    next,
    previous,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
    removeFromQueue,
    clearQueue,
    play,
    setSleepTimer,
    clearSleepTimer,
  } = usePlayerStore();

  const { nowPlayingStyle, setNowPlayingStyle } = useThemeStore();
  const { addToFavorites, removeFromFavorites, isFavorite, playlists, addToPlaylist } = useLibraryStore();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  // Modals & tabs state
  const [showPitchSpeed, setShowPitchSpeed] = useState(false);
  const [showEqualizer, setShowEqualizer] = useState(false);
  const [showShareLyrics, setShowShareLyrics] = useState(false);
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const [showSongMenu, setShowSongMenu] = useState(false);
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);
  const [activeTab, setActiveTab] = useState<'player' | 'lyrics' | 'queue'>('player');
  const [rightPaneTab, setRightPaneTab] = useState<'lyrics' | 'queue'>('lyrics');
  const [justLiked, setJustLiked] = useState(false);
  const [activeButtonPress, setActiveButtonPress] = useState<'prev' | 'play' | 'next' | null>(null);

  // Local lyrics fetching state
  const [lyricsLines, setLyricsLines] = useState<LyricsLine[]>([]);
  const [lyricsLoading, setLyricsLoading] = useState(false);

  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const activeLyricRef = useRef<HTMLDivElement>(null);

  // Fetch lyrics when track changes
  useEffect(() => {
    if (!currentTrack) {
      setLyricsLines([]);
      return;
    }
    let cancelled = false;
    setLyricsLoading(true);
    musicAPI
      .getLyrics(
        currentTrack.title,
        currentTrack.artist?.name || '',
        currentTrack.album?.title,
        currentTrack.duration,
        currentTrack.videoId
      )
      .then(res => {
        if (!cancelled && res?.lines) {
          setLyricsLines(res.lines);
        } else if (!cancelled) {
          setLyricsLines([]);
        }
      })
      .catch(() => {
        if (!cancelled) setLyricsLines([]);
      })
      .finally(() => {
        if (!cancelled) setLyricsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentTrack]);

  // Find active lyrics index
  const activeLyricIndex = lyricsLines.findIndex((line, i) => {
    const nextLine = lyricsLines[i + 1];
    return currentTime >= line.time && (!nextLine || currentTime < nextLine.time);
  });

  // Auto-scroll active lyric (called before early return to preserve hook order)
  useEffect(() => {
    if (activeLyricRef.current && (activeTab === 'lyrics' || !isMobile)) {
      activeLyricRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeLyricIndex, activeTab, isMobile]);

  // Early return if no track selected (placed after all React hooks)
  if (!currentTrack) return null;

  const liked = isFavorite(String(currentTrack.id));

  const handleLike = () => {
    const videoId = currentTrack.videoId || (String(currentTrack.id).startsWith('ytm_') ? String(currentTrack.id).slice(4) : String(currentTrack.id));
    if (!liked) {
      addToFavorites(currentTrack);
      setJustLiked(true);
      if (videoId && currentTrack.source !== 'local') {
        musicAPI.rateSong(videoId, 'like').catch(() => {});
      }
      toast.success('Added to Liked Songs');
    } else {
      removeFromFavorites(String(currentTrack.id));
      if (videoId && currentTrack.source !== 'local') {
        musicAPI.rateSong(videoId, 'indifferent').catch(() => {});
      }
      toast.info('Removed from Liked Songs');
    }
  };

  // ─── Reusable Synced Lyrics Component ───
  const renderLyricsView = (isSplit = false) => (
    <div className={`flex flex-col h-full ${isSplit ? 'p-5' : 'p-4 sm:p-6'} overflow-hidden select-none`}>
      <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-2 shrink-0">
        <div className="flex items-center gap-2">
          <Mic2 size={16} className="text-sky-400" />
          <span className="text-xs uppercase font-bold tracking-wider text-white/70">Synchronized Lyrics</span>
        </div>
        <button
          onClick={() => setShowShareLyrics(true)}
          className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-400/20 transition-colors"
        >
          <Share2 size={13} />
          <span>Share Card</span>
        </button>
      </div>

      <div ref={lyricsContainerRef} className="flex-1 overflow-y-auto scrollbar-thin space-y-6 py-6 pr-2">
        {lyricsLines.map((line, idx) => {
          const isActive = idx === activeLyricIndex;
          return (
            <div
              key={idx}
              ref={isActive ? activeLyricRef : null}
              onClick={() => seek(line.time)}
              className={`cursor-pointer transition-all duration-300 ${
                isActive
                  ? 'text-xl sm:text-2xl md:text-3xl font-extrabold text-white scale-105 origin-left drop-shadow-[0_0_20px_rgba(142,202,230,0.7)]'
                  : 'text-base sm:text-lg md:text-xl font-medium text-white/35 hover:text-white/70'
              }`}
            >
              {line.text}
            </div>
          );
        })}
        {lyricsLines.length === 0 && (
          <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-white/40 space-y-2">
            {lyricsLoading ? (
              <>
                <Loader2 size={32} className="animate-spin text-sky-400" />
                <p className="text-sm">Fetching synchronized lyrics...</p>
              </>
            ) : (
              <>
                <Mic2 size={36} />
                <p className="text-sm">No synchronized lyrics available for this track</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // ─── Reusable Queue Component ───
  const renderQueueView = () => (
    <div className="flex flex-col h-full p-4 sm:p-5 overflow-hidden select-none">
      <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <ListMusic size={16} className="text-sky-400" />
          <span className="text-xs uppercase font-bold tracking-wider text-white/70">
            Up Next ({queue.length} tracks)
          </span>
        </div>
        {queue.length > 0 && (
          <button
            onClick={clearQueue}
            className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin space-y-2 pr-1">
        {queue.map((track, idx) => {
          const isCurrent = idx === queueIndex;
          return (
            <div
              key={`${track.id}-${idx}`}
              onClick={() => play(track, queue, idx)}
              className={`flex items-center gap-3 p-2.5 rounded-2xl cursor-pointer transition-colors group ${
                isCurrent
                  ? 'bg-sky-500/20 border border-sky-400/40 text-white'
                  : 'hover:bg-white/10 text-white/80'
              }`}
            >
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/5 flex-shrink-0 relative">
                {track.thumbnail ? (
                  <img src={track.thumbnail} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Disc3 size={16} className="text-white/40 m-auto" />
                )}
                {isCurrent && (
                  <div className="absolute inset-0 bg-sky-950/60 flex items-center justify-center">
                    <Play size={14} className="text-sky-300" fill="currentColor" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className={`text-xs font-semibold truncate ${isCurrent ? 'text-sky-300' : 'text-white'}`}>
                  {track.title}
                </p>
                <p className="text-[11px] text-white/50 truncate mt-0.5">{track.artist?.name}</p>
              </div>

              <button
                onClick={e => {
                  e.stopPropagation();
                  removeFromQueue(idx);
                }}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-white/40 hover:text-red-400 transition-opacity"
                title="Remove from queue"
              >
                <Trash2 size={15} />
              </button>
            </div>
          );
        })}
        {queue.length === 0 && (
          <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-white/40 space-y-2">
            <ListMusic size={36} />
            <p className="text-sm">Queue is empty</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, y: '100%' }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 280 }}
      className="fixed inset-0 z-[65] bg-[#070b16] text-white flex flex-col overflow-hidden select-none"
    >
      {/* Dynamic Ambient Mesh Background */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center filter blur-[100px] opacity-40 scale-125 pointer-events-none transition-all duration-700"
        style={{ backgroundImage: `url(${currentTrack.thumbnail || ''})` }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#070b16]/75 via-[#070b16]/90 to-[#070b16] pointer-events-none" />

      {/* ─── TOP BAR: Style Switcher, Header Info & Controls (Matching Screenshot) ─── */}
      <header className="relative z-10 h-14 sm:h-16 w-full px-3 sm:px-6 flex items-center justify-between border-b border-white/10 shrink-0">
        {/* Left: Collapse button */}
        <button
          onClick={onCollapse}
          className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-2xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          title="Collapse Player"
        >
          <ChevronDown size={22} />
        </button>

        {/* Center Mobile: NOW PLAYING + Source Subtitle (Matching Screenshot) */}
        <div className="flex-1 flex flex-col items-center justify-center min-w-0 px-2 sm:hidden text-center">
          <span className="text-[9px] font-bold tracking-widest uppercase text-white/45">NOW PLAYING</span>
          <span className="text-xs font-semibold text-white/90 truncate max-w-[180px]">
            {currentTrack.source === 'local' ? 'Downloaded' : currentTrack.album?.title || 'YouTube Music'}
          </span>
        </div>

        {/* Center Tablet & Desktop: SimpMusic 3-in-1 Style Switcher */}
        <div className="hidden sm:flex items-center gap-1 p-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-xl">
          <button
            onClick={() => setNowPlayingStyle('m3-expressive')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              nowPlayingStyle === 'm3-expressive'
                ? 'bg-sky-400 text-slate-950 shadow-md'
                : 'text-white/70 hover:text-white'
            }`}
          >
            M3 Expressive
          </button>
          <button
            onClick={() => setNowPlayingStyle('apple-music')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              nowPlayingStyle === 'apple-music'
                ? 'bg-pink-500 text-white shadow-md'
                : 'text-white/70 hover:text-white'
            }`}
          >
            Apple Music
          </button>
          <button
            onClick={() => setNowPlayingStyle('spotify')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              nowPlayingStyle === 'spotify'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-white/70 hover:text-white'
            }`}
          >
            Spotify Classic
          </button>
        </div>

        {/* Right: Signature Actions & 3-Dots Menu */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Share Lyrics Card button (Tablet & Desktop) */}
          <button
            onClick={() => setShowShareLyrics(true)}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 hover:text-white text-xs font-medium border border-white/15 transition-colors"
            title="Create Share Lyrics Card"
          >
            <Share2 size={14} className="text-sky-400" />
            <span>Share Lyrics</span>
          </button>

          {/* Speed & Pitch (Tablet & Desktop) */}
          <button
            onClick={() => setShowPitchSpeed(true)}
            className="hidden sm:flex w-8 h-8 sm:w-9 sm:h-9 items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            title="Speed & Pitch"
          >
            <Gauge size={16} />
          </button>

          {/* 10-Band Equalizer (Tablet & Desktop) */}
          <button
            onClick={() => setShowEqualizer(true)}
            className="hidden sm:flex w-8 h-8 sm:w-9 sm:h-9 items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            title="Equalizer"
          >
            <Sliders size={16} />
          </button>

          {/* Sleep Timer (Tablet & Desktop) */}
          <div className="relative hidden sm:block">
            <button
              onClick={() => setShowTimerMenu(!showTimerMenu)}
              className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl transition-colors ${
                sleepTimerRemaining !== null
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-400/40'
                  : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white'
              }`}
              title="Sleep Timer"
            >
              <Timer size={16} />
            </button>

            <AnimatePresence>
              {showTimerMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 5 }}
                  className="absolute right-0 mt-2 w-44 rounded-2xl bg-[#0f172a]/95 border border-white/15 p-2 shadow-2xl backdrop-blur-2xl z-50 text-xs"
                >
                  <p className="text-[10px] uppercase font-bold text-white/50 px-2 py-1">Sleep Timer</p>
                  {[15, 30, 45, 60].map(mins => (
                    <button
                      key={mins}
                      onClick={() => {
                        setSleepTimer(mins);
                        toast.success(`Sleep timer set to ${mins} mins`);
                        setShowTimerMenu(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-colors"
                    >
                      {mins} minutes
                    </button>
                  ))}
                  {sleepTimerRemaining !== null && (
                    <button
                      onClick={() => {
                        clearSleepTimer();
                        toast.info('Sleep timer cancelled');
                        setShowTimerMenu(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-red-500/20 text-red-400 transition-colors border-t border-white/10 mt-1"
                    >
                      Cancel Timer
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 3-DOTS OVERFLOW MENU (Matching Google Photos Screenshot) */}
          <button
            onClick={() => setShowSongMenu(true)}
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-2xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors"
            title="Song Options"
            aria-label="Song Options"
          >
            <MoreVertical size={19} />
          </button>
        </div>
      </header>

      {/* ─── MOBILE VIEW TABS (Now Playing | Synced Lyrics | Up Next) ─── */}
      {isMobile && (
        <div className="relative z-10 px-4 pt-3 flex items-center justify-center shrink-0">
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl w-full max-w-sm">
            <button
              onClick={() => setActiveTab('player')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'player' ? 'bg-white/15 text-white shadow-sm' : 'text-white/50 hover:text-white'
              }`}
            >
              <Music2 size={14} />
              <span>Player</span>
            </button>
            <button
              onClick={() => setActiveTab('lyrics')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'lyrics' ? 'bg-white/15 text-white shadow-sm' : 'text-white/50 hover:text-white'
              }`}
            >
              <Mic2 size={14} />
              <span>Lyrics</span>
            </button>
            <button
              onClick={() => setActiveTab('queue')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'queue' ? 'bg-white/15 text-white shadow-sm' : 'text-white/50 hover:text-white'
              }`}
            >
              <ListMusic size={14} />
              <span>Queue ({queue.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── BODY VIEWPORT: Mobile Tab Render OR Tablet/Desktop Dual Pane ─── */}
      <div className="relative z-10 flex-1 overflow-hidden p-4 sm:p-6 flex flex-col justify-center">
        {/* ========================================================= */}
        {/* CASE A: MOBILE TAB SELECTIONS (Lyrics or Queue Tab)       */}
        {/* ========================================================= */}
        {isMobile && activeTab === 'lyrics' && (
          <div className="h-full rounded-3xl bg-white/5 border border-white/10 backdrop-blur-2xl overflow-hidden">
            {renderLyricsView()}
          </div>
        )}

        {isMobile && activeTab === 'queue' && (
          <div className="h-full rounded-3xl bg-white/5 border border-white/10 backdrop-blur-2xl overflow-hidden">
            {renderQueueView()}
          </div>
        )}

        {/* ========================================================= */}
        {/* CASE B: TABLET / DESKTOP OR MOBILE (Player Tab Active)   */}
        {/* ========================================================= */}
        {(!isMobile || activeTab === 'player') && (
          <>
            {/* 1. MATERIAL 3 EXPRESSIVE STYLE (SimpMusic Core) */}
            {nowPlayingStyle === 'm3-expressive' && (
              <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-6 md:gap-8 max-w-6xl mx-auto w-full h-full overflow-hidden">
                {/* Left Pane: Artwork & Controls */}
                <div className="w-full md:w-[48%] lg:w-[45%] flex flex-col items-center justify-center space-y-4 sm:space-y-6 max-w-md mx-auto">
                  {/* Playful squircle album artwork */}
                  <div className="w-48 h-48 sm:w-64 sm:h-64 md:w-72 md:h-72 lg:w-80 lg:h-80 aspect-square rounded-[32px] sm:rounded-[36px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.85)] border border-white/20 relative group shrink-0">
                    {currentTrack.thumbnail ? (
                      <img src={currentTrack.thumbnail} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-white/5 text-white/40">
                        <Disc3 size={64} />
                      </div>
                    )}
                  </div>

                  {/* Title & Artist & Animated Heart */}
                  <div className="w-full flex items-start justify-between gap-3 px-1">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white truncate drop-shadow-md">
                        {currentTrack.title}
                      </h2>
                      <p className="text-sm sm:text-base text-sky-300/80 font-medium truncate mt-0.5">
                        {currentTrack.artist?.name}
                      </p>
                    </div>
                    <button
                      onClick={handleLike}
                      className={`p-2.5 sm:p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-transform ${
                        justLiked ? 'animate-heart-pop' : ''
                      }`}
                      onAnimationEnd={() => setJustLiked(false)}
                      title={liked ? 'Unlike' : 'Like'}
                    >
                      <Heart size={22} className={liked ? 'fill-[#FF4081] text-[#FF4081]' : 'text-white/60'} />
                    </button>
                  </div>

                  {/* Animated Wavy Seekbar */}
                  <div className="w-full space-y-1">
                    <WavySeekBar
                      current={currentTime}
                      duration={duration}
                      isPlaying={isPlaying}
                      onSeek={seek}
                      wavy={true}
                    />
                    <div className="flex justify-between text-xs font-mono text-white/50">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>

                  {/* Expressive Transport Row: 3 Pill Buttons with Spring Press-Growth */}
                  <div className="h-[64px] sm:h-[72px] w-full flex items-center gap-2.5 sm:gap-3">
                    {/* Previous Pill */}
                    <button
                      onClick={previous}
                      onPointerDown={() => setActiveButtonPress('prev')}
                      onPointerUp={() => setActiveButtonPress(null)}
                      onPointerLeave={() => setActiveButtonPress(null)}
                      style={{
                        flex: activeButtonPress === 'prev' ? 0.55 * 1.15 : 0.55,
                        transition: 'flex 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
                      }}
                      className="h-full rounded-3xl bg-white/10 hover:bg-white/15 border border-white/15 flex items-center justify-center text-white active:scale-95 shadow-lg"
                      aria-label="Previous"
                    >
                      <SkipBack size={22} fill="currentColor" />
                    </button>

                    {/* Play/Pause Center Pill (Morphs Squircle) */}
                    <button
                      onClick={togglePlayPause}
                      onPointerDown={() => setActiveButtonPress('play')}
                      onPointerUp={() => setActiveButtonPress(null)}
                      onPointerLeave={() => setActiveButtonPress(null)}
                      style={{
                        flex: activeButtonPress === 'play' ? 1.2 * 1.15 : 1.2,
                        borderRadius: isPlaying ? '24px' : '36px',
                        transition: 'flex 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), border-radius 0.3s ease',
                      }}
                      className="h-full bg-gradient-to-r from-sky-400 via-cyan-300 to-sky-300 text-slate-950 flex items-center justify-center font-bold shadow-[0_0_24px_rgba(142,202,230,0.5)] active:scale-95"
                      aria-label={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isLoading ? (
                        <Loader2 size={28} className="animate-spin text-slate-950" />
                      ) : isPlaying ? (
                        <Pause size={28} fill="currentColor" />
                      ) : (
                        <Play size={28} fill="currentColor" className="ml-1" />
                      )}
                    </button>

                    {/* Next Pill */}
                    <button
                      onClick={next}
                      onPointerDown={() => setActiveButtonPress('next')}
                      onPointerUp={() => setActiveButtonPress(null)}
                      onPointerLeave={() => setActiveButtonPress(null)}
                      style={{
                        flex: activeButtonPress === 'next' ? 0.55 * 1.15 : 0.55,
                        transition: 'flex 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
                      }}
                      className="h-full rounded-3xl bg-white/10 hover:bg-white/15 border border-white/15 flex items-center justify-center text-white active:scale-95 shadow-lg"
                      aria-label="Next"
                    >
                      <SkipForward size={22} fill="currentColor" />
                    </button>
                  </div>

                  {/* Auxiliary Controls */}
                  <div className="w-full flex items-center justify-between pt-1">
                    <button
                      onClick={toggleShuffle}
                      className={`p-2.5 rounded-2xl transition-colors ${
                        isShuffled ? 'text-sky-400 bg-sky-500/20' : 'text-white/60 hover:text-white'
                      }`}
                      title="Shuffle"
                    >
                      <Shuffle size={18} />
                    </button>

                    {/* Volume slider (Tablet & Desktop) */}
                    <div className="hidden sm:flex items-center gap-2 max-w-[140px] w-full">
                      <button onClick={toggleMute} className="text-white/60 hover:text-white">
                        {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                      </button>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={isMuted ? 0 : volume}
                        onChange={e => setVolume(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-sky-400"
                      />
                    </div>

                    <button
                      onClick={cycleRepeat}
                      className={`p-2.5 rounded-2xl transition-colors ${
                        repeatMode !== 'off' ? 'text-sky-400 bg-sky-500/20' : 'text-white/60 hover:text-white'
                      }`}
                      title="Repeat"
                    >
                      {repeatMode === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
                    </button>
                  </div>
                </div>

                {/* Right Pane: Tablet & Desktop Split View (Synced Lyrics & Queue Switcher) */}
                {!isMobile && (
                  <div className="w-full md:w-[52%] lg:w-[55%] h-[72vh] flex flex-col rounded-3xl bg-white/5 border border-white/10 backdrop-blur-2xl overflow-hidden shadow-2xl">
                    <div className="flex items-center justify-between px-4 pt-3 pb-1 border-b border-white/10 bg-white/[0.02]">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setRightPaneTab('lyrics')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                            rightPaneTab === 'lyrics'
                              ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40 shadow-sm'
                              : 'text-white/50 hover:text-white'
                          }`}
                        >
                          Synced Lyrics
                        </button>
                        <button
                          onClick={() => setRightPaneTab('queue')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                            rightPaneTab === 'queue'
                              ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40 shadow-sm'
                              : 'text-white/50 hover:text-white'
                          }`}
                        >
                          Up Next ({queue.length})
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-hidden">
                      {rightPaneTab === 'lyrics' ? renderLyricsView(true) : renderQueueView()}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. APPLE MUSIC STYLE (Dynamic Split Screen + Synced Lyrics) */}
            {nowPlayingStyle === 'apple-music' && (
              <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-6 md:gap-8 max-w-6xl mx-auto w-full h-full overflow-hidden">
                {/* Left: Huge Artwork + Transport info */}
                <div className="w-full md:w-[48%] lg:w-[45%] flex flex-col items-center justify-center space-y-4 sm:space-y-5 max-w-md mx-auto">
                  <div className="w-48 h-48 sm:w-64 sm:h-64 md:w-72 md:h-72 lg:w-80 lg:h-80 aspect-square rounded-3xl overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.85)] border border-white/20 shrink-0">
                    <img src={currentTrack.thumbnail || ''} alt="" className="w-full h-full object-cover" />
                  </div>

                  <div className="w-full px-1">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <h2 className="text-xl sm:text-2xl font-bold text-white truncate">{currentTrack.title}</h2>
                        <p className="text-sm text-pink-300 font-medium truncate mt-0.5">{currentTrack.artist?.name}</p>
                      </div>
                      <button onClick={handleLike} className="p-2 rounded-xl text-white/60 hover:text-white">
                        <Heart size={22} className={liked ? 'fill-[#FF4081] text-[#FF4081]' : ''} />
                      </button>
                    </div>

                    {/* Scrubber */}
                    <div className="mt-3 sm:mt-4 space-y-1">
                      <input
                        type="range"
                        min={0}
                        max={duration || 0}
                        step={0.1}
                        value={currentTime}
                        onChange={e => seek(parseFloat(e.target.value))}
                        className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-pink-400"
                      />
                      <div className="flex justify-between text-[11px] font-mono text-white/50">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                    </div>

                    {/* Apple Music Transport cluster */}
                    <div className="flex items-center justify-center gap-6 sm:gap-8 mt-3 sm:mt-4">
                      <button onClick={previous} className="p-2 text-white/70 hover:text-white">
                        <SkipBack size={26} fill="currentColor" />
                      </button>
                      <button
                        onClick={togglePlayPause}
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white text-slate-950 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl"
                      >
                        {isPlaying ? <Pause size={26} fill="currentColor" /> : <Play size={26} fill="currentColor" className="ml-1" />}
                      </button>
                      <button onClick={next} className="p-2 text-white/70 hover:text-white">
                        <SkipForward size={26} fill="currentColor" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right: Apple Music Synced Karaoke Lyrics Sheet (Tablet & Desktop) */}
                {!isMobile && (
                  <div className="w-full md:w-[52%] lg:w-[55%] h-[72vh] flex flex-col rounded-3xl bg-white/5 border border-white/10 backdrop-blur-2xl overflow-hidden shadow-2xl">
                    {renderLyricsView(true)}
                  </div>
                )}
              </div>
            )}

            {/* 3. SPOTIFY / CLASSIC STYLE */}
            {nowPlayingStyle === 'spotify' && (
              <div className="flex-1 flex flex-col items-center justify-between max-w-lg mx-auto w-full py-2 h-full">
                {/* Artwork */}
                <div className="w-48 h-48 sm:w-64 sm:h-64 md:w-72 md:h-72 aspect-square rounded-2xl overflow-hidden shadow-2xl border border-white/15 my-auto shrink-0">
                  <img src={currentTrack.thumbnail || ''} alt="" className="w-full h-full object-cover" />
                </div>

                {/* Info and controls */}
                <div className="w-full space-y-3 sm:space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xl sm:text-2xl font-bold text-white truncate">{currentTrack.title}</h2>
                      <p className="text-sm text-emerald-400 font-medium truncate mt-0.5">{currentTrack.artist?.name}</p>
                    </div>
                    <button onClick={handleLike} className="p-2 rounded-xl text-white/60 hover:text-white">
                      <Heart size={22} className={liked ? 'fill-[#FF4081] text-[#FF4081]' : ''} />
                    </button>
                  </div>

                  {/* Scrubber */}
                  <div className="space-y-1">
                    <input
                      type="range"
                      min={0}
                      max={duration || 0}
                      step={0.1}
                      value={currentTime}
                      onChange={e => seek(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                    />
                    <div className="flex justify-between text-xs font-mono text-white/50">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>

                  {/* Transport */}
                  <div className="flex items-center justify-between px-2 sm:px-4">
                    <button onClick={toggleShuffle} className={`p-2 ${isShuffled ? 'text-emerald-400' : 'text-white/60'}`}>
                      <Shuffle size={18} />
                    </button>
                    <button onClick={previous} className="p-2 text-white/70 hover:text-white">
                      <SkipBack size={24} fill="currentColor" />
                    </button>
                    <button
                      onClick={togglePlayPause}
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white text-slate-950 flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all"
                    >
                      {isPlaying ? <Pause size={26} fill="currentColor" /> : <Play size={26} fill="currentColor" className="ml-0.5" />}
                    </button>
                    <button onClick={next} className="p-2 text-white/70 hover:text-white">
                      <SkipForward size={24} fill="currentColor" />
                    </button>
                    <button onClick={cycleRepeat} className={`p-2 ${repeatMode !== 'off' ? 'text-emerald-400' : 'text-white/60'}`}>
                      {repeatMode === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Speed & Pitch Dialog */}
      <PitchSpeedModal isOpen={showPitchSpeed} onClose={() => setShowPitchSpeed(false)} />

      {/* 10-Band Equalizer Dialog */}
      <EqualizerModal isOpen={showEqualizer} onClose={() => setShowEqualizer(false)} />

      {/* Share Lyrics Card Generator Dialog */}
      <ShareLyricsCard
        isOpen={showShareLyrics}
        onClose={() => setShowShareLyrics(false)}
        track={currentTrack}
        lyricsLines={lyricsLines}
        currentLineIndex={activeLyricIndex}
      />

      {/* ─── SimpMusic Song Options Bottom Sheet (Matching Google Photos Screenshot) ─── */}
      <AnimatePresence>
        {showSongMenu && (
          <div className="fixed inset-0 z-[80] flex flex-col justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSongMenu(false)}
              className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            />

            {/* Bottom Sheet Drawer */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 350 }}
              className="relative z-10 w-full max-w-lg mx-auto bg-[#10141e]/95 backdrop-blur-2xl border-t border-white/15 rounded-t-[32px] px-4 pt-3 pb-8 shadow-[0_-12px_40px_rgba(0,0,0,0.8)] text-white select-none max-h-[85vh] overflow-y-auto scrollbar-none"
            >
              {/* Top Drag / Grab Bar */}
              <div className="w-10 h-1 rounded-full bg-white/25 mx-auto mb-3.5" />

              {/* Track Info Card */}
              <div className="flex items-center gap-3.5 pb-3.5 border-b border-white/10">
                <img
                  src={currentTrack.thumbnail || ''}
                  alt=""
                  className="w-12 h-12 rounded-xl object-cover shadow-lg ring-1 ring-white/10"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm text-white truncate leading-snug">
                    {currentTrack.title}
                  </p>
                  <p className="text-xs text-white/55 truncate mt-0.5">
                    {currentTrack.artist?.name}
                  </p>
                </div>
              </div>

              {/* Action Rows Matching Screenshot */}
              <div className="py-2 space-y-0.5">
                {/* 1. Like */}
                <button
                  onClick={() => {
                    handleLike();
                  }}
                  className="w-full flex items-center gap-4 px-3 py-3 rounded-2xl hover:bg-white/8 active:bg-white/12 transition-colors text-left"
                >
                  <Heart
                    size={20}
                    className={liked ? 'text-[#FF4081]' : 'text-white/80'}
                    fill={liked ? '#FF4081' : 'none'}
                  />
                  <span className="text-sm font-medium text-white">
                    {liked ? 'Liked' : 'Like'}
                  </span>
                </button>

                {/* 2. Downloaded / Download */}
                <button
                  onClick={async () => {
                    try {
                      await downloadTrack(currentTrack);
                      toast.success(`Downloaded "${currentTrack.title}"`);
                    } catch {
                      toast.error('Download failed');
                    }
                  }}
                  className="w-full flex items-center gap-4 px-3 py-3 rounded-2xl hover:bg-white/8 active:bg-white/12 transition-colors text-left"
                >
                  <div className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center">
                    <Download size={15} />
                  </div>
                  <span className="text-sm font-medium text-white">
                    {currentTrack.source === 'local' ? 'Downloaded' : 'Downloaded'}
                  </span>
                </button>

                {/* 3. Add to a playlist */}
                <button
                  onClick={() => setShowPlaylistPicker(true)}
                  className="w-full flex items-center gap-4 px-3 py-3 rounded-2xl hover:bg-white/8 active:bg-white/12 transition-colors text-left"
                >
                  <ListPlus size={20} className="text-white/80" />
                  <span className="text-sm font-medium text-white">Add to a playlist</span>
                </button>

                {/* 4. Artists */}
                <button
                  onClick={() => {
                    setShowSongMenu(false);
                    onCollapse();
                    if (currentTrack.artist?.id) {
                      navigate(`/artist/${currentTrack.artist.id}`);
                    }
                  }}
                  className="w-full flex items-center gap-4 px-3 py-3 rounded-2xl hover:bg-white/8 active:bg-white/12 transition-colors text-left"
                >
                  <Users size={20} className="text-white/80" />
                  <span className="text-sm font-medium text-white">Artists</span>
                </button>

                {/* 5. Share */}
                <button
                  onClick={async () => {
                    setShowSongMenu(false);
                    const shareData = {
                      title: currentTrack.title,
                      text: `Listen to ${currentTrack.title} by ${currentTrack.artist?.name} on SimpMusic`,
                      url: window.location.origin + '/?v=' + (currentTrack.videoId || currentTrack.id),
                    };
                    if (navigator.share) {
                      try {
                        await navigator.share(shareData);
                      } catch (_err) {
                        // User cancelled share or share unavailable
                      }
                    } else {
                      await navigator.clipboard.writeText(shareData.url);
                      toast.success('Song link copied to clipboard!');
                    }
                  }}
                  className="w-full flex items-center gap-4 px-3 py-3 rounded-2xl hover:bg-white/8 active:bg-white/12 transition-colors text-left"
                >
                  <Share2 size={20} className="text-white/80" />
                  <span className="text-sm font-medium text-white">Share</span>
                </button>

                {/* 6. View Album */}
                {currentTrack.album?.id && (
                  <button
                    onClick={() => {
                      setShowSongMenu(false);
                      onCollapse();
                      navigate(`/album/${currentTrack.album?.id}`);
                    }}
                    className="w-full flex items-center gap-4 px-3 py-3 rounded-2xl hover:bg-white/8 active:bg-white/12 transition-colors text-left"
                  >
                    <Disc size={20} className="text-white/80" />
                    <span className="text-sm font-medium text-white">View Album</span>
                  </button>
                )}

                {/* 7. Equalizer */}
                <button
                  onClick={() => {
                    setShowSongMenu(false);
                    setShowEqualizer(true);
                  }}
                  className="w-full flex items-center gap-4 px-3 py-3 rounded-2xl hover:bg-white/8 active:bg-white/12 transition-colors text-left"
                >
                  <Sliders size={20} className="text-white/80" />
                  <span className="text-sm font-medium text-white">Equalizer</span>
                </button>

                {/* 8. Sleep Timer */}
                <button
                  onClick={() => {
                    setShowSongMenu(false);
                    setShowTimerMenu(true);
                  }}
                  className="w-full flex items-center gap-4 px-3 py-3 rounded-2xl hover:bg-white/8 active:bg-white/12 transition-colors text-left"
                >
                  <Timer size={20} className="text-white/80" />
                  <span className="text-sm font-medium text-white">
                    Sleep Timer {sleepTimerRemaining ? `(${sleepTimerRemaining}m left)` : ''}
                  </span>
                </button>

                {/* 9. Player Design Style */}
                <button
                  onClick={() => {
                    const next = nowPlayingStyle === 'm3-expressive' ? 'apple-music' : nowPlayingStyle === 'apple-music' ? 'spotify' : 'm3-expressive';
                    setNowPlayingStyle(next);
                    toast.success(`Player style: ${next}`);
                  }}
                  className="w-full flex items-center gap-4 px-3 py-3 rounded-2xl hover:bg-white/8 active:bg-white/12 transition-colors text-left"
                >
                  <Sparkles size={20} className="text-sky-400" />
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-sm font-medium text-white">Now Playing Style</span>
                    <span className="text-xs uppercase font-mono px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30">
                      {nowPlayingStyle}
                    </span>
                  </div>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Playlist Picker Modal ─── */}
      <AnimatePresence>
        {showPlaylistPicker && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              className="w-full max-w-sm rounded-3xl bg-[#101524] border border-white/15 p-5 shadow-2xl space-y-4 text-white"
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <ListPlus size={16} className="text-sky-400" />
                  <span>Add to Playlist</span>
                </h3>
                <button
                  onClick={() => setShowPlaylistPicker(false)}
                  className="p-1 rounded-full hover:bg-white/10 text-white/60"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1.5 scrollbar-thin pr-1">
                {playlists.map(pl => (
                  <button
                    key={pl.id}
                    onClick={() => {
                      addToPlaylist(String(pl.id), currentTrack);
                      toast.success(`Added to ${pl.title}`);
                      setShowPlaylistPicker(false);
                      setShowSongMenu(false);
                    }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/8 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                      <ListMusic size={18} className="text-white/70" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate text-white">{pl.title}</p>
                      <p className="text-[10px] text-white/50">{pl.trackCount || 0} tracks</p>
                    </div>
                  </button>
                ))}
                {playlists.length === 0 && (
                  <p className="text-xs text-center text-white/50 py-4">No custom playlists yet</p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

