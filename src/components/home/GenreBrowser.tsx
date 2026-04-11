import { useState } from 'react';
import { musicAPI } from '@/api/musicAPI';
import type { Track } from '@/api/types';
import { Flame, Music2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { TrackList } from '@/components/common/TrackList';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

const GENRES = [
  { name: 'Pop', emoji: '🎤' },
  { name: 'Hip Hop', emoji: '🎧' },
  { name: 'R&B', emoji: '💜' },
  { name: 'Rock', emoji: '🎸' },
  { name: 'Electronic', emoji: '⚡' },
  { name: 'K-Pop', emoji: '🇰🇷' },
  { name: 'Bollywood', emoji: '🇮🇳' },
  { name: 'Punjabi', emoji: '🎶' },
  { name: 'Tamil', emoji: '🎵' },
  { name: 'Classical', emoji: '🎻' },
  { name: 'Jazz', emoji: '🎷' },
  { name: 'Lo-Fi', emoji: '🌙' },
  { name: 'Devotional', emoji: '🙏' },
  { name: 'Latin', emoji: '💃' },
  { name: 'Afrobeats', emoji: '🥁' },
];

export function GenreBrowser() {
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [genreTracks, setGenreTracks] = useState<Record<string, Track[]>>({});
  const [genreLoading, setGenreLoading] = useState(false);

  const loadGenre = async (genre: string) => {
    if (activeGenre === genre) { setActiveGenre(null); return; }
    if (genreTracks[genre]) { setActiveGenre(genre); return; }
    setActiveGenre(genre);
    setGenreLoading(true);
    try {
      const tracks = await musicAPI.searchTracks(`${genre} music`);
      setGenreTracks(prev => ({ ...prev, [genre]: tracks.slice(0, 20) }));
    } catch { /* ignore */ }
    setGenreLoading(false);
  };

  return (
    <motion.section variants={fadeUp}>
      <h2 className="font-display text-lg md:text-xl font-semibold mb-3 flex items-center gap-2">
        <Music2 size={18} className="text-muted-foreground" />
        Browse Genres
      </h2>
      <div className="flex flex-wrap gap-2">
        {GENRES.map(genre => (
          <motion.button
            key={genre.name}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => loadGenre(genre.name)}
            className={`px-4 py-2.5 rounded-full text-sm transition-all duration-300 flex items-center gap-2 ${
              activeGenre === genre.name
                ? 'glass-card-elevated liquid-glass-card border-2 border-primary/50 text-foreground font-semibold shadow-xl shadow-primary/20'
                : 'glass-card-elevated liquid-glass-card text-secondary-foreground hover:border-white/20'
            }`}
          >
            <span>{genre.emoji}</span>
            {genre.name}
          </motion.button>
        ))}
      </div>

      {activeGenre && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-4"
        >
          <h3 className="font-display text-base font-semibold mb-3 flex items-center gap-2">
            <Flame size={16} className="text-primary" />
            {activeGenre}
          </h3>
          {genreLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 bg-secondary/40 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : genreTracks[activeGenre] ? (
            <TrackList tracks={genreTracks[activeGenre]} />
          ) : null}
        </motion.div>
      )}
    </motion.section>
  );
}
