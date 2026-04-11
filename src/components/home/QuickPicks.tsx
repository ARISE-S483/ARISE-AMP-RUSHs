import { usePlayerStore } from '@/stores/playerStore';
import { useLibraryStore } from '@/stores/libraryStore';
import type { Track } from '@/api/types';
import { Play, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

export function QuickPicks() {
  const { recentlyPlayed, favorites, playlists } = useLibraryStore();
  const play = usePlayerStore(s => s.play);
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const navigate = useNavigate();

  type Tile = {
    id: string;
    title: string;
    subtitle: string;
    thumbnail: string;
    onClick: () => void;
    isActive: boolean;
    gradient?: string;
  };

  const recentTiles: Tile[] = recentlyPlayed.slice(0, 4).map(t => ({
    id: `recent-${t.id}`,
    title: t.title,
    subtitle: t.artist.name,
    thumbnail: t.thumbnail || '',
    onClick: () => { play(t, recentlyPlayed, recentlyPlayed.indexOf(t)); },
    isActive: !!(currentTrack && String(currentTrack.id) === String(t.id)),
  }));

  const favTile: Tile | null = favorites.length > 0 ? {
    id: 'fav-collection',
    title: 'Liked Songs',
    subtitle: `${favorites.length} tracks`,
    thumbnail: favorites[0]?.thumbnail || '',
    onClick: () => { play(favorites[0], favorites, 0); },
    isActive: false,
    gradient: 'from-primary/40 to-primary/10',
  } : null;

  const playlistTiles: Tile[] = playlists.slice(0, 2).map(pl => ({
    id: `pl-${pl.id}`,
    title: pl.title,
    subtitle: `${pl.trackCount || 0} tracks`,
    thumbnail: pl.thumbnail || pl.tracks?.[0]?.thumbnail || '',
    onClick: () => { navigate(`/playlist/${pl.id}`); },
    isActive: false,
  }));

  const tiles = [...recentTiles];
  if (favTile) tiles.splice(2, 0, favTile);
  tiles.push(...playlistTiles);
  const displayTiles = tiles.slice(0, 6);

  if (displayTiles.length === 0) return null;

  return (
    <motion.section variants={fadeUp}>
      <h2 className="font-display text-lg md:text-xl font-semibold mb-3 flex items-center gap-2">
        <Clock size={18} className="text-muted-foreground" />
        Quick Picks
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {displayTiles.map(tile => (
          <motion.button
            key={tile.id}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={tile.onClick}
            className={`flex items-center gap-3 rounded-xl glass-card-elevated liquid-glass-card p-3 text-left transition-all duration-300 group ${
              tile.isActive ? 'ring-2 ring-primary/50 !border-primary/40' : ''
            }`}
          >
            <div className={`w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 shadow-lg ring-1 ring-white/10 ${tile.gradient ? `bg-gradient-to-br ${tile.gradient}` : 'bg-secondary/50'}`}>
              {tile.thumbnail ? (
                <img src={tile.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Play size={18} className="text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{tile.title}</p>
              <p className="text-xs text-muted-foreground truncate">{tile.subtitle}</p>
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full bg-foreground/10">
              <Play size={14} className="text-foreground" fill="currentColor" />
            </div>
          </motion.button>
        ))}
      </div>
    </motion.section>
  );
}
