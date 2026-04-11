import { usePlayerStore } from '@/stores/playerStore';
import { useLibraryStore } from '@/stores/libraryStore';
import type { Track } from '@/api/types';
import { formatTime } from '@/lib/format';
import { Play, Pause, Heart } from 'lucide-react';
import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { TrackContextMenu } from './TrackContextMenu';
import { TrackSourceBadge } from './TrackSourceBadge';

interface TrackListProps {
  tracks: Track[];
  showIndex?: boolean;
  showAlbum?: boolean;
  showDuration?: boolean;
}

export const TrackList = forwardRef<HTMLDivElement, TrackListProps>(function TrackList({ tracks, showIndex = true, showAlbum = false, showDuration = true }, ref) {
  const play = usePlayerStore(s => s.play);
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const isPlaying = usePlayerStore(s => s.isPlaying);
  const { addToFavorites, removeFromFavorites, isFavorite } = useLibraryStore();

  return (
    <TrackContextMenu>
      {({ onContextMenu, onLongPress }) => (
        <div className="w-full" ref={ref}>
          {tracks.map((track, i) => {
            const isActive = currentTrack && String(currentTrack.id) === String(track.id);
            const liked = isFavorite(String(track.id));

            return (
              <motion.div
                key={`${track.id}-${i}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02, duration: 0.2 }}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg group cursor-pointer transition-all duration-200 ${
                  isActive ? 'bg-accent/70' : 'hover:bg-accent/40'
                }`}
                onClick={() => play(track, tracks, i)}
                onContextMenu={(e) => onContextMenu(e, track, tracks, i)}
                onTouchStart={(e) => onLongPress(track, e, tracks, i)}
              >
                {showIndex && (
                  <div className="w-8 text-center flex-shrink-0">
                    <span className={`text-sm group-hover:hidden ${isActive ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                      {isActive && isPlaying ? (
                        <span className="inline-flex gap-0.5 items-end h-3">
                          <span className="w-0.5 h-full bg-foreground animate-pulse-glow rounded-full" />
                          <span className="w-0.5 h-2/3 bg-foreground animate-pulse-glow rounded-full" style={{ animationDelay: '0.2s' }} />
                          <span className="w-0.5 h-full bg-foreground animate-pulse-glow rounded-full" style={{ animationDelay: '0.4s' }} />
                        </span>
                      ) : (
                        i + 1
                      )}
                    </span>
                    <span className="hidden group-hover:inline">
                      {isActive && isPlaying ? (
                        <Pause size={14} className="text-foreground mx-auto" />
                      ) : (
                        <Play size={14} className="text-foreground mx-auto" />
                      )}
                    </span>
                  </div>
                )}

                <img
                  src={track.thumbnail || ''}
                  alt={track.title}
                  className="w-10 h-10 rounded-md object-cover flex-shrink-0 bg-secondary"
                  loading="lazy"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className={`text-sm font-medium truncate ${isActive ? 'text-foreground' : ''}`}>
                      {track.title}
                    </p>
                    {track.explicit && (
                      <span className="flex-shrink-0 w-4 h-4 rounded-[3px] bg-white/12 border border-white/20 flex items-center justify-center text-[9px] font-bold text-white/70">E</span>
                    )}
                    <TrackSourceBadge track={track} />
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{track.artist?.name || 'Unknown Artist'}</p>
                </div>

                {showAlbum && track.album && (
                  <p className="text-xs text-muted-foreground truncate w-32 hidden md:block">{track.album.title}</p>
                )}

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); liked ? removeFromFavorites(String(track.id)) : addToFavorites(track); }}
                    className="p-1 transition-transform active:scale-90"
                  >
                    <Heart size={14} className={liked ? 'fill-foreground text-foreground' : 'text-muted-foreground hover:text-foreground'} />
                  </button>
                </div>

                {showDuration && (
                  <span className="text-xs text-muted-foreground w-12 text-right flex-shrink-0 hidden sm:block">
                    {formatTime(track.duration)}
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </TrackContextMenu>
  );
});
