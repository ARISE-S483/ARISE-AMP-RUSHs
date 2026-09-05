import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { musicAPI } from '@/api/musicAPI';
import type { Artist } from '@/api/types';
import { TrackList } from '@/components/common/TrackList';
import { AlbumCard } from '@/components/common/MediaCards';
import { usePlayerStore } from '@/stores/playerStore';
import { Play, Users, Music2, ChevronLeft, Shuffle, Heart, Radio } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function ArtistPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFullBio, setShowFullBio] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const play = usePlayerStore(s => s.play);
  const startRadio = usePlayerStore(s => s.startRadio);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    const decodedId = decodeURIComponent(id);

    musicAPI.getArtist(decodedId).then(async (data) => {
      if (data && ((data.tracks && data.tracks.length > 0) || data.name)) {
        setArtist(data);
        setLoading(false);
        return;
      }

      // Smart Fallback: Search YouTube Music for the artist name
      try {
        const searchRes = await musicAPI.search(decodedId);
        const songs = searchRes.songs || [];
        const artists = searchRes.artists || [];
        const topArtist = artists.find(a => a.name.toLowerCase() === decodedId.toLowerCase()) || artists[0];

        // If matched an artist with channel ID, try direct fetch
        if (topArtist?.id && String(topArtist.id).startsWith('UC')) {
          const directData = await musicAPI.getArtist(String(topArtist.id));
          if (directData && (directData.tracks?.length || directData.name)) {
            setArtist(directData);
            setLoading(false);
            return;
          }
        }

        if (songs.length > 0) {
          const firstSong = songs[0];
          const artistName = topArtist?.name || firstSong.artist?.name || decodedId;
          const fallbackArtist: Artist = {
            id: decodedId,
            name: artistName,
            thumbnail: topArtist?.thumbnail || firstSong.thumbnail,
            thumbnailLarge: topArtist?.thumbnail || firstSong.thumbnail,
            tracks: songs.slice(0, 30),
            albums: searchRes.albums || [],
            subscriberCount: '500K+ listeners',
            description: `Listen to popular tracks, singles, and albums by ${artistName} on SimpMusic.`,
          };
          setArtist(fallbackArtist);
        } else {
          setArtist(null);
        }
      } catch {
        setArtist(null);
      }
      setLoading(false);
    }).catch(async () => {
      // Fallback on network or browse error
      try {
        const searchRes = await musicAPI.search(decodedId);
        const songs = searchRes.songs || [];
        if (songs.length > 0) {
          const firstSong = songs[0];
          setArtist({
            id: decodedId,
            name: firstSong.artist?.name || decodedId,
            thumbnail: firstSong.thumbnail,
            tracks: songs.slice(0, 30),
            albums: searchRes.albums || [],
          });
        } else {
          setArtist(null);
        }
      } catch {
        setArtist(null);
      }
      setLoading(false);
    });
  }, [id]);

  const handleShufflePlay = () => {
    if (!artist?.tracks || artist.tracks.length === 0) return;
    const shuffled = [...artist.tracks].sort(() => Math.random() - 0.5);
    play(shuffled[0], shuffled, 0);
    toast.success(`Shuffling songs by ${artist.name}`);
  };

  const handleStartRadio = () => {
    if (!artist?.tracks || artist.tracks.length === 0) return;
    startRadio(artist.tracks[0]);
    toast.success(`Starting ${artist.name} Radio`);
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-6 select-none max-w-7xl mx-auto">
        <div className="h-64 bg-white/5 rounded-3xl animate-pulse" />
        <div className="h-8 bg-white/5 rounded-xl w-56 animate-pulse" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 bg-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4 select-none">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 text-white/40">
          <Users size={32} />
        </div>
        <h2 className="text-xl font-bold text-white mb-1">Artist Not Found</h2>
        <p className="text-sm text-white/50 mb-6 max-w-sm">
          We could not load this artist discography right now. Try searching for other tracks.
        </p>
        <button
          onClick={() => navigate('/search')}
          className="px-5 py-2.5 rounded-full bg-sky-500 text-slate-950 font-semibold text-xs shadow-lg hover:bg-sky-400 transition-colors"
        >
          Search SimpMusic
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pb-36 select-none max-w-7xl mx-auto px-2 sm:px-4"
    >
      {/* Top Back Navigation Pill */}
      <div className="pt-2 pb-3">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-white/80 hover:text-white text-xs font-semibold backdrop-blur-xl border border-white/10 transition-colors"
        >
          <ChevronLeft size={16} />
          <span>Back</span>
        </button>
      </div>

      {/* Hero Header Card */}
      <div className="relative rounded-[32px] overflow-hidden bg-[#0d1424] border border-white/10 shadow-2xl p-6 sm:p-8 min-h-[260px] md:min-h-[320px] flex flex-col justify-end">
        {/* Ambient Blur Backdrop */}
        {artist.thumbnailLarge || artist.thumbnail ? (
          <div
            className="absolute inset-0 bg-cover bg-center filter blur-2xl opacity-35 scale-110 pointer-events-none"
            style={{ backgroundImage: `url(${artist.thumbnailLarge || artist.thumbnail})` }}
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-[#090f1d] via-[#090f1d]/70 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-end gap-5">
          {/* Avatar Thumbnail */}
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-24 h-24 sm:w-32 sm:h-32 rounded-[28px] overflow-hidden border-2 border-white/20 shadow-2xl bg-white/5 shrink-0"
          >
            {artist.thumbnail ? (
              <img
                src={artist.thumbnail}
                alt={artist.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/40">
                <Users size={36} />
              </div>
            )}
          </motion.div>

          {/* Artist Details */}
          <div className="flex-1 min-w-0">
            <span className="text-[10px] uppercase font-bold tracking-widest text-sky-400 bg-sky-500/15 px-2.5 py-0.5 rounded-full border border-sky-400/20">
              Verified Artist
            </span>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight mt-1.5 truncate drop-shadow-md">
              {artist.name}
            </h1>
            {artist.subscriberCount && (
              <p className="text-xs sm:text-sm text-white/65 mt-1.5 flex items-center gap-1.5 font-medium">
                <Users size={14} className="text-sky-400" />
                <span>
                  {typeof artist.subscriberCount === 'number'
                    ? artist.subscriberCount.toLocaleString()
                    : artist.subscriberCount}{' '}
                  followers
                </span>
              </p>
            )}
          </div>

          {/* Action Buttons Row */}
          <div className="flex items-center gap-2.5 pt-2 sm:pt-0 shrink-0">
            {artist.tracks && artist.tracks.length > 0 && (
              <>
                <button
                  onClick={() => play(artist.tracks![0], artist.tracks!, 0)}
                  className="w-12 h-12 rounded-full bg-white text-slate-950 flex items-center justify-center shadow-[0_8px_25px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95 transition-all"
                  title="Play All"
                >
                  <Play size={22} fill="currentColor" className="ml-0.5" />
                </button>

                <button
                  onClick={handleShufflePlay}
                  className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/15 text-white flex items-center justify-center border border-white/15 active:scale-95 transition-all"
                  title="Shuffle Play"
                >
                  <Shuffle size={18} />
                </button>

                <button
                  onClick={handleStartRadio}
                  className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/15 text-sky-400 flex items-center justify-center border border-white/15 active:scale-95 transition-all"
                  title="Artist Radio"
                >
                  <Radio size={18} />
                </button>
              </>
            )}

            <button
              onClick={() => {
                setIsFollowing(!isFollowing);
                toast.success(isFollowing ? `Unfollowed ${artist.name}` : `Following ${artist.name}`);
              }}
              className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all active:scale-95 ${
                isFollowing
                  ? 'bg-white/20 text-white border-white/30'
                  : 'bg-white/5 hover:bg-white/10 text-white/80 border-white/15'
              }`}
            >
              <Heart size={14} className={`inline mr-1.5 ${isFollowing ? 'fill-pink-500 text-pink-500' : ''}`} />
              <span>{isFollowing ? 'Following' : 'Follow'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bio Section */}
      {artist.description && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 rounded-2xl bg-white/[0.04] border border-white/10 p-4 sm:p-5"
        >
          <h3 className="text-xs uppercase font-bold tracking-wider text-white/50 mb-2 flex items-center gap-1.5">
            <Music2 size={14} className="text-sky-400" />
            <span>About</span>
          </h3>
          <p className={`text-xs sm:text-sm text-white/80 leading-relaxed ${showFullBio ? '' : 'line-clamp-3'}`}>
            {artist.description}
          </p>
          {artist.description.length > 180 && (
            <button
              onClick={() => setShowFullBio(!showFullBio)}
              className="text-xs text-sky-400 mt-2 font-semibold hover:underline"
            >
              {showFullBio ? 'Show less' : 'Read more'}
            </button>
          )}
        </motion.div>
      )}

      {/* Popular Tracks Section */}
      {artist.tracks && artist.tracks.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">Popular Tracks</h2>
            <span className="text-xs text-white/50">{artist.tracks.length} songs</span>
          </div>
          <TrackList tracks={artist.tracks} />
        </div>
      )}

      {/* Albums Section */}
      {artist.albums && artist.albums.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight mb-4">Albums & Releases</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {artist.albums.map(album => (
              <AlbumCard key={String(album.id)} album={album} />
            ))}
          </div>
        </div>
      )}

      {/* Singles & EPs Section */}
      {artist.eps && artist.eps.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight mb-4">Singles & EPs</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {artist.eps.map(album => (
              <AlbumCard key={String(album.id)} album={album} />
            ))}
          </div>
        </div>
      )}

      {/* Related Artists Section */}
      {artist.relatedArtists && artist.relatedArtists.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight mb-4">Fans Also Like</h2>
          <div className="flex gap-4 overflow-x-auto scrollbar-thin pb-3">
            {artist.relatedArtists.map(related => (
              <Link
                key={String(related.id)}
                to={`/artist/${encodeURIComponent(related.id)}`}
                className="flex flex-col items-center gap-2 flex-shrink-0 group w-24 sm:w-28 text-center"
              >
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-white/5 border border-white/15 group-hover:border-sky-400 group-hover:scale-105 transition-all shadow-md">
                  {related.thumbnail ? (
                    <img
                      src={related.thumbnail}
                      alt={related.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/40">
                      <Music2 size={24} />
                    </div>
                  )}
                </div>
                <span className="text-xs font-semibold text-white/80 group-hover:text-white truncate w-full">
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
