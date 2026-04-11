import { useEffect, useState } from 'react';
import { musicAPI } from '@/api/musicAPI';
import { usePlayerStore } from '@/stores/playerStore';
import type { Track } from '@/api/types';
import { Play, ListMusic } from 'lucide-react';
import { ScrollRow, CardSkeletonRow } from './ScrollRow';

const FEATURED_QUERIES = [
  { title: 'Pop Hits', query: 'pop hits 2026' },
  { title: 'Hip Hop Hits', query: 'hip hop hits 2026' },
  { title: 'R&B Vibes', query: 'R&B songs' },
  { title: 'Electronic Dance', query: 'EDM dance music' },
  { title: 'Rock Anthems', query: 'rock anthems' },
  { title: 'Latin Heat', query: 'Latin hits reggaeton' },
  { title: 'K-Pop Hits', query: 'K-Pop latest' },
  { title: 'Chill Vibes', query: 'chill lo-fi music' },
  { title: 'Workout Music', query: 'workout gym music' },
  { title: 'Indie Folk', query: 'indie folk music' },
];

const GRADIENTS = [
  'from-rose-500/40 to-orange-500/20',
  'from-blue-500/40 to-cyan-500/20',
  'from-emerald-500/40 to-teal-500/20',
  'from-violet-500/40 to-purple-500/20',
  'from-amber-500/40 to-yellow-500/20',
  'from-pink-500/40 to-fuchsia-500/20',
  'from-indigo-500/40 to-blue-500/20',
  'from-red-500/40 to-rose-500/20',
  'from-cyan-500/40 to-sky-500/20',
  'from-green-500/40 to-lime-500/20',
];

interface FeaturedItem {
  id: string;
  title: string;
  thumbnail: string;
  trackCount: number;
  tracks: Track[];
  gradient: string;
}

export function FeaturedPlaylists() {
  const [items, setItems] = useState<FeaturedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const play = usePlayerStore(s => s.play);

  useEffect(() => {
    const selected = [...FEATURED_QUERIES].sort(() => Math.random() - 0.5).slice(0, 8);

    Promise.allSettled(selected.map(q => musicAPI.searchTracks(q.query))).then(results => {
      const featured: FeaturedItem[] = [];
      results.forEach((r, i) => {
        if (r.status === 'fulfilled' && r.value.length > 0) {
          const tracks = r.value.slice(0, 20);
          featured.push({
            id: `featured-${i}`,
            title: selected[i].title,
            thumbnail: tracks[0]?.thumbnail || '',
            trackCount: tracks.length,
            tracks,
            gradient: GRADIENTS[i % GRADIENTS.length],
          });
        }
      });
      setItems(featured);
      setLoading(false);
    });
  }, []);

  if (!loading && items.length === 0) return null;

  return (
    <ScrollRow title="The Hits" icon={<ListMusic size={18} className="text-primary" />}>
      {loading ? <CardSkeletonRow /> : items.map(item => (
        <div
          key={item.id}
          className="flex-shrink-0 w-[150px] md:w-[175px] cursor-pointer group"
          style={{ scrollSnapAlign: 'start' }}
          onClick={() => play(item.tracks[0], item.tracks, 0)}
        >
          <div className={`relative aspect-square rounded-2xl overflow-hidden glass-card-elevated liquid-glass-card bg-gradient-to-br ${item.gradient} mb-3 shadow-xl ring-1 ring-white/10 transition-all duration-300 group-hover:ring-white/20 group-hover:shadow-2xl`}>
            {item.thumbnail ? (
              <img
                src={item.thumbnail}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                loading="lazy"
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
            <div className="absolute bottom-3 left-3 right-3 z-10">
              <p className="text-sm font-bold truncate drop-shadow-2xl">{item.title}</p>
              <p className="text-[11px] text-muted-foreground/90 font-medium">{item.trackCount} tracks</p>
            </div>
            <div className="absolute top-2.5 right-2.5 w-10 h-10 rounded-full bg-primary/95 backdrop-blur-sm border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-2xl scale-90 group-hover:scale-100">
              <Play size={16} className="text-white ml-0.5" fill="currentColor" />
            </div>
          </div>
        </div>
      ))}
    </ScrollRow>
  );
}
