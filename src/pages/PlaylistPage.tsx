import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { musicAPI } from '@/api/musicAPI';
import { useLibraryStore } from '@/stores/libraryStore';
import { usePlayerStore } from '@/stores/playerStore';
import type { Playlist, Track } from '@/api/types';
import { TrackList } from '@/components/common/TrackList';
import { Play, Shuffle, ListMusic, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PlaylistPage() {
  const { id, localId } = useParams<{ id?: string; localId?: string }>();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const play = usePlayerStore(s => s.play);
  const { playlists, deletePlaylist } = useLibraryStore();

  useEffect(() => {
    if (localId) {
      const local = playlists.find(p => String(p.id) === localId);
      if (local) {
        setPlaylist(local);
        setTracks(local.tracks || []);
      }
      setLoading(false);
      return;
    }

    if (!id) return;
    setLoading(true);

    // Try as album first, then playlist
    const numericId = Number(id);
    if (!isNaN(numericId)) {
      musicAPI.getAlbum(numericId).then(data => {
        if (data) {
          setPlaylist({
            id: data.album.id,
            title: data.album.title,
            thumbnail: data.album.thumbnail || '',
            trackCount: data.tracks.length,
            tracks: data.tracks,
            creator: data.album.artist.name,
          });
          setTracks(data.tracks);
        }
        setLoading(false);
      }).catch(() => {
        // Try as playlist
        musicAPI.getPlaylist(id).then(data => {
          if (data) {
            setPlaylist(data.playlist);
            setTracks(data.tracks);
          }
          setLoading(false);
        }).catch(() => setLoading(false));
      });
    } else {
      musicAPI.getPlaylist(id).then(data => {
        if (data) {
          setPlaylist(data.playlist);
          setTracks(data.tracks);
        }
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [id, localId, playlists]);

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="w-40 h-40 md:w-48 md:h-48 bg-secondary rounded-xl shimmer mx-auto md:mx-0" />
          <div className="space-y-3 flex-1">
            <div className="h-6 bg-secondary rounded w-48 shimmer" />
            <div className="h-4 bg-secondary rounded w-32 shimmer" />
          </div>
        </div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Not found</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row gap-5 mb-6">
        <div className="w-40 h-40 md:w-48 md:h-48 rounded-xl overflow-hidden bg-secondary flex-shrink-0 flex items-center justify-center mx-auto md:mx-0 shadow-2xl">
          {playlist.thumbnail ? (
            <img src={playlist.thumbnail} alt={playlist.title} className="w-full h-full object-cover" />
          ) : (
            <ListMusic size={48} className="text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-col justify-end text-center md:text-left">
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] mb-1">
            {playlist.isLocal ? 'Playlist' : 'Album'}
          </p>
          <h1 className="font-display text-2xl md:text-3xl font-bold mb-2">{playlist.title}</h1>
          {playlist.creator && <p className="text-sm text-muted-foreground">{playlist.creator}</p>}
          <p className="text-sm text-muted-foreground">{tracks.length} songs</p>

          <div className="flex items-center gap-3 mt-4 justify-center md:justify-start">
            {tracks.length > 0 && (
              <>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => play(tracks[0], tracks, 0)}
                  className="w-10 h-10 rounded-full bg-foreground flex items-center justify-center shadow-lg"
                >
                  <Play size={18} className="text-background ml-0.5" fill="currentColor" />
                </motion.button>
                <button
                  onClick={() => {
                    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
                    play(shuffled[0], shuffled, 0);
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Shuffle size={20} />
                </button>
              </>
            )}
            {playlist.isLocal && (
              <button
                onClick={() => deletePlaylist(String(playlist.id))}
                className="text-muted-foreground hover:text-destructive transition-colors ml-auto"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      {tracks.length > 0 ? (
        <TrackList tracks={tracks} showAlbum />
      ) : (
        <div className="text-center py-16">
          <ListMusic size={40} className="text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No tracks found</p>
        </div>
      )}
    </motion.div>
  );
}
