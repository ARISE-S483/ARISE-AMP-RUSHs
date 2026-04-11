import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { musicAPI } from '@/api/musicAPI';
import type { Artist } from '@/api/types';
import { TrackList } from '@/components/common/TrackList';
import { AlbumCard } from '@/components/common/MediaCards';
import { usePlayerStore } from '@/stores/playerStore';
import { Play, Users, Music2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ArtistPage() {
  const { id } = useParams<{ id: string }>();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFullBio, setShowFullBio] = useState(false);
  const play = usePlayerStore(s => s.play);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    musicAPI.getArtist(id).then(data => {
      setArtist(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-48 bg-secondary rounded-2xl shimmer" />
        <div className="h-6 bg-secondary rounded w-48 shimmer" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-secondary rounded-lg shimmer" />
          ))}
        </div>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Artist not found</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-6">
      {/* Hero */}
      <div className="relative h-56 md:h-64 bg-gradient-to-b from-secondary to-background overflow-hidden">
        {artist.thumbnailLarge && (
          <img src={artist.thumbnailLarge} alt={artist.name} className="w-full h-full object-cover opacity-25" />
        )}
        <div className="absolute inset-0 cover-gradient" />
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 flex items-end gap-4">
          <motion.img
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            src={artist.thumbnail || ''}
            alt={artist.name}
            className="w-20 h-20 md:w-28 md:h-28 rounded-full object-cover border-2 border-border shadow-2xl bg-secondary"
          />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] mb-1">Artist</p>
            <h1 className="font-display text-2xl md:text-4xl font-bold truncate">{artist.name}</h1>
            {artist.subscriberCount && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Users size={12} />
                {typeof artist.subscriberCount === 'number' ? artist.subscriberCount.toLocaleString() : artist.subscriberCount} followers
              </p>
            )}
          </div>
          {artist.tracks && artist.tracks.length > 0 && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => play(artist.tracks![0], artist.tracks!, 0)}
              className="w-12 h-12 rounded-full bg-foreground flex items-center justify-center shadow-2xl flex-shrink-0"
            >
              <Play size={20} className="text-background ml-0.5" fill="currentColor" />
            </motion.button>
          )}
        </div>
      </div>

      {/* Bio Section */}
      {artist.description && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="px-4 md:px-6 mt-5"
        >
          <div className="glass-card rounded-xl p-4">
            <h2 className="font-display text-sm font-semibold mb-2 flex items-center gap-2 text-muted-foreground">
              <Music2 size={14} />
              About
            </h2>
            <p className={`text-sm text-foreground/80 leading-relaxed ${showFullBio ? '' : 'line-clamp-3'}`}>
              {artist.description}
            </p>
            {artist.description.length > 200 && (
              <button
                onClick={() => setShowFullBio(!showFullBio)}
                className="text-xs text-primary mt-2 hover:underline"
              >
                {showFullBio ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Popular Tracks */}
      {artist.tracks && artist.tracks.length > 0 && (
        <div className="px-4 md:px-6 mt-6">
          <h2 className="font-display text-lg font-semibold mb-3">Popular</h2>
          <TrackList tracks={artist.tracks} />
        </div>
      )}

      {/* Albums */}
      {artist.albums && artist.albums.length > 0 && (
        <div className="px-4 md:px-6 mt-6">
          <h2 className="font-display text-lg font-semibold mb-3">Albums</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {artist.albums.map(album => (
              <AlbumCard key={String(album.id)} album={album} />
            ))}
          </div>
        </div>
      )}

      {/* Singles & EPs */}
      {artist.eps && artist.eps.length > 0 && (
        <div className="px-4 md:px-6 mt-6">
          <h2 className="font-display text-lg font-semibold mb-3">Singles & EPs</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {artist.eps.map(album => (
              <AlbumCard key={String(album.id)} album={album} />
            ))}
          </div>
        </div>
      )}

      {/* Related Artists */}
      {artist.relatedArtists && artist.relatedArtists.length > 0 && (
        <div className="px-4 md:px-6 mt-6">
          <h2 className="font-display text-lg font-semibold mb-3">Fans Also Like</h2>
          <div className="flex gap-4 overflow-x-auto scrollbar-thin pb-2">
            {artist.relatedArtists.map(related => (
              <Link
                key={String(related.id)}
                to={`/artist/${related.id}`}
                className="flex flex-col items-center gap-2 flex-shrink-0 group"
              >
                {related.thumbnail ? (
                  <img
                    src={related.thumbnail}
                    alt={related.name}
                    className="w-20 h-20 rounded-full object-cover bg-secondary group-hover:ring-2 ring-primary/50 transition-all"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center group-hover:ring-2 ring-primary/50 transition-all">
                    <Music2 size={24} className="text-muted-foreground" />
                  </div>
                )}
                <span className="text-xs text-muted-foreground group-hover:text-foreground truncate max-w-[80px] text-center">
                  {related.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
