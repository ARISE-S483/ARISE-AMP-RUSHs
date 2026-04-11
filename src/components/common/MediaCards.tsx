import { forwardRef } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import type { Track, Album, Artist } from '@/api/types';
import { Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { TrackContextMenu } from './TrackContextMenu';

export const AlbumCard = forwardRef<HTMLDivElement, { album: Album }>(function AlbumCard({ album }, ref) {
  const navigate = useNavigate();

  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.02 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="group cursor-pointer p-4 rounded-2xl glass-card-elevated liquid-glass-card"
      onClick={() => navigate(`/playlist/${album.id}`)}
    >
      <div className="relative aspect-square rounded-xl overflow-hidden bg-secondary/50 mb-3.5 shadow-xl ring-1 ring-white/5">
        <img
          src={album.thumbnail || ''}
          alt={album.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            whileHover={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="w-12 h-12 rounded-full bg-primary/95 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 shadow-2xl ring-2 ring-white/20"
          >
            <Play size={20} className="text-white ml-0.5" fill="currentColor" />
          </motion.div>
        </div>
      </div>
      <p className="text-sm font-semibold truncate text-foreground">{album.title}</p>
      <p className="text-xs text-muted-foreground/80 truncate mt-1">{album.artist?.name || 'Unknown Artist'}</p>
    </motion.div>
  );
});


export function TrackCard({ track, tracks, index }: { track: Track; tracks?: Track[]; index?: number }) {
  const play = usePlayerStore(s => s.play);
  const [imgError, setImgError] = useState(false);

  return (
    <TrackContextMenu>
      {({ onContextMenu, onLongPress }) => (
        <motion.div
          whileHover={{ y: -6, scale: 1.02 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="group cursor-pointer p-4 rounded-2xl glass-card-elevated liquid-glass-card"
          onClick={() => play(track, tracks || [track], index || 0)}
          onContextMenu={(e) => onContextMenu(e, track, tracks || [track], index || 0)}
          onTouchStart={(e) => onLongPress(track, e, tracks || [track], index || 0)}
        >
          <div className="relative aspect-square rounded-xl overflow-hidden bg-secondary mb-3 shadow-lg">
            {!imgError && track.thumbnail ? (
              <img
                src={track.thumbnail}
                alt={track.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-secondary">
                <Play size={24} className="text-muted-foreground" />
              </div>
            )}
            <div className="absolute inset-0 bg-background/0 group-hover:bg-background/20 transition-all duration-300 flex items-center justify-center">
              <div className="w-11 h-11 rounded-full bg-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 shadow-xl">
                <Play size={18} className="text-background ml-0.5" fill="currentColor" />
              </div>
            </div>
          </div>
          <p className="text-sm font-medium truncate">{track.title}</p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{track.artist?.name || 'Unknown Artist'}</p>
        </motion.div>
      )}
    </TrackContextMenu>
  );
}

export const ArtistCard = forwardRef<HTMLDivElement, { artist: Artist }>(function ArtistCard({ artist }, ref) {
  const navigate = useNavigate();

  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.02 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="group cursor-pointer p-4 rounded-2xl glass-card-elevated liquid-glass-card text-center"
      onClick={() => navigate(`/artist/${artist.id}`)}
    >
      <div className="relative aspect-square rounded-full overflow-hidden bg-secondary/50 mb-3.5 mx-auto max-w-[160px] shadow-xl ring-2 ring-white/5 group-hover:ring-white/15 transition-all duration-300">
        <img
          src={artist.thumbnail || ''}
          alt={artist.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
          loading="lazy"
        />
      </div>
      <p className="text-sm font-semibold truncate text-foreground">{artist.name}</p>
      <p className="text-xs text-muted-foreground/80 mt-0.5">Artist</p>
    </motion.div>
  );
});
