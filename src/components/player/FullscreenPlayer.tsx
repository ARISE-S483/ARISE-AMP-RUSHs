import { useState, useEffect, useRef, useCallback, forwardRef } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useThemeStore } from '@/stores/themeStore';
import { useIsMobile } from '@/hooks/use-mobile';
import { ProgressBar } from './ProgressBar';
import { VolumeControl } from './VolumeControl';
import { Visualizer } from './Visualizer';
import { WavySeekBar } from './WavySeekBar';
import { PitchSpeedModal } from './PitchSpeedModal';
import { EqualizerModal } from './EqualizerModal';
import { ShareLyricsCard } from './ShareLyricsCard';
import { downloadTrack } from '@/lib/download';
import { formatTime } from '@/lib/format';
import { musicAPI } from '@/api/musicAPI';
import { Track } from '@/api/types';
import { toast } from 'sonner';
import {
  Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Repeat1, Heart,
  ListMusic, Mic2, AudioWaveform, Loader2,
  Download, Disc3, ChevronDown, FolderPlus, Plus,
  Radio, Timer, TimerOff, X, GripVertical,
  Trash2, Music, Music2, Globe, RotateCcw,
  Sliders, Gauge, Share2, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';

interface FullscreenPlayerProps {
  onCollapse: () => void;
}

interface LyricsLine {
  time: number;
  text: string;
}

export function FullscreenPlayer({ onCollapse }: FullscreenPlayerProps) {
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
    isRadioEnabled,
    queue,
    queueIndex,
    lyrics,
    sleepTimerMinutes,
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
    reorderQueue,
    playTrack,
    setSleepTimer,
  } = usePlayerStore();

  const { nowPlayingStyle, setNowPlayingStyle } = useThemeStore();
  const { addToFavorites, removeFromFavorites, isFavorite } = useLibraryStore();
  const isMobile = useIsMobile();

  // Modals state
  const [showPitchSpeed, setShowPitchSpeed] = useState(false);
  const [showEqualizer, setShowEqualizer] = useState(false);
  const [showShareLyrics, setShowShareLyrics] = useState(false);
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<'player' | 'lyrics' | 'queue'>('player');
  const [justLiked, setJustLiked] = useState(false);
  const [activeButtonPress, setActiveButtonPress] = useState<'prev' | 'play' | 'next' | null>(null);

  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const activeLyricRef = useRef<HTMLDivElement>(null);

  if (!currentTrack) return null;

  const liked = isFavorite(String(currentTrack.id));
  const parsedLyrics: LyricsLine[] = lyrics?.synced && Array.isArray(lyrics.synced) ? lyrics.synced : [];

  // Find active lyrics index
  const activeLyricIndex = parsedLyrics.findIndex((line, i) => {
    const nextLine = parsedLyrics[i + 1];
    return currentTime >= line.time && (!nextLine || currentTime < nextLine.time);
  });

  // Auto-scroll active lyric
  useEffect(() => {
    if (activeLyricRef.current && (activeTab === 'lyrics' || nowPlayingStyle === 'apple-music')) {
      activeLyricRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeLyricIndex, activeTab, nowPlayingStyle]);

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
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#070b16]/70 via-[#070b16]/90 to-[#070b16] pointer-events-none" />

      {/* ─── TOP BAR: Style Switcher & Controls ─── */}
      <header className="relative z-10 h-16 w-full px-6 flex items-center justify-between border-b border-white/10 shrink-0">
        {/* Left: Collapse button */}
        <button
          onClick={onCollapse}
          className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          title="Collapse Player"
        >
          <ChevronDown size={22} />
        </button>

        {/* Center: SimpMusic 3-in-1 Style Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-xl">
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

        {/* Right: Signature SimpMusic Actions */}
        <div className="flex items-center gap-2">
          {/* Share Lyrics Card button */}
          <button
            onClick={() => setShowShareLyrics(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 hover:text-white text-xs font-medium border border-white/15 transition-colors"
            title="Create Share Lyrics Card"
          >
            <Share2 size={14} className="text-sky-400" />
            <span className="hidden sm:inline">Share Lyrics</span>
          </button>

          {/* Speed & Pitch */}
          <button
            onClick={() => setShowPitchSpeed(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            title="Speed & Pitch"
          >
            <Gauge size={18} />
          </button>

          {/* 10-Band Equalizer */}
          <button
            onClick={() => setShowEqualizer(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            title="Equalizer"
          >
            <Sliders size={18} />
          </button>

          {/* Sleep Timer */}
          <div className="relative">
            <button
              onClick={() => setShowTimerMenu(!showTimerMenu)}
              className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${
                sleepTimerMinutes
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-400/40'
                  : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white'
              }`}
              title="Sleep Timer"
            >
              <Timer size={18} />
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
                  {sleepTimerMinutes && (
                    <button
                      onClick={() => {
                        setSleepTimer(null);
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
        </div>
      </header>

      {/* ─── BODY VIEWPORT: Style-Specific Presentation ─── */}
      <div className="relative z-10 flex-1 overflow-hidden p-6 flex flex-col">
        {/* ========================================================= */}
        {/* 1. MATERIAL 3 EXPRESSIVE STYLE                            */}
        {/* ========================================================= */}
        {nowPlayingStyle === 'm3-expressive' && (
          <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-8 max-w-5xl mx-auto w-full">
            {/* Playful squircle album artwork */}
            <div className="w-full max-w-[340px] md:max-w-[420px] aspect-square rounded-[36px] overflow-hidden shadow-[0_24px_50px_rgba(0,0,0,0.8)] border border-white/20 relative group">
              {currentTrack.thumbnail ? (
                <img src={currentTrack.thumbnail} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-white/5 text-white/40">
                  <Disc3 size={80} />
                </div>
              )}
            </div>

            {/* M3 Expressive Column */}
            <div className="w-full max-w-md flex flex-col justify-center space-y-6">
              {/* Title & Artist */}
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white truncate drop-shadow-md">
                    {currentTrack.title}
                  </h2>
                  <p className="text-base text-sky-300/80 font-medium truncate mt-1">
                    {currentTrack.artist?.name}
                  </p>
                </div>
                <button
                  onClick={handleLike}
                  className={`p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-transform ${
                    justLiked ? 'animate-heart-pop' : ''
                  }`}
                  onAnimationEnd={() => setJustLiked(false)}
                >
                  <Heart size={24} className={liked ? 'fill-[#FF4081] text-[#FF4081]' : 'text-white/60'} />
                </button>
              </div>

              {/* Animated Wavy Seekbar */}
              <div className="space-y-1">
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
              <div className="h-[72px] w-full flex items-center gap-3">
                {/* Previous Pill (Weight 0.55) */}
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
                >
                  <SkipBack size={24} fill="currentColor" />
                </button>

                {/* Play/Pause Center Pill (Weight 1.2, Morphs Squircle: 24px when playing <-> 36px when paused) */}
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
                >
                  {isLoading ? (
                    <Loader2 size={30} className="animate-spin text-slate-950" />
                  ) : isPlaying ? (
                    <Pause size={30} fill="currentColor" />
                  ) : (
                    <Play size={30} fill="currentColor" className="ml-1" />
                  )}
                </button>

                {/* Next Pill (Weight 0.55) */}
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
                >
                  <SkipForward size={24} fill="currentColor" />
                </button>
              </div>

              {/* Auxiliary Controls */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={toggleShuffle}
                  className={`p-3 rounded-2xl transition-colors ${
                    isShuffled ? 'text-sky-400 bg-sky-500/20' : 'text-white/60 hover:text-white'
                  }`}
                  title="Shuffle"
                >
                  <Shuffle size={20} />
                </button>

                {/* Volume slider */}
                <div className="flex items-center gap-2 max-w-[160px] w-full">
                  <button onClick={toggleMute} className="text-white/60 hover:text-white">
                    {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
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
                  className={`p-3 rounded-2xl transition-colors ${
                    repeatMode !== 'off' ? 'text-sky-400 bg-sky-500/20' : 'text-white/60 hover:text-white'
                  }`}
                  title="Repeat"
                >
                  {repeatMode === 'one' ? <Repeat1 size={20} /> : <Repeat size={20} />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 2. APPLE MUSIC STYLE (Split Screen + Synced Lyrics)       */}
        {/* ========================================================= */}
        {nowPlayingStyle === 'apple-music' && (
          <div className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-8 max-w-6xl mx-auto w-full h-full overflow-hidden">
            {/* Left: Huge Artwork + Transport info */}
            <div className="w-full lg:w-1/2 flex flex-col items-center justify-center space-y-5">
              <div className="w-full max-w-[380px] aspect-square rounded-3xl overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.85)] border border-white/20">
                <img src={currentTrack.thumbnail || ''} alt="" className="w-full h-full object-cover" />
              </div>

              <div className="w-full max-w-[380px]">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-2xl font-bold text-white truncate">{currentTrack.title}</h2>
                    <p className="text-sm text-pink-300 font-medium truncate mt-0.5">{currentTrack.artist?.name}</p>
                  </div>
                  <button onClick={handleLike} className="p-2 rounded-xl text-white/60 hover:text-white">
                    <Heart size={22} className={liked ? 'fill-[#FF4081] text-[#FF4081]' : ''} />
                  </button>
                </div>

                {/* Scrubber */}
                <div className="mt-4 space-y-1">
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
                <div className="flex items-center justify-center gap-8 mt-4">
                  <button onClick={previous} className="p-2 text-white/70 hover:text-white">
                    <SkipBack size={26} fill="currentColor" />
                  </button>
                  <button
                    onClick={togglePlayPause}
                    className="w-14 h-14 rounded-full bg-white text-slate-950 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl"
                  >
                    {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
                  </button>
                  <button onClick={next} className="p-2 text-white/70 hover:text-white">
                    <SkipForward size={26} fill="currentColor" />
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Apple Music Synced Karaoke Lyrics Sheet */}
            <div className="w-full lg:w-1/2 h-[75vh] flex flex-col rounded-3xl bg-white/5 border border-white/10 p-6 backdrop-blur-2xl overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-2">
                <span className="text-xs uppercase font-bold tracking-wider text-white/60">Apple Music Lyrics</span>
                <button
                  onClick={() => setShowShareLyrics(true)}
                  className="text-xs text-pink-400 hover:text-pink-300 font-medium flex items-center gap-1"
                >
                  <Share2 size={13} />
                  <span>Share Card</span>
                </button>
              </div>

              <div ref={lyricsContainerRef} className="flex-1 overflow-y-auto scrollbar-none space-y-6 py-8 pr-2">
                {parsedLyrics.map((line, idx) => {
                  const isActive = idx === activeLyricIndex;
                  return (
                    <div
                      key={idx}
                      ref={isActive ? activeLyricRef : null}
                      onClick={() => seek(line.time)}
                      className={`cursor-pointer transition-all duration-300 ${
                        isActive
                          ? 'text-2xl md:text-3xl font-extrabold text-white scale-105 origin-left drop-shadow-[0_0_20px_rgba(255,255,255,0.6)]'
                          : 'text-xl md:text-2xl font-semibold text-white/35 hover:text-white/70'
                      }`}
                    >
                      {line.text}
                    </div>
                  );
                })}
                {parsedLyrics.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-white/40 space-y-2">
                    <Mic2 size={36} />
                    <p className="text-sm">No synchronized lyrics available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 3. SPOTIFY / CLASSIC STYLE                                */}
        {/* ========================================================= */}
        {nowPlayingStyle === 'spotify' && (
          <div className="flex-1 flex flex-col items-center justify-between max-w-xl mx-auto w-full py-2">
            {/* Artwork */}
            <div className="w-full max-w-[360px] aspect-square rounded-2xl overflow-hidden shadow-2xl border border-white/15 my-auto">
              <img src={currentTrack.thumbnail || ''} alt="" className="w-full h-full object-cover" />
            </div>

            {/* Info and controls */}
            <div className="w-full space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <h2 className="text-2xl font-bold text-white truncate">{currentTrack.title}</h2>
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
              <div className="flex items-center justify-between px-4">
                <button onClick={toggleShuffle} className={`p-2 ${isShuffled ? 'text-emerald-400' : 'text-white/60'}`}>
                  <Shuffle size={18} />
                </button>
                <button onClick={previous} className="p-2 text-white/70 hover:text-white">
                  <SkipBack size={24} fill="currentColor" />
                </button>
                <button
                  onClick={togglePlayPause}
                  className="w-14 h-14 rounded-full bg-white text-slate-950 flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all"
                >
                  {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-0.5" />}
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
        lyricsLines={parsedLyrics}
        currentLineIndex={activeLyricIndex}
      />
    </motion.div>
  );
}
