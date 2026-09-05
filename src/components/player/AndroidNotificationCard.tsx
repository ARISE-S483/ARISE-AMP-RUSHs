import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Play, Pause, SkipBack, SkipForward,
  Heart, Repeat, Repeat1,
  Wifi, Signal, Bluetooth,
  ChevronDown, X, Music
} from 'lucide-react';
import { usePlayerStore } from '@/stores/playerStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { WavySeekBar } from './WavySeekBar';

interface AndroidNotificationCardProps {
  onClose: () => void;
}

/**
 * Android 13/14 System Media Notification Shade Simulator
 * Faithfully recreating Image 1 from user screenshots:
 * - Android Quick Settings tiles (Internet, Wi-Fi, Mobile Data, Bluetooth)
 * - Android 13/14 Media Player Notification Card with dynamic artwork blur
 * - Wavy squiggly seeker bar
 * - Big white squircle Play/Pause button
 * - Musixmatch Floating Lyrics notification card
 * - Fully interactive and synchronized with active AudioEngine & playerStore
 */
export function AndroidNotificationCard({ onClose }: AndroidNotificationCardProps) {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    repeatMode,
    togglePlayPause,
    next,
    previous,
    seek,
    cycleRepeat
  } = usePlayerStore();

  const { isFavorite, addToFavorites, removeFromFavorites } = useLibraryStore();
  const [musixmatchHidden, setMusixmatchHidden] = useState(false);

  if (!currentTrack) return null;

  const liked = isFavorite(String(currentTrack.id));

  const handleLike = () => {
    if (liked) {
      removeFromFavorites(String(currentTrack.id));
    } else {
      addToFavorites(currentTrack);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -40 }}
      transition={{ type: 'spring', damping: 28, stiffness: 350 }}
      className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-xl flex flex-col justify-start items-center p-3 sm:p-5 overflow-y-auto select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-[32px] bg-[#11161d] border border-white/10 shadow-2xl p-4 sm:p-5 space-y-4 my-auto relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Close Handle Bar */}
        <div className="flex items-center justify-between pb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
            Android 14 Media Notification
          </span>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-white/70 hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* ─── Android Quick Settings Tiles (Image 1 Header) ─── */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center justify-between px-3.5 py-3 rounded-2xl bg-[#c4eed0] text-[#072711] font-medium text-xs shadow-sm">
            <div className="flex items-center gap-2 truncate">
              <Wifi size={16} />
              <span className="truncate font-semibold">Internet</span>
            </div>
            <ChevronDown size={14} className="rotate-[-90deg] shrink-0 opacity-70" />
          </div>

          <div className="flex items-center justify-between px-3.5 py-3 rounded-2xl bg-[#c4eed0] text-[#072711] font-medium text-xs shadow-sm">
            <div className="flex items-center gap-2 truncate">
              <Wifi size={16} />
              <span className="truncate font-semibold">Chanhpham</span>
            </div>
          </div>

          <div className="flex items-center justify-between px-3.5 py-3 rounded-2xl bg-[#28313a] text-white/90 font-medium text-xs">
            <div className="flex items-center gap-2 truncate">
              <Signal size={16} />
              <span className="truncate">Dữ liệu di động</span>
            </div>
          </div>

          <div className="flex items-center justify-between px-3.5 py-3 rounded-2xl bg-[#28313a] text-white/90 font-medium text-xs">
            <div className="flex items-center gap-2 truncate">
              <Bluetooth size={16} />
              <span className="truncate">Bluetooth</span>
            </div>
            <ChevronDown size={14} className="rotate-[-90deg] shrink-0 opacity-70" />
          </div>
        </div>

        {/* ─── Android 13/14 Media Player Card (Image 1 Exact Layout) ─── */}
        <div className="relative rounded-[28px] overflow-hidden p-4 border border-white/10 shadow-xl bg-slate-900">
          {/* Dynamic Artwork Background with Gaussian Blur */}
          <div
            className="absolute inset-0 bg-cover bg-center filter blur-2xl scale-125 opacity-55 pointer-events-none"
            style={{ backgroundImage: `url(${currentTrack.thumbnail || ''})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40 pointer-events-none" />

          <div className="relative z-10 space-y-3">
            {/* Top Row: Note Icon + Device Output Switcher Pill */}
            <div className="flex items-center justify-between">
              <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                <Music size={13} />
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-white text-[11px] font-medium">
                <span>Điện thoại này</span>
              </div>
            </div>

            {/* Track Title, Artist & Big White Squircle Play/Pause */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="min-w-0 flex-1">
                <h4 className="text-base font-bold text-white tracking-tight truncate drop-shadow-sm">
                  {currentTrack.title}
                </h4>
                <p className="text-xs text-white/70 truncate mt-0.5">
                  {currentTrack.artist?.name || 'Unknown Artist'}
                </p>
              </div>

              {/* Big White Squircle Play/Pause Button */}
              <button
                onClick={togglePlayPause}
                className="w-14 h-14 rounded-[22px] bg-white text-slate-950 flex items-center justify-center shadow-lg active:scale-95 transition-transform shrink-0"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause size={24} fill="currentColor" />
                ) : (
                  <Play size={24} fill="currentColor" className="ml-1" />
                )}
              </button>
            </div>

            {/* Android 13/14 Wavy Squiggly Playback Seeker */}
            <div className="pt-1">
              <WavySeekBar
                current={currentTime}
                duration={duration}
                isPlaying={isPlaying}
                onSeek={seek}
                wavy={true}
              />
            </div>

            {/* Bottom Controls Row: Previous, Seek, Next, Heart, Repeat */}
            <div className="flex items-center justify-between pt-1 text-white/80">
              <button
                onClick={previous}
                className="p-1.5 rounded-full hover:bg-white/10 active:scale-90 transition-transform"
                title="Previous"
              >
                <SkipBack size={18} fill="currentColor" />
              </button>

              <button
                onClick={() => seek(Math.max(0, currentTime - 10))}
                className="p-1.5 rounded-full hover:bg-white/10 active:scale-90 transition-transform text-xs font-mono"
                title="-10s"
              >
                -10s
              </button>

              <button
                onClick={next}
                className="p-1.5 rounded-full hover:bg-white/10 active:scale-90 transition-transform"
                title="Next"
              >
                <SkipForward size={18} fill="currentColor" />
              </button>

              <button
                onClick={handleLike}
                className="p-1.5 rounded-full hover:bg-white/10 active:scale-90 transition-transform"
                title={liked ? 'Unlike' : 'Like'}
              >
                <Heart size={18} className={liked ? 'fill-[#FF4081] text-[#FF4081]' : 'text-white/80'} />
              </button>

              <button
                onClick={cycleRepeat}
                className={`p-1.5 rounded-full hover:bg-white/10 active:scale-90 transition-transform ${
                  repeatMode !== 'off' ? 'text-sky-300' : 'text-white/60'
                }`}
                title={`Repeat: ${repeatMode}`}
              >
                {repeatMode === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
              </button>
            </div>
          </div>
        </div>

        {/* ─── Musixmatch Floating Lyrics Notification (Image 1) ─── */}
        <div className="space-y-2">
          <div className="text-[11px] font-semibold text-white/50 px-1">Im lặng</div>

          <div
            onClick={() => setMusixmatchHidden(!musixmatchHidden)}
            className="rounded-2xl bg-[#1c242d] border border-white/5 p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-[#202a35] transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-full bg-[#8de4b3] text-[#0a351e] flex items-center justify-center font-bold text-xs shrink-0">
                M
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-white/50">Musixmatch</p>
                <p className="text-xs font-bold text-white truncate mt-0.5">
                  {currentTrack.title} - {currentTrack.artist?.name}
                </p>
                <p className="text-[11px] text-white/60 truncate mt-0.5">
                  {musixmatchHidden ? 'Lời bài hát đang ẩn' : 'Chạm để ẩn lời bài hát'}
                </p>
              </div>
            </div>

            {/* Musixmatch Coral Badge */}
            <div className="w-10 h-10 rounded-full bg-[#f45c48] text-white flex items-center justify-center font-black text-sm shrink-0 shadow-md">
              ⋈
            </div>
          </div>

          <div className="rounded-2xl bg-[#1c242d] border border-white/5 p-3 flex items-center justify-between text-xs text-white/80">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                M
              </div>
              <span>Musixmatch hiển thị trên ứng dụng khác</span>
            </div>
            <ChevronDown size={14} className="text-white/40" />
          </div>

          <div className="rounded-2xl bg-[#1c242d] border border-white/5 p-3 flex items-center justify-between text-xs text-white/80">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                ⚙
              </div>
              <span>Hệ thống Android</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-white/50">
              <span>2</span>
              <ChevronDown size={14} className="text-white/40" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
