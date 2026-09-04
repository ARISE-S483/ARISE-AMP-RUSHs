import { useState, useRef, useEffect } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { musicAPI } from '@/api/musicAPI';
import { formatTime } from '@/lib/format';
import {
  Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Repeat1, Heart,
  Maximize2, X, ListMusic, Mic2, Volume2, VolumeX,
  Disc3, PictureInPicture
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MiniPlayerProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function MiniPlayer({ isOpen: propIsOpen, onClose: propOnClose }: MiniPlayerProps = {}) {
  const storeIsOpen = usePlayerStore(s => s.isMiniPlayerOpen);
  const setStoreMiniPlayerOpen = usePlayerStore(s => s.setMiniPlayerOpen);
  const isOpen = propIsOpen !== undefined ? propIsOpen : storeIsOpen;
  const onClose = propOnClose || (() => setStoreMiniPlayerOpen(false));

  const currentTrack = usePlayerStore(s => s.currentTrack);
  const isPlaying = usePlayerStore(s => s.isPlaying);
  const currentTime = usePlayerStore(s => s.currentTime);
  const duration = usePlayerStore(s => s.duration);
  const volume = usePlayerStore(s => s.volume);
  const isMuted = usePlayerStore(s => s.isMuted);
  const isShuffled = usePlayerStore(s => s.isShuffled);
  const repeatMode = usePlayerStore(s => s.repeatMode);
  const queue = usePlayerStore(s => s.queue);
  const queueIndex = usePlayerStore(s => s.queueIndex);

  const togglePlayPause = usePlayerStore(s => s.togglePlayPause);
  const next = usePlayerStore(s => s.next);
  const previous = usePlayerStore(s => s.previous);
  const seek = usePlayerStore(s => s.seek);
  const setVolume = usePlayerStore(s => s.setVolume);
  const toggleMute = usePlayerStore(s => s.toggleMute);
  const toggleShuffle = usePlayerStore(s => s.toggleShuffle);
  const cycleRepeat = usePlayerStore(s => s.cycleRepeat);
  const play = usePlayerStore(s => s.play);

  const { isFavorite, addToFavorites, removeFromFavorites } = useLibraryStore();

  const [activeTab, setActiveTab] = useState<'controls' | 'queue' | 'lyrics'>('controls');
  const [lyrics, setLyrics] = useState<{ time: number; text: string }[]>([]);
  const [synced, setSynced] = useState(false);
  const [loadingLyrics, setLoadingLyrics] = useState(false);

  // Fetch lyrics when track changes or tab opened
  useEffect(() => {
    if (activeTab === 'lyrics' && currentTrack) {
      setLoadingLyrics(true);
      musicAPI
        .getLyrics(currentTrack.title, currentTrack.artist.name, currentTrack.album?.title, currentTrack.duration, currentTrack.videoId)
        .then(res => {
          if (res) {
            setLyrics(res.lines);
            setSynced(res.synced);
          } else {
            setLyrics([]);
            setSynced(false);
          }
          setLoadingLyrics(false);
        })
        .catch(() => {
          setLyrics([]);
          setLoadingLyrics(false);
        });
    }
  }, [activeTab, currentTrack?.id]);

  const liked = currentTrack ? isFavorite(String(currentTrack.id)) : false;
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Active lyric line
  const activeLyricIndex = (() => {
    if (!synced) return -1;
    for (let i = lyrics.length - 1; i >= 0; i--) {
      if (currentTime >= lyrics[i].time) return i;
    }
    return -1;
  })();

  const handlePip = async () => {
    const audio = usePlayerStore.getState().audioElement;
    if (!audio) return;
    try {
      if ('pictureInPictureEnabled' in document && (document as any).pictureInPictureElement) {
        await (document as any).exitPictureInPicture();
      }
    } catch {
      // ignore
    }
  };

  return (
    <AnimatePresence>
      {isOpen && currentTrack && (
        <motion.div
          drag
          dragMomentum={false}
          initial={{ opacity: 0, scale: 0.85, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 40 }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          className="fixed bottom-6 right-6 z-[80] w-[340px] rounded-3xl glass-card shadow-[0_20px_50px_rgba(0,0,0,0.6)] border border-white/20 p-4 select-none backdrop-blur-3xl overflow-hidden cursor-move"
          style={{ touchAction: 'none' }}
        >
      {/* Top action header */}
      <div className="flex items-center justify-between mb-3 cursor-default" onPointerDown={e => e.stopPropagation()}>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('controls')}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-medium transition-colors ${
              activeTab === 'controls' ? 'bg-white/20 text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Now Playing
          </button>
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-medium transition-colors flex items-center gap-1 ${
              activeTab === 'queue' ? 'bg-white/20 text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ListMusic size={12} />
            Queue
          </button>
          <button
            onClick={() => setActiveTab('lyrics')}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-medium transition-colors flex items-center gap-1 ${
              activeTab === 'lyrics' ? 'bg-white/20 text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Mic2 size={12} />
            Lyrics
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-full glass-subtle flex items-center justify-center text-muted-foreground hover:text-foreground"
            title="Expand to Full Player"
          >
            <Maximize2 size={12} />
          </button>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-full glass-subtle flex items-center justify-center text-muted-foreground hover:text-foreground"
            title="Close Mini Player"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Main Content by Tab */}
      {activeTab === 'controls' && (
        <div className="space-y-3 cursor-default" onPointerDown={e => e.stopPropagation()}>
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 bg-secondary shadow-lg relative group">
              {currentTrack.thumbnail ? (
                <img src={currentTrack.thumbnail} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Disc3 size={24} className="text-muted-foreground" />
                </div>
              )}
              <button
                onClick={() => liked ? removeFromFavorites(String(currentTrack.id)) : addToFavorites(currentTrack)}
                className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Heart size={11} className={liked ? 'fill-primary text-primary' : 'text-white'} />
              </button>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground truncate">{currentTrack.title}</p>
              <p className="text-xs text-muted-foreground truncate">{currentTrack.artist?.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-muted-foreground">{formatTime(currentTime)}</span>
                <span className="text-[10px] text-muted-foreground">/</span>
                <span className="text-[10px] text-muted-foreground">{formatTime(duration)}</span>
              </div>
            </div>
          </div>

          {/* Seek progress slider */}
          <div className="space-y-1">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={(e) => seek(Number(e.target.value))}
              className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-primary"
            />
          </div>

          {/* Playback Controls */}
          <div className="flex items-center justify-between px-1">
            <button
              onClick={toggleShuffle}
              className={`p-1.5 transition-colors ${isShuffled ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              title="Shuffle"
            >
              <Shuffle size={14} />
            </button>

            <button
              onClick={previous}
              className="p-1.5 text-foreground hover:scale-110 transition-transform"
              title="Previous"
            >
              <SkipBack size={16} fill="currentColor" />
            </button>

            <button
              onClick={togglePlayPause}
              className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
            </button>

            <button
              onClick={next}
              className="p-1.5 text-foreground hover:scale-110 transition-transform"
              title="Next"
            >
              <SkipForward size={16} fill="currentColor" />
            </button>

            <button
              onClick={cycleRepeat}
              className={`p-1.5 transition-colors ${repeatMode !== 'off' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              title={`Repeat: ${repeatMode}`}
            >
              {repeatMode === 'one' ? <Repeat1 size={14} /> : <Repeat size={14} />}
            </button>

            <button
              onClick={toggleMute}
              className="p-1.5 text-muted-foreground hover:text-foreground"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
          </div>
        </div>
      )}

      {/* Queue Tab */}
      {activeTab === 'queue' && (
        <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin cursor-default pr-1" onPointerDown={e => e.stopPropagation()}>
          {queue.slice(queueIndex, queueIndex + 10).map((t, idx) => {
            const actualIndex = queueIndex + idx;
            const isCur = actualIndex === queueIndex;
            return (
              <button
                key={`${t.id}-${actualIndex}`}
                onClick={() => play(t, queue, actualIndex)}
                className={`flex items-center gap-2.5 w-full p-1.5 rounded-xl text-left transition-colors ${
                  isCur ? 'bg-primary/20 text-primary font-medium' : 'hover:bg-white/10 text-foreground'
                }`}
              >
                <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-secondary">
                  {t.thumbnail ? (
                    <img src={t.thumbnail} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Disc3 size={14} className="m-auto text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs truncate">{t.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{t.artist.name}</p>
                </div>
                <span className="text-[10px] text-muted-foreground flex-shrink-0">{formatTime(t.duration)}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Lyrics Tab */}
      {activeTab === 'lyrics' && (
        <div className="h-48 overflow-y-auto scrollbar-thin cursor-default p-1 text-center space-y-2" onPointerDown={e => e.stopPropagation()}>
          {loadingLyrics ? (
            <p className="text-xs text-muted-foreground pt-16">Loading lyrics...</p>
          ) : lyrics.length > 0 ? (
            lyrics.map((l, i) => {
              const isActive = i === activeLyricIndex;
              return (
                <p
                  key={i}
                  onClick={() => synced && seek(l.time)}
                  className={`text-xs transition-all ${
                    synced ? 'cursor-pointer hover:underline' : ''
                  } ${
                    isActive
                      ? 'text-primary font-bold text-sm scale-105'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {l.text}
                </p>
              );
            })
          ) : (
            <p className="text-xs text-muted-foreground pt-16">No lyrics available</p>
          )}
        </div>
      )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
