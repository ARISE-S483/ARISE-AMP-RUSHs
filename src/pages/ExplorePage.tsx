import { useEffect, useState } from 'react';
import { musicAPI } from '@/api/musicAPI';
import type { Track, Album, Artist } from '@/api/types';
import { TrackCard, AlbumCard, ArtistCard } from '@/components/common/MediaCards';
import { TrackList } from '@/components/common/TrackList';
import { TrendingUp, Flame, Sparkles, Clock, Music2 } from 'lucide-react';
import { motion } from 'framer-motion';

const GENRES = [
  'Bollywood', 'Punjabi', 'Tamil', 'Telugu', 'Hindi Lofi', 'Devotional', 'Ghazal',
  'Pop', 'Hip Hop', 'R&B', 'Rock', 'Electronic', 'K-Pop', 'Classical', 'Jazz',
  'Afrobeats', 'Latin', 'Country', 'Metal', 'Indie', 'Lo-Fi',
];

const TRENDING_QUERIES = [
  { label: '🔥 Hot Right Now', query: 'top hits 2025' },
  { label: '🆕 New Releases', query: 'new music 2025' },
  { label: '🎵 Bollywood Hits', query: 'bollywood hits 2025' },
  { label: '🎤 Punjabi Top', query: 'punjabi hits 2025' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function ExplorePage() {
  const [trendingSections, setTrendingSections] = useState<Record<string, Track[]>>({});
  const [genreTracks, setGenreTracks] = useState<Record<string, Track[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [genreLoading, setGenreLoading] = useState(false);

  useEffect(() => {
    const loadTrending = async () => {
      try {
        const results = await Promise.allSettled(
          TRENDING_QUERIES.map(({ query }) => musicAPI.searchTracks(query))
        );
        const sections: Record<string, Track[]> = {};
        results.forEach((r, i) => {
          if (r.status === 'fulfilled') {
            sections[TRENDING_QUERIES[i].label] = r.value.slice(0, 12);
          }
        });
        setTrendingSections(sections);
      } catch { /* ignore */ }
      setLoading(false);
    };
    loadTrending();
  }, []);

  const loadGenre = async (genre: string) => {
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
    <motion.div
      className="p-4 md:p-6 space-y-8"
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.08 } } }}
    >
      <motion.div variants={fadeUp} className="flex items-center gap-3">
        <Sparkles size={24} className="text-primary" />
        <div>
          <h1 className="font-display text-2xl font-bold">Explore</h1>
          <p className="text-xs text-muted-foreground">Discover new music, trending tracks, and curated genres</p>
        </div>
      </motion.div>

      {/* Genre Chips */}
      <motion.div variants={fadeUp} className="flex flex-wrap gap-2">
        {GENRES.map(genre => (
          <motion.button
            key={genre}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => loadGenre(genre)}
            className={`px-4 py-2 rounded-full text-sm transition-all duration-200 ${
              activeGenre === genre
                ? 'bg-primary text-primary-foreground font-medium shadow-lg'
                : 'bg-secondary/60 text-secondary-foreground hover:bg-accent glass-subtle'
            }`}
          >
            {genre}
          </motion.button>
        ))}
      </motion.div>

      {/* Active Genre Results */}
      {activeGenre && (
        <motion.section variants={fadeUp}>
          <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
            <Flame size={18} className="text-primary" />
            {activeGenre}
          </h2>
          {genreLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 bg-secondary rounded-lg shimmer" />
              ))}
            </div>
          ) : genreTracks[activeGenre] ? (
            <TrackList tracks={genreTracks[activeGenre]} />
          ) : null}
        </motion.section>
      )}

      {/* Trending Sections */}
      {loading ? (
        <div className="space-y-8">
          {Array.from({ length: 2 }).map((_, s) => (
            <div key={s}>
              <div className="h-6 bg-secondary rounded w-40 shimmer mb-4" />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="p-3 space-y-3">
                    <div className="aspect-square bg-secondary rounded-xl shimmer" />
                    <div className="h-3 bg-secondary rounded shimmer w-3/4" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        Object.entries(trendingSections).map(([label, tracks]) => (
          <motion.section key={label} variants={fadeUp}>
            <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-primary" />
              {label}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {tracks.map((track, i) => (
                <TrackCard key={String(track.id)} track={track} tracks={tracks} index={i} />
              ))}
            </div>
          </motion.section>
        ))
      )}
    </motion.div>
  );
}
