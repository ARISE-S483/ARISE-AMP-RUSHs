import { useState, useRef } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatTime } from '@/lib/format';
import { musicAPI } from '@/api/musicAPI';
import { toast } from 'sonner';
import { FullscreenPlayer } from './FullscreenPlayer';
import { WavySeekBar } from './WavySeekBar';
import { PitchSpeedModal } from './PitchSpeedModal';
import { EqualizerModal } from './EqualizerModal';
import { Link, useNavigate } from 'react-router-dom';
import {
  Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Repeat1, Heart,
  ListMusic, Mic2, Loader2,
  Disc3, FolderPlus, Plus,
  Minimize2, ChevronUp, ChevronDown,
  Volume2, VolumeX, MoreHorizontal,
  Sliders, Gauge,
  Infinity as InfinityIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Add to Playlist Menu ───
function AddToPlaylistMenu({ onClose }: { onClose: () => void }) {
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const { playlists, createPlaylist, addToPlaylist } = useLibraryStore();
  const [newTitle, setNewTitle] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  if (!currentTrack) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 8 }}
      className="absolute bottom-full mb-3 left-0 w-56 rounded-2xl bg-[#0e1626]/95 backdrop-blur-2xl border border-white/15 shadow-2xl p-2 z-[70] text-white"
      onClick={e => e.stopPropagation()}
    >
      <div className="text-[11px] font-semibold text-white/50 px-2 py-1 uppercase tracking-wider">
        Save to Playlist
      </div>
      <div className="max-h-48 overflow-y-auto space-y-0.5 py-1">
        {playlists.map(pl => (
          <button
            key={pl.id}
            onClick={() => {
              addToPlaylist(String(pl.id), currentTrack);
              toast.success(`Added to ${pl.title}`);
              onClose();
            }}
            className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-xl text-xs text-white hover:bg-white/10 transition-colors text-left"
          >
            <ListMusic size={14} className="text-white/50 flex-shrink-0" />
            <span className="truncate">{pl.title}</span>
          </button>
        ))}
        {playlists.length === 0 && (
          <p className="text-xs text-white/50 px-2 py-2 text-center">No playlists created</p>
        )}
      </div>

      <div className="pt-1.5 border-t border-white/10">
        {showCreate ? (
          <div className="flex items-center gap-1.5 px-1 py-1">
            <input
              type="text"
              autoFocus
              placeholder="Playlist name..."
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && newTitle.trim()) {
                  const pl = createPlaylist(newTitle.trim());
                  addToPlaylist(String(pl.id), currentTrack);
                  toast.success(`Created "${newTitle.trim()}"`);
                  onClose();
                }
              }}
              className="flex-1 px-2 py-1 rounded-lg bg-black/40 text-xs text-white border border-white/15 focus:outline-none focus:ring-1 focus:ring-sky-400"
            />
            <button
              onClick={() => {
                if (newTitle.trim()) {
                  const pl = createPlaylist(newTitle.trim());
                  addToPlaylist(String(pl.id), currentTrack);
                  toast.success(`Created "${newTitle.trim()}"`);
                  onClose();
                }
              }}
              className="px-2.5 py-1 rounded-lg bg-sky-500 text-slate-950 text-xs font-semibold"
            >
              Add
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-xl text-xs text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Plus size={14} /> New playlist
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Track Options Menu ───
function TrackOptionsMenu({ onClose }: { onClose: () => void }) {
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const navigate = useNavigate();

  if (!currentTrack) return null;

  const copyTrackLink = () => {
    const videoId = currentTrack.videoId || (String(currentTrack.id).startsWith('ytm_') ? String(currentTrack.id).slice(4) : currentTrack.id);
    const link = `https://music.youtube.com/watch?v=${videoId}`;
    navigator.clipboard.writeText(link);
    toast.success('YouTube Music link copied to clipboard');
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 8 }}
      className="absolute bottom-full mb-3 left-16 w-52 rounded-2xl bg-[#0e1626]/95 backdrop-blur-2xl border border-white/15 shadow-2xl p-1.5 z-[70] text-white"
      onClick={e => e.stopPropagation()}
    >
      {currentTrack.album?.id && (
        <button
          onClick={() => {
            navigate(`/playlist/${currentTrack.album?.id}`);
            onClose();
          }}
          className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-xs text-white hover:bg-white/10 transition-colors text-left"
        >
          <Disc3 size={14} className="text-white/50" />
          <span className="truncate">Go to Album</span>
        </button>
      )}

      {currentTrack.artist?.name && (
        <button
          onClick={() => {
            navigate(`/artist/${encodeURIComponent(currentTrack.artist?.id || currentTrack.artist?.name || 'unknown')}`);
            onClose();
          }}
          className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-xs text-white hover:bg-white/10 transition-colors text-left"
        >
          <Disc3 size={14} className="text-white/50" />
          <span className="truncate">Go to Artist</span>
        </button>
      )}

      <button
        onClick={copyTrackLink}
        className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-xs text-white hover:bg-white/10 transition-colors text-left"
      >
        <span className="truncate">Copy YouTube Music link</span>
      </button>
    </motion.div>
  );
}

export function PlayerBar() {
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
    togglePlayPause,
    next,
    previous,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
    toggleLyrics,
    toggleQueue,
    toggleMiniPlayer,
    isLyricsOpen,
    isQueueOpen,
    isMiniPlayerOpen,
  } = usePlayerStore();

  const [isExpanded, setIsExpanded] = useState(false);
  const [justLiked, setJustLiked] = useState(false);
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const [showTrackMenu, setShowTrackMenu] = useState(false);
  const [showEqualizer, setShowEqualizer] = useState(false);
  const [showPitchSpeed, setShowPitchSpeed] = useState(false);
  const [useWavySeek, setUseWavySeek] = useState(true);

  const { addToFavorites, removeFromFavorites, isFavorite } = useLibraryStore();
  const isMobile = useIsMobile();
  const barRef = useRef<HTMLDivElement>(null);

  if (!currentTrack) return null;

  const liked = isFavorite(String(currentTrack.id));
  const seekPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const volumePct = isMuted ? 0 : Math.round(volume * 100);

  // Toggle favorite with heart burst
  const handleLike = () => {
    const videoId = currentTrack.videoId || (String(currentTrack.id).startsWith('ytm_') ? String(currentTrack.id).slice(4) : String(currentTrack.id));
    if (!liked) {
      addToFavorites(currentTrack);
      setJustLiked(true);
      if (videoId && currentTrack.source !== 'local') {
        musicAPI.rateSong(videoId, 'like').catch(() => {});
      }
      toast.success(`Added to Liked Songs`);
    } else {
      removeFromFavorites(String(currentTrack.id));
      if (videoId && currentTrack.source !== 'local') {
        musicAPI.rateSong(videoId, 'indifferent').catch(() => {});
      }
      toast.info(`Removed from Liked Songs`);
    }
  };

  const handleVolumeWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.05 : -0.05;
    const newVol = Math.max(0, Math.min(1, volume + delta));
    setVolume(newVol);
  };

  const handleBarClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, input, a, [role="button"], canvas')) return;
    setIsExpanded(true);
  };

  // ─── Mobile View ───
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
              className="fixed z-[55] left-2 right-2 px-1"
              style={{ bottom: 'calc(var(--bottom-nav-height, 64px) + 6px)' }}
            >
              <div
                className="flex items-center gap-3 px-3 py-2 rounded-2xl bg-[#090e1d]/90 backdrop-blur-2xl border border-white/15 shadow-2xl relative overflow-hidden"
                onClick={() => setIsExpanded(true)}
              >
                <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 bg-muted shadow-sm">
                  {currentTrack.thumbnail ? (
                    <img src={currentTrack.thumbnail} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Disc3 size={18} />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate">{currentTrack.title}</p>
                  <p className="text-xs text-white/60 truncate mt-0.5">{currentTrack.artist?.name}</p>
                </div>

                <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={handleLike}
                    className={`p-2 transition-transform ${justLiked ? 'animate-heart-pop' : ''}`}
                    onAnimationEnd={() => setJustLiked(false)}
                    aria-label="Like"
                  >
                    <Heart size={18} className={liked ? 'fill-[#FF4081] text-[#FF4081]' : 'text-white/60'} />
                  </button>
                  <button
                    onClick={togglePlayPause}
                    className="w-10 h-10 rounded-full bg-gradient-to-r from-sky-400 to-cyan-300 text-slate-950 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md mx-0.5"
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isLoading ? (
                      <Loader2 size={18} className="animate-spin text-slate-950" />
                    ) : isPlaying ? (
                      <Pause size={18} fill="currentColor" />
                    ) : (
                      <Play size={18} fill="currentColor" className="ml-0.5" />
                    )}
                  </button>
                  <button
                    onClick={next}
                    className="p-2 text-white/60 hover:text-white transition-colors"
                    aria-label="Next"
                  >
                    <SkipForward size={18} fill="currentColor" />
                  </button>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-sky-400 to-cyan-300 transition-[width] duration-100 ease-linear"
                    style={{ width: `${seekPct}%` }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  // ─── Desktop & Tablet SimpMusic Liquid Glass PlayerBar ───
  return (
    <>
      <AnimatePresence>
        {isExpanded && <FullscreenPlayer onCollapse={() => setIsExpanded(false)} />}
      </AnimatePresence>

      <footer
        ref={barRef}
        onClick={handleBarClick}
        className="fixed left-3 md:left-[84px] right-3 bottom-2.5 z-50 h-[76px] rounded-2xl bg-[#090f20]/80 backdrop-blur-2xl border border-white/15 shadow-[0_12px_40px_rgba(0,0,0,0.6)] flex items-center px-4 md:px-6 select-none transition-all duration-200"
      >
        {/* ─── LEFT: Artwork & Track Meta ─── */}
        <div className="min-w-0 flex-1 flex items-center gap-3.5 relative">
          <div className="w-12 h-12 shrink-0 rounded-xl overflow-hidden bg-muted/20 shadow-md flex items-center justify-center ring-1 ring-white/15 group relative">
            {currentTrack.thumbnail ? (
              <img src={currentTrack.thumbnail} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
            ) : (
              <Disc3 size={20} className="text-white/40" />
            )}
          </div>

          <div className="min-w-0 flex-1 pr-2">
            <div className="flex items-center gap-1.5">
              {currentTrack.album?.id ? (
                <Link
                  to={`/playlist/${currentTrack.album.id}`}
                  onClick={e => e.stopPropagation()}
                  className="text-sm font-semibold text-white hover:text-sky-300 hover:underline truncate transition-colors"
                  title={currentTrack.title}
                >
                  {currentTrack.title}
                </Link>
              ) : (
                <span className="text-sm font-semibold text-white truncate" title={currentTrack.title}>
                  {currentTrack.title}
                </span>
              )}

              {(isRadioEnabled || (currentTrack as any).autoplay) && (
                <span className="shrink-0 text-sky-400" title="Playing from AutoMix Radio">
                  <InfinityIcon size={14} />
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 mt-0.5">
              <Link
                to={`/artist/${encodeURIComponent(currentTrack.artist?.id || currentTrack.artist?.name || 'unknown')}`}
                onClick={e => e.stopPropagation()}
                className="text-xs text-white/60 hover:text-white hover:underline truncate transition-colors"
              >
                {currentTrack.artist?.name}
              </Link>
            </div>
          </div>

          {/* Action cluster: Like, Playlist, Menu */}
          <div className="flex items-center gap-1 relative" onClick={e => e.stopPropagation()}>
            <button
              onClick={handleLike}
              className={`p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors ${
                justLiked ? 'animate-heart-pop' : ''
              }`}
              onAnimationEnd={() => setJustLiked(false)}
              title={liked ? 'Unlike' : 'Like'}
              aria-label="Like"
            >
              <Heart size={17} className={liked ? 'fill-[#FF4081] text-[#FF4081]' : ''} />
            </button>

            <button
              onClick={() => {
                setShowPlaylistMenu(!showPlaylistMenu);
                setShowTrackMenu(false);
              }}
              className={`p-2 rounded-xl transition-colors ${
                showPlaylistMenu ? 'text-sky-400 bg-sky-500/20' : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
              title="Save to playlist"
              aria-label="Save to playlist"
            >
              <FolderPlus size={17} />
            </button>

            <button
              onClick={() => {
                setShowTrackMenu(!showTrackMenu);
                setShowPlaylistMenu(false);
              }}
              className={`p-2 rounded-xl transition-colors ${
                showTrackMenu ? 'text-sky-400 bg-sky-500/20' : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
              title="More options"
              aria-label="More options"
            >
              <MoreHorizontal size={17} />
            </button>

            <AnimatePresence>
              {showPlaylistMenu && <AddToPlaylistMenu onClose={() => setShowPlaylistMenu(false)} />}
              {showTrackMenu && <TrackOptionsMenu onClose={() => setShowTrackMenu(false)} />}
            </AnimatePresence>
          </div>
        </div>

        {/* ─── CENTER: Transport & Wavy Seek Bar ─── */}
        <div className="flex-[1.6] flex flex-col items-center gap-0.5 min-w-0 max-w-xl mx-auto px-4">
          <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
            <button
              onClick={toggleShuffle}
              className={`p-2 rounded-xl transition-colors ${
                isShuffled ? 'text-sky-400 bg-sky-500/15' : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
              title={isShuffled ? 'Shuffle: ON' : 'Shuffle: OFF'}
              aria-label="Shuffle"
            >
              <Shuffle size={16} />
            </button>

            <button
              onClick={previous}
              className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              title="Previous"
              aria-label="Previous"
            >
              <SkipBack size={18} fill="currentColor" />
            </button>

            <button
              onClick={togglePlayPause}
              className="w-10 h-10 rounded-full bg-gradient-to-r from-sky-400 to-cyan-300 text-slate-950 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_16px_rgba(142,202,230,0.4)] mx-1"
              title={isPlaying ? 'Pause' : 'Play'}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin text-slate-950" />
              ) : isPlaying ? (
                <Pause size={18} fill="currentColor" />
              ) : (
                <Play size={18} fill="currentColor" className="ml-0.5" />
              )}
            </button>

            <button
              onClick={next}
              className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              title="Next"
              aria-label="Next"
            >
              <SkipForward size={18} fill="currentColor" />
            </button>

            <button
              onClick={cycleRepeat}
              className={`p-2 rounded-xl transition-colors ${
                repeatMode !== 'off' ? 'text-sky-400 bg-sky-500/15' : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
              title={`Repeat: ${repeatMode}`}
              aria-label="Repeat"
            >
              {repeatMode === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
            </button>
          </div>

          {/* Seek progress row with WavySeekBar */}
          <div className="flex items-center gap-2.5 w-full text-xs text-white/60 select-none" onClick={e => e.stopPropagation()}>
            <span className="tabular-nums font-mono text-[11px] w-8 text-right flex-shrink-0 text-white/70">
              {formatTime(currentTime)}
            </span>

            <div className="flex-1">
              <WavySeekBar
                current={currentTime}
                duration={duration}
                isPlaying={isPlaying}
                onSeek={seek}
                wavy={useWavySeek}
              />
            </div>

            <span className="tabular-nums font-mono text-[11px] w-8 flex-shrink-0 text-white/70">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* ─── RIGHT: Dynamics, Equalizer, Volume & Drawers ─── */}
        <div className="flex-1 flex items-center justify-end gap-1.5 md:gap-2 select-none" onClick={e => e.stopPropagation()}>
          {/* Speed & Pitch popup trigger */}
          <button
            onClick={() => setShowPitchSpeed(true)}
            className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            title="Speed & Pitch controls"
          >
            <Gauge size={17} />
          </button>

          {/* Equalizer modal trigger */}
          <button
            onClick={() => setShowEqualizer(true)}
            className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            title="10-Band Equalizer"
          >
            <Sliders size={17} />
          </button>

          {/* Volume slider with wheel */}
          <div className="hidden lg:flex items-center gap-1.5 mr-1" onWheel={handleVolumeWheel}>
            <button
              onClick={toggleMute}
              className="p-1.5 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              title={isMuted || volume === 0 ? 'Unmute' : 'Mute'}
              aria-label="Mute toggle"
            >
              {isMuted || volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
            </button>

            <input
              type="range"
              className="range w-20 xl:w-24"
              style={{ '--pct': `${volumePct}%` } as React.CSSProperties}
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={e => setVolume(Number(e.target.value))}
              aria-label="Volume slider"
            />
          </div>

          {/* Mini Player */}
          <button
            onClick={toggleMiniPlayer}
            className={`p-2 rounded-xl transition-colors ${
              isMiniPlayerOpen ? 'text-sky-400 bg-sky-500/20' : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
            title="Mini Player"
            aria-label="Mini Player"
          >
            <Minimize2 size={17} />
          </button>

          {/* Synced Lyrics */}
          <button
            onClick={toggleLyrics}
            className={`p-2 rounded-xl transition-colors ${
              isLyricsOpen ? 'text-sky-400 bg-sky-500/20' : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
            title="Synced Lyrics"
            aria-label="Lyrics"
          >
            <Mic2 size={17} />
          </button>

          {/* Queue Drawer */}
          <button
            onClick={toggleQueue}
            className={`p-2 rounded-xl transition-colors ${
              isQueueOpen ? 'text-sky-400 bg-sky-500/20' : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
            title="Queue"
            aria-label="Queue"
          >
            <ListMusic size={17} />
          </button>

          {/* Fullscreen Expand Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors ml-0.5"
            title={isExpanded ? 'Collapse player' : 'Expand now playing'}
            aria-label="Now playing sheet"
          >
            {isExpanded ? <ChevronDown size={19} /> : <ChevronUp size={19} />}
          </button>
        </div>
      </footer>

      {/* Speed & Pitch Dialog */}
      <PitchSpeedModal isOpen={showPitchSpeed} onClose={() => setShowPitchSpeed(false)} />

      {/* 10-Band Equalizer Dialog */}
      <EqualizerModal isOpen={showEqualizer} onClose={() => setShowEqualizer(false)} />
    </>
  );
}
