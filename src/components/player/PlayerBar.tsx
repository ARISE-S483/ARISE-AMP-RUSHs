import { useState, useRef } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatTime } from '@/lib/format';
import { musicAPI } from '@/api/musicAPI';
import { toast } from 'sonner';
import { FullscreenPlayer } from './FullscreenPlayer';
import { Link, useNavigate } from 'react-router-dom';
import {
  Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Repeat1, Heart,
  ListMusic, Mic2, Loader2,
  Disc3, FolderPlus, Plus,
  Radio, Minimize2, ChevronUp, ChevronDown,
  Volume2, VolumeX, MoreHorizontal, Copy, ExternalLink,
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
      className="absolute bottom-full mb-3 left-0 w-56 rounded-2xl bg-card/95 backdrop-blur-xl border border-border/60 shadow-2xl p-2 z-[70]"
      onClick={e => e.stopPropagation()}
    >
      <div className="text-[11px] font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wider">
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
            className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-xl text-xs text-foreground hover:bg-accent transition-colors text-left"
          >
            <ListMusic size={14} className="text-muted-foreground flex-shrink-0" />
            <span className="truncate">{pl.title}</span>
          </button>
        ))}
        {playlists.length === 0 && (
          <p className="text-xs text-muted-foreground/70 px-2 py-2 text-center">No playlists created</p>
        )}
      </div>

      <div className="pt-1.5 border-t border-border/40">
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
              className="flex-1 px-2 py-1 rounded-lg bg-background text-xs text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary"
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
              className="px-2 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-medium"
            >
              Add
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
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
      className="absolute bottom-full mb-3 left-16 w-52 rounded-2xl bg-card/95 backdrop-blur-xl border border-border/60 shadow-2xl p-1.5 z-[70]"
      onClick={e => e.stopPropagation()}
    >
      {currentTrack.album?.id && (
        <button
          onClick={() => {
            navigate(`/playlist/${currentTrack.album?.id}`);
            onClose();
          }}
          className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-xs text-foreground hover:bg-accent transition-colors text-left"
        >
          <Disc3 size={14} className="text-muted-foreground" />
          <span className="truncate">Go to Album</span>
        </button>
      )}

      {currentTrack.artist?.id && (
        <button
          onClick={() => {
            navigate(`/artist/${encodeURIComponent(currentTrack.artist.id)}`);
            onClose();
          }}
          className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-xs text-foreground hover:bg-accent transition-colors text-left"
        >
          <ExternalLink size={14} className="text-muted-foreground" />
          <span className="truncate">Go to Artist</span>
        </button>
      )}

      <button
        onClick={copyTrackLink}
        className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-xs text-foreground hover:bg-accent transition-colors text-left"
      >
        <Copy size={14} className="text-muted-foreground" />
        <span>Copy Stream Link</span>
      </button>
    </motion.div>
  );
}

// ─── Main Limusic-Style PlayerBar ───
export function PlayerBar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const [showTrackMenu, setShowTrackMenu] = useState(false);
  const [justLiked, setJustLiked] = useState(false);
  const [seekDrag, setSeekDrag] = useState<number | null>(null);

  const currentTrack = usePlayerStore(s => s.currentTrack);
  const isPlaying = usePlayerStore(s => s.isPlaying);
  const isLoading = usePlayerStore(s => s.isLoading);
  const currentTime = usePlayerStore(s => s.currentTime);
  const duration = usePlayerStore(s => s.duration);
  const volume = usePlayerStore(s => s.volume);
  const isMuted = usePlayerStore(s => s.isMuted);
  const isShuffled = usePlayerStore(s => s.isShuffled);
  const repeatMode = usePlayerStore(s => s.repeatMode);
  const isRadioEnabled = usePlayerStore(s => s.isRadioEnabled);
  const isQueueOpen = usePlayerStore(s => s.isQueueOpen);
  const isLyricsOpen = usePlayerStore(s => s.isLyricsOpen);
  const isMiniPlayerOpen = usePlayerStore(s => s.isMiniPlayerOpen);

  const togglePlayPause = usePlayerStore(s => s.togglePlayPause);
  const next = usePlayerStore(s => s.next);
  const previous = usePlayerStore(s => s.previous);
  const seek = usePlayerStore(s => s.seek);
  const setVolume = usePlayerStore(s => s.setVolume);
  const toggleMute = usePlayerStore(s => s.toggleMute);
  const toggleShuffle = usePlayerStore(s => s.toggleShuffle);
  const cycleRepeat = usePlayerStore(s => s.cycleRepeat);
  const toggleQueue = usePlayerStore(s => s.toggleQueue);
  const toggleLyrics = usePlayerStore(s => s.toggleLyrics);
  const toggleMiniPlayer = usePlayerStore(s => s.toggleMiniPlayer);

  const { addToFavorites, removeFromFavorites, isFavorite } = useLibraryStore();
  const isMobile = useIsMobile();
  const barRef = useRef<HTMLDivElement>(null);

  if (!currentTrack) return null;

  const liked = isFavorite(String(currentTrack.id));
  const shownPosition = seekDrag ?? currentTime;
  const seekPct = duration > 0 ? (shownPosition / duration) * 100 : 0;
  const volumePct = isMuted ? 0 : Math.round(volume * 100);

  // Toggle favorite + YouTube Music rate API
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

  // Seek interactions
  const handleSeekInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSeekDrag(Number(e.target.value));
  };
  const handleSeekCommit = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setSeekDrag(null);
    seek(val);
  };

  // Volume wheel scroll (+/- 5%)
  const handleVolumeWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.05 : -0.05;
    const newVol = Math.max(0, Math.min(1, volume + delta));
    setVolume(newVol);
  };

  // Clicking empty area expands full player
  const handleBarClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, input, a, [role="button"]')) return;
    setIsExpanded(true);
  };

  // ─── Mobile PlayerBar ───
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
              className="fixed z-[55] left-0 right-0 px-2.5"
              style={{ bottom: 'calc(var(--bottom-nav-height, 64px) + 6px)' }}
            >
              <div
                className="flex items-center gap-3 px-3 py-2 rounded-2xl bg-card/90 backdrop-blur-2xl border border-border/50 shadow-2xl relative overflow-hidden"
                onClick={() => setIsExpanded(true)}
              >
                {/* Thumbnail */}
                <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 bg-muted shadow-sm">
                  {currentTrack.thumbnail ? (
                    <img src={currentTrack.thumbnail} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Disc3 size={18} />
                    </div>
                  )}
                </div>

                {/* Track info */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">{currentTrack.title}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{currentTrack.artist?.name}</p>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={handleLike}
                    className={`p-2 transition-transform ${justLiked ? 'animate-heart-pop' : ''}`}
                    onAnimationEnd={() => setJustLiked(false)}
                    aria-label="Like"
                  >
                    <Heart size={18} className={liked ? 'fill-primary text-primary' : 'text-muted-foreground'} />
                  </button>
                  <button
                    onClick={togglePlayPause}
                    className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md ml-1"
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isLoading ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : isPlaying ? (
                      <Pause size={18} fill="currentColor" />
                    ) : (
                      <Play size={18} fill="currentColor" className="ml-0.5" />
                    )}
                  </button>
                </div>

                {/* Bottom seek line */}
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10">
                  <div
                    className="h-full bg-primary transition-[width] duration-100 ease-linear"
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

  // ─── Desktop Limusic PlayerBar ───
  return (
    <>
      <AnimatePresence>
        {isExpanded && <FullscreenPlayer onCollapse={() => setIsExpanded(false)} />}
      </AnimatePresence>

      <footer
        ref={barRef}
        onClick={handleBarClick}
        className="fixed inset-x-0 bottom-0 z-50 h-[76px] bg-card/85 backdrop-blur-2xl border-t border-border/40 shadow-2xl flex items-center px-4 md:px-6 select-none transition-all duration-200"
      >
        {/* ─── LEFT: Artwork & Song Meta ─── */}
        <div className="min-w-0 flex-1 flex items-center gap-3.5 relative">
          {/* Cover Art */}
          <div className="w-12 h-12 shrink-0 rounded-lg overflow-hidden bg-muted shadow-sm flex items-center justify-center ring-1 ring-white/10 group relative">
            {currentTrack.thumbnail ? (
              <img src={currentTrack.thumbnail} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
            ) : (
              <Disc3 size={20} className="text-muted-foreground/60" />
            )}
          </div>

          {/* Title & Artist */}
          <div className="min-w-0 flex-1 pr-2">
            <div className="flex items-center gap-1.5">
              {currentTrack.album?.id ? (
                <Link
                  to={`/playlist/${currentTrack.album.id}`}
                  onClick={e => e.stopPropagation()}
                  className="text-sm font-medium text-foreground hover:underline truncate"
                  title={currentTrack.title}
                >
                  {currentTrack.title}
                </Link>
              ) : (
                <span className="text-sm font-medium text-foreground truncate" title={currentTrack.title}>
                  {currentTrack.title}
                </span>
              )}

              {/* Autoplay / Automix Indicator */}
              {(isRadioEnabled || (currentTrack as any).autoplay) && (
                <span className="shrink-0 text-primary/80" title="Playing from Automix Radio">
                  <InfinityIcon size={14} />
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 mt-0.5">
              <Link
                to={`/artist/${encodeURIComponent(currentTrack.artist?.id || currentTrack.artist?.name || 'unknown')}`}
                onClick={e => e.stopPropagation()}
                className="text-xs text-muted-foreground hover:text-foreground hover:underline truncate"
              >
                {currentTrack.artist?.name}
              </Link>
            </div>
          </div>

          {/* Quick Actions: Like, Add, Menu */}
          <div className="flex items-center gap-0.5 relative" onClick={e => e.stopPropagation()}>
            <button
              onClick={handleLike}
              className={`p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors ${
                justLiked ? 'animate-heart-pop' : ''
              }`}
              onAnimationEnd={() => setJustLiked(false)}
              title={liked ? 'Unlike' : 'Like'}
              aria-label="Like"
            >
              <Heart size={16} className={liked ? 'fill-primary text-primary' : ''} />
            </button>

            <button
              onClick={() => {
                setShowPlaylistMenu(!showPlaylistMenu);
                setShowTrackMenu(false);
              }}
              className={`p-2 rounded-lg transition-colors ${
                showPlaylistMenu ? 'text-primary bg-accent/60' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              }`}
              title="Save to playlist"
              aria-label="Save to playlist"
            >
              <FolderPlus size={16} />
            </button>

            <button
              onClick={() => {
                setShowTrackMenu(!showTrackMenu);
                setShowPlaylistMenu(false);
              }}
              className={`p-2 rounded-lg transition-colors ${
                showTrackMenu ? 'text-primary bg-accent/60' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              }`}
              title="More options"
              aria-label="More options"
            >
              <MoreHorizontal size={16} />
            </button>

            <AnimatePresence>
              {showPlaylistMenu && <AddToPlaylistMenu onClose={() => setShowPlaylistMenu(false)} />}
              {showTrackMenu && <TrackOptionsMenu onClose={() => setShowTrackMenu(false)} />}
            </AnimatePresence>
          </div>
        </div>

        {/* ─── CENTER: Transport & Seek Bar ─── */}
        <div className="flex-[1.6] flex flex-col items-center gap-1 min-w-0 max-w-xl mx-auto px-4">
          {/* Controls row */}
          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
            <button
              onClick={toggleShuffle}
              className={`p-2 rounded-lg transition-colors ${
                isShuffled ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
              title={isShuffled ? 'Shuffle: ON' : 'Shuffle: OFF'}
              aria-label="Shuffle"
            >
              <Shuffle size={16} />
            </button>

            <button
              onClick={previous}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              title="Previous"
              aria-label="Previous"
            >
              <SkipBack size={18} fill="currentColor" />
            </button>

            <button
              onClick={togglePlayPause}
              className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md mx-1"
              title={isPlaying ? 'Pause' : 'Play'}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : isPlaying ? (
                <Pause size={18} fill="currentColor" />
              ) : (
                <Play size={18} fill="currentColor" className="ml-0.5" />
              )}
            </button>

            <button
              onClick={next}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              title="Next"
              aria-label="Next"
            >
              <SkipForward size={18} fill="currentColor" />
            </button>

            <button
              onClick={cycleRepeat}
              className={`p-2 rounded-lg transition-colors ${
                repeatMode !== 'off' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
              title={`Repeat: ${repeatMode}`}
              aria-label="Repeat"
            >
              {repeatMode === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
            </button>
          </div>

          {/* Seek progress row */}
          <div className="flex items-center gap-2.5 w-full text-xs text-muted-foreground select-none" onClick={e => e.stopPropagation()}>
            <span className="tabular-nums font-mono text-[11px] w-8 text-right flex-shrink-0">
              {formatTime(shownPosition)}
            </span>

            <input
              type="range"
              className="range flex-1"
              style={{ '--pct': `${seekPct}%` } as React.CSSProperties}
              min={0}
              max={duration || 0}
              step={0.1}
              value={shownPosition}
              onChange={handleSeekCommit}
              onInput={handleSeekInput}
              aria-label="Seek track"
            />

            <span className="tabular-nums font-mono text-[11px] w-8 flex-shrink-0">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* ─── RIGHT: Volume & Floating Views ─── */}
        <div className="flex-1 flex items-center justify-end gap-1.5 md:gap-2 select-none" onClick={e => e.stopPropagation()}>
          {/* Volume Control */}
          <div className="hidden lg:flex items-center gap-1.5 mr-2" onWheel={handleVolumeWheel}>
            <button
              onClick={toggleMute}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
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
            className={`p-2 rounded-lg transition-colors ${
              isMiniPlayerOpen ? 'text-primary bg-accent/60' : 'text-muted-foreground hover:text-foreground hover:bg-accent/40'
            }`}
            title="Mini Player"
            aria-label="Mini Player"
          >
            <Minimize2 size={17} />
          </button>

          {/* Lyrics */}
          <button
            onClick={toggleLyrics}
            className={`p-2 rounded-lg transition-colors ${
              isLyricsOpen ? 'text-primary bg-accent/60' : 'text-muted-foreground hover:text-foreground hover:bg-accent/40'
            }`}
            title="Synced Lyrics"
            aria-label="Lyrics"
          >
            <Mic2 size={17} />
          </button>

          {/* Queue */}
          <button
            onClick={toggleQueue}
            className={`p-2 rounded-lg transition-colors ${
              isQueueOpen ? 'text-primary bg-accent/60' : 'text-muted-foreground hover:text-foreground hover:bg-accent/40'
            }`}
            title="Queue"
            aria-label="Queue"
          >
            <ListMusic size={17} />
          </button>

          {/* Expand Now Playing View */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors ml-0.5"
            title={isExpanded ? 'Collapse player' : 'Expand now playing'}
            aria-label="Now playing sheet"
          >
            {isExpanded ? <ChevronDown size={19} /> : <ChevronUp size={19} />}
          </button>
        </div>
      </footer>
    </>
  );
}
