import { useLibraryStore } from '@/stores/libraryStore';
import { usePlayerStore } from '@/stores/playerStore';
import { TrackList } from '@/components/common/TrackList';
import { Heart, Clock, ListMusic, Play, Music2, Plus, Link } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { musicAPI } from '@/api/musicAPI';
import { toast } from 'sonner';
import { importPlaylist, detectSource, type ImportProgress } from '@/lib/playlistImport';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function LibraryPage() {
  const { section } = useParams();
  const navigate = useNavigate();
  const { favorites, recentlyPlayed, playlists } = useLibraryStore();
  const play = usePlayerStore(s => s.play);

  if (section === 'favorites') {
    return (
      <motion.div initial="hidden" animate="show" variants={fadeUp} className="p-4 md:p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl glass-card flex items-center justify-center">
            <Heart size={24} className="text-foreground" />
          </div>
          <div>
            <h1 className="font-display text-xl md:text-2xl font-bold">Favorites</h1>
            <p className="text-sm text-muted-foreground">{favorites.length} songs</p>
          </div>
          {favorites.length > 0 && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => play(favorites[0], favorites, 0)}
              className="ml-auto w-10 h-10 rounded-full bg-foreground flex items-center justify-center shadow-lg"
            >
              <Play size={18} className="text-background ml-0.5" fill="currentColor" />
            </motion.button>
          )}
        </div>
        {favorites.length > 0 ? (
          <TrackList tracks={favorites} />
        ) : (
          <EmptyState icon={Heart} message="No favorites yet. Start liking songs to see them here." />
        )}
      </motion.div>
    );
  }

  if (section === 'recent') {
    return (
      <motion.div initial="hidden" animate="show" variants={fadeUp} className="p-4 md:p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl glass-card flex items-center justify-center">
            <Clock size={24} className="text-foreground" />
          </div>
          <div>
            <h1 className="font-display text-xl md:text-2xl font-bold">Recently Played</h1>
            <p className="text-sm text-muted-foreground">{recentlyPlayed.length} songs</p>
          </div>
        </div>
        {recentlyPlayed.length > 0 ? (
          <TrackList tracks={recentlyPlayed} />
        ) : (
          <EmptyState icon={Clock} message="Nothing played yet. Start listening to build your history." />
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.06 } } }}
      className="p-4 md:p-6 space-y-6 pb-32"
    >
      <div className="flex items-center justify-between">
        <motion.h1 variants={fadeUp} className="font-display text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-100 to-white pl-1">Library</motion.h1>
      </div>

      <motion.div variants={fadeUp} className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-2 gap-3 md:gap-4 px-2">
        <LibraryCard icon={Heart} label="Favorites" count={favorites.length} onClick={() => navigate('/library/favorites')} />
        <LibraryCard icon={Clock} label="Recent" count={recentlyPlayed.length} onClick={() => navigate('/library/recent')} />
        <LibraryCard icon={ListMusic} label="Playlists" count={playlists.length} onClick={() => {}} />
      </motion.div>

      <motion.section variants={fadeUp}>
        <div className="flex items-center justify-between mb-3 pl-1">
          <h2 className="font-display text-lg font-semibold tracking-wide">Your Playlists</h2>
          <div className="flex items-center gap-2">
            <PlaylistCreateButton />
            <PlaylistImportButton />
          </div>
        </div>
        {playlists.length > 0 ? (
          <div className="space-y-1">
            {playlists.map(pl => (
              <motion.div
                key={pl.id}
                whileHover={{ x: 4 }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg glass-card-elevated liquid-glass-card hover:bg-accent/50 cursor-pointer transition-colors"
                onClick={() => navigate(`/playlist/local/${pl.id}`)}
              >
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                  {pl.thumbnail ? (
                    <img src={pl.thumbnail} alt={pl.title} className="w-full h-full rounded-lg object-cover" />
                  ) : (
                    <ListMusic size={18} className="text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium tracking-wide truncate">{pl.title}</p>
                  <p className="text-xs text-muted-foreground/70">{pl.trackCount} songs</p>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <EmptyState icon={Music2} message="No playlists yet. Create one or import by URL." />
        )}
      </motion.section>

      {recentlyPlayed.length > 0 && (
        <motion.section variants={fadeUp}>
          <h2 className="font-display text-lg font-semibold mb-3 tracking-wide pl-1">Recently Played</h2>
          <TrackList tracks={recentlyPlayed.slice(0, 5)} showIndex={false} />
        </motion.section>
      )}
    </motion.div>
  );
}

function LibraryCard({ icon: Icon, label, count, onClick }: {
  icon: React.ComponentType<Record<string, unknown>>;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="flex flex-col md:flex-row md:items-center justify-center md:justify-start items-center gap-2 md:gap-3 p-3 md:p-4 glass-card shadow-lg ring-1 ring-white/5 rounded-2xl md:text-left transition-all hover:bg-white/10"
    >
      <div className="w-12 h-12 md:w-auto md:h-auto rounded-full bg-white/5 flex items-center justify-center md:bg-transparent">
        <Icon size={22} className="text-white md:text-foreground flex-shrink-0" />
      </div>
      <div className="text-center md:text-left">
        <p className="text-[13px] md:text-sm font-medium tracking-wide">{label}</p>
        <p className="text-[10px] md:text-xs text-muted-foreground/70">{count} {count === 1 ? 'song' : 'songs'}</p>
      </div>
    </motion.button>
  );
}

function PlaylistCreateButton() {
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const { createPlaylist } = useLibraryStore();

  const handleCreate = () => {
    if (name.trim()) {
      createPlaylist(name.trim());
      setName('');
      setIsCreating(false);
      toast.success('Playlist created');
    }
  };

  if (isCreating) {
    return (
      <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} className="flex items-center gap-1.5">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setIsCreating(false); }}
          placeholder="Playlist name..."
          className="px-2.5 py-1.5 text-sm bg-input rounded-lg border border-border outline-none focus:ring-1 focus:ring-ring w-36"
          autoFocus
        />
        <button onClick={handleCreate} className="text-xs text-primary font-medium px-2 py-1.5 rounded-md hover:bg-accent/50">Add</button>
      </motion.div>
    );
  }

  return (
    <button
      onClick={() => setIsCreating(true)}
      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-lg hover:bg-accent/50 transition-colors"
    >
      <Plus size={14} />
      <span>New</span>
    </button>
  );
}

function PlaylistImportButton() {
  const [isImporting, setIsImporting] = useState(false);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const { createPlaylist, addToPlaylist } = useLibraryStore();

  const detectedSource = url.trim() ? detectSource(url) : null;

  const handleImport = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setProgress(null);

    try {
      const result = await importPlaylist(url.trim(), (p) => setProgress(p));

      if (result.tracks.length === 0) {
        if (progress?.error) {
          toast.error(progress.error);
        } else {
          toast.error('No tracks found or matched');
        }
        return;
      }

      const pl = createPlaylist(result.name);
      result.tracks.forEach(t => addToPlaylist(String(pl.id), t));
      toast.success(`Imported "${pl.title}" with ${result.tracks.length} tracks`);
      setUrl('');
      setIsImporting(false);
      setProgress(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to import playlist');
    } finally {
      setLoading(false);
    }
  };

  if (isImporting) {
    return (
      <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleImport(); if (e.key === 'Escape') { setIsImporting(false); setProgress(null); } }}
            placeholder="YouTube, TIDAL, or Spotify URL..."
            className="px-2.5 py-1.5 text-sm bg-input rounded-lg border border-border outline-none focus:ring-1 focus:ring-ring w-56"
            autoFocus
            disabled={loading}
          />
          {detectedSource && detectedSource !== 'unknown' && (
            <Badge variant="secondary" className="text-[10px] capitalize">{detectedSource}</Badge>
          )}
          <button onClick={handleImport} disabled={loading} className="text-xs text-primary font-medium px-2 py-1.5 rounded-md hover:bg-accent/50 disabled:opacity-50">
            {loading ? '...' : 'Import'}
          </button>
        </div>
        {progress && progress.status === 'matching' && (
          <div className="flex items-center gap-2">
            <Progress value={(progress.current / progress.total) * 100} className="h-1.5 flex-1" />
            <span className="text-[10px] text-muted-foreground">{progress.matched}/{progress.total}</span>
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <button
      onClick={() => setIsImporting(true)}
      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-lg hover:bg-accent/50 transition-colors"
    >
      <Link size={14} />
      <span>Import</span>
    </button>
  );
}

function EmptyState({ icon: Icon, message }: {
  icon: React.ComponentType<Record<string, unknown>>;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon size={40} className="text-muted-foreground/30 mb-3" />
      <p className="text-muted-foreground text-sm max-w-xs">{message}</p>
    </div>
  );
}
