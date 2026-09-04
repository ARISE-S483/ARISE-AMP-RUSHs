import { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, Clock, ListMusic, Play, Music2, Plus, Link,
  FolderOpen, Upload, Trash2, Edit2, RefreshCw, Disc3,
  HardDrive, Check, X
} from 'lucide-react';
import { useLibraryStore } from '@/stores/libraryStore';
import { usePlayerStore } from '@/stores/playerStore';
import { useAccountStore } from '@/stores/accountStore';
import { musicAPI } from '@/api/musicAPI';
import { TrackList } from '@/components/common/TrackList';
import { parseLocalAudioFiles } from '@/lib/localFiles';
import { importPlaylist, detectSource, type ImportProgress } from '@/lib/playlistImport';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function LibraryPage() {
  const { section } = useParams();
  const navigate = useNavigate();
  const {
    favorites, recentlyPlayed, playlists, localTracks,
    deletePlaylist, renamePlaylist, addLocalTracks,
    removeLocalTrack, clearLocalTracks, addToFavorites
  } = useLibraryStore();
  const play = usePlayerStore(s => s.play);
  const account = useAccountStore(s => s.account);
  const [isSyncing, setIsSyncing] = useState(false);

  // Sync with YouTube Music
  const handleSyncYTM = async () => {
    if (!account?.signedIn) {
      toast.info('Please sign in with your YouTube Music account in the title bar first.');
      return;
    }
    setIsSyncing(true);
    try {
      const [liked, libraryData] = await Promise.all([
        musicAPI.getLikedSongs(),
        musicAPI.getLibrary(),
      ]);

      let addedCount = 0;
      if (liked && liked.length > 0) {
        liked.forEach(track => {
          if (!favorites.some(f => String(f.id) === String(track.id))) {
            addToFavorites(track);
            addedCount++;
          }
        });
      }

      toast.success(`Synced ${addedCount} new liked songs from YouTube Music!`);
    } catch (e) {
      toast.error('Failed to sync library from YouTube Music');
    } finally {
      setIsSyncing(false);
    }
  };

  // ─── Favorites Section ───
  if (section === 'favorites') {
    return (
      <motion.div initial="hidden" animate="show" variants={fadeUp} className="p-4 md:p-6 pb-32">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl glass-card flex items-center justify-center text-pink-500 shadow-md">
            <Heart size={24} fill="currentColor" />
          </div>
          <div>
            <h1 className="font-display text-xl md:text-2xl font-bold">Favorites & Liked Music</h1>
            <p className="text-sm text-muted-foreground">{favorites.length} songs</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {account?.signedIn && (
              <button
                onClick={handleSyncYTM}
                disabled={isSyncing}
                className="flex items-center gap-1.5 h-9 px-3 rounded-full glass-subtle text-xs font-medium text-muted-foreground hover:text-foreground border border-border/30 transition-colors"
                title="Sync Liked Songs from YouTube Music"
              >
                <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync with YouTube'}</span>
              </button>
            )}
            {favorites.length > 0 && (
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => play(favorites[0], favorites, 0)}
                className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center shadow-lg"
                title="Play All"
              >
                <Play size={18} fill="currentColor" className="ml-0.5" />
              </motion.button>
            )}
          </div>
        </div>
        {favorites.length > 0 ? (
          <TrackList tracks={favorites} />
        ) : (
          <EmptyState icon={Heart} message="No favorites yet. Like songs or sync with your YouTube Music account." />
        )}
      </motion.div>
    );
  }

  // ─── Recent Section ───
  if (section === 'recent') {
    return (
      <motion.div initial="hidden" animate="show" variants={fadeUp} className="p-4 md:p-6 pb-32">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl glass-card flex items-center justify-center text-primary shadow-md">
            <Clock size={24} />
          </div>
          <div>
            <h1 className="font-display text-xl md:text-2xl font-bold">Recently Played</h1>
            <p className="text-sm text-muted-foreground">{recentlyPlayed.length} songs</p>
          </div>
          {recentlyPlayed.length > 0 && (
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => play(recentlyPlayed[0], recentlyPlayed, 0)}
              className="ml-auto w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center shadow-lg"
              title="Play All"
            >
              <Play size={18} fill="currentColor" className="ml-0.5" />
            </motion.button>
          )}
        </div>
        {recentlyPlayed.length > 0 ? (
          <TrackList tracks={recentlyPlayed} />
        ) : (
          <EmptyState icon={Clock} message="Nothing played yet. Start listening to build your history." />
        )}
      </motion.div>
    );
  }

  // ─── Local Music Section ───
  if (section === 'local') {
    return (
      <LocalMusicPage
        localTracks={localTracks}
        onAddTracks={addLocalTracks}
        onRemoveTrack={removeLocalTrack}
        onClearTracks={clearLocalTracks}
        onPlay={(track, queue, index) => play(track, queue, index)}
      />
    );
  }

  // ─── Main Library Hub ───
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.06 } } }}
      className="p-4 md:p-6 space-y-6 pb-32"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <motion.h1 variants={fadeUp} className="font-display text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-100 to-white pl-1">
          Library
        </motion.h1>

        {account?.signedIn && (
          <button
            onClick={handleSyncYTM}
            disabled={isSyncing}
            className="flex items-center gap-1.5 h-8 px-3 rounded-full glass-subtle text-xs font-medium text-foreground hover:bg-accent/40 border border-border/30 transition-colors"
          >
            <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isSyncing ? 'Syncing...' : 'Sync YouTube Music'}</span>
          </button>
        )}
      </div>

      {/* Grid of Library Cards */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 px-1">
        <LibraryCard icon={Heart} label="Favorites" count={favorites.length} onClick={() => navigate('/library/favorites')} />
        <LibraryCard icon={Clock} label="Recent" count={recentlyPlayed.length} onClick={() => navigate('/library/recent')} />
        <LibraryCard icon={HardDrive} label="Local Music" count={localTracks.length} onClick={() => navigate('/library/local')} />
        <LibraryCard icon={ListMusic} label="Playlists" count={playlists.length} onClick={() => {
          const el = document.getElementById('playlists-section');
          el?.scrollIntoView({ behavior: 'smooth' });
        }} />
      </motion.div>

      {/* Playlists Section */}
      <motion.section id="playlists-section" variants={fadeUp}>
        <div className="flex items-center justify-between mb-3 pl-1">
          <h2 className="font-display text-lg font-semibold tracking-wide">Your Playlists</h2>
          <div className="flex items-center gap-2">
            <PlaylistCreateButton />
            <PlaylistImportButton />
          </div>
        </div>

        {playlists.length > 0 ? (
          <div className="space-y-1.5">
            {playlists.map(pl => (
              <PlaylistItem
                key={pl.id}
                playlist={pl}
                onClick={() => navigate(`/playlist/local/${pl.id}`)}
                onDelete={(id) => {
                  deletePlaylist(id);
                  if (account?.signedIn && !id.startsWith('local_')) {
                    musicAPI.deletePlaylist(id).catch(() => {});
                  }
                  toast.success('Playlist removed');
                }}
                onRename={(id, title) => {
                  renamePlaylist(id, title);
                  toast.success('Playlist renamed');
                }}
              />
            ))}
          </div>
        ) : (
          <EmptyState icon={Music2} message="No playlists yet. Create one or import from YouTube/Spotify." />
        )}
      </motion.section>

      {/* Local Music Preview Section */}
      <motion.section variants={fadeUp}>
        <div className="flex items-center justify-between mb-3 pl-1">
          <div className="flex items-center gap-2">
            <HardDrive size={18} className="text-primary" />
            <h2 className="font-display text-lg font-semibold tracking-wide">Local Music</h2>
            <span className="text-xs text-muted-foreground">({localTracks.length})</span>
          </div>
          <button
            onClick={() => navigate('/library/local')}
            className="text-xs text-primary font-medium hover:underline"
          >
            {localTracks.length > 0 ? 'Manage & Add' : 'Import Files'}
          </button>
        </div>

        {localTracks.length > 0 ? (
          <div className="space-y-2">
            <TrackList tracks={localTracks.slice(0, 5)} showIndex={false} />
            {localTracks.length > 5 && (
              <button
                onClick={() => navigate('/library/local')}
                className="w-full py-2 rounded-xl glass-subtle text-xs text-muted-foreground hover:text-foreground text-center"
              >
                View all {localTracks.length} local tracks
              </button>
            )}
          </div>
        ) : (
          <div
            onClick={() => navigate('/library/local')}
            className="p-6 rounded-2xl glass-card border border-dashed border-border/80 text-center cursor-pointer hover:bg-accent/30 transition-colors"
          >
            <FolderOpen size={32} className="mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm font-medium text-foreground">No local tracks imported</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Play your own local audio files or folders directly in the app with all ID3 metadata and album art intact.
            </p>
          </div>
        )}
      </motion.section>

      {/* Recently Played Section */}
      {recentlyPlayed.length > 0 && (
        <motion.section variants={fadeUp}>
          <div className="flex items-center justify-between mb-3 pl-1">
            <h2 className="font-display text-lg font-semibold tracking-wide">Recently Played</h2>
            <button
              onClick={() => navigate('/library/recent')}
              className="text-xs text-primary font-medium hover:underline"
            >
              View All
            </button>
          </div>
          <TrackList tracks={recentlyPlayed.slice(0, 5)} showIndex={false} />
        </motion.section>
      )}
    </motion.div>
  );
}

// ─── Local Music Page Component ───
function LocalMusicPage({
  localTracks,
  onAddTracks,
  onRemoveTrack,
  onClearTracks,
  onPlay,
}: {
  localTracks: any[];
  onAddTracks: (tracks: any[]) => void;
  onRemoveTrack: (id: string) => void;
  onClearTracks: () => void;
  onPlay: (track: any, queue: any[], index: number) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [isParsing, setIsParsing] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsParsing(true);
    const toastId = toast.loading(`Parsing metadata for ${files.length} audio file(s)...`);
    try {
      const parsed = await parseLocalAudioFiles(files);
      if (parsed.length === 0) {
        toast.dismiss(toastId);
        toast.error('No supported audio files found.');
        return;
      }
      onAddTracks(parsed);
      toast.dismiss(toastId);
      toast.success(`Imported ${parsed.length} song(s) with full ID3 metadata!`);
    } catch (err) {
      toast.dismiss(toastId);
      toast.error('Failed to parse local audio files');
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <motion.div initial="hidden" animate="show" variants={fadeUp} className="p-4 md:p-6 pb-32 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl glass-card flex items-center justify-center text-primary shadow-md">
            <HardDrive size={24} />
          </div>
          <div>
            <h1 className="font-display text-xl md:text-2xl font-bold">Local Music</h1>
            <p className="text-sm text-muted-foreground">{localTracks.length} local songs</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isParsing}
            className="flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 shadow-md transition-all"
          >
            <Upload size={14} />
            <span>Add Files</span>
          </button>

          <button
            onClick={() => folderInputRef.current?.click()}
            disabled={isParsing}
            className="flex items-center gap-1.5 h-9 px-3.5 rounded-full glass-subtle text-foreground text-xs font-semibold hover:bg-accent/50 border border-border/40 transition-all"
          >
            <FolderOpen size={14} />
            <span>Add Folder</span>
          </button>

          {localTracks.length > 0 && (
            <>
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onPlay(localTracks[0], localTracks, 0)}
                className="w-9 h-9 rounded-full bg-foreground text-background flex items-center justify-center shadow-lg"
                title="Play All Local Songs"
              >
                <Play size={16} fill="currentColor" className="ml-0.5" />
              </motion.button>
              <button
                onClick={onClearTracks}
                className="w-9 h-9 rounded-full glass-subtle text-destructive hover:bg-destructive/10 flex items-center justify-center"
                title="Clear All Local Tracks"
              >
                <Trash2 size={15} />
              </button>
            </>
          )}

          {/* Hidden inputs */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="audio/*,.mp3,.flac,.m4a,.aac,.ogg,.wav,.opus,.weba,.wma"
            onChange={e => { handleFiles(e.target.files); e.target.value = ''; }}
            className="hidden"
          />
          <input
            ref={folderInputRef}
            type="file"
            multiple
            {...({ webkitdirectory: '', directory: '' } as any)}
            onChange={e => { handleFiles(e.target.files); e.target.value = ''; }}
            className="hidden"
          />
        </div>
      </div>

      {/* Tracks display */}
      {localTracks.length > 0 ? (
        <TrackList tracks={localTracks} />
      ) : (
        <div className="py-16 text-center space-y-4">
          <div className="w-16 h-16 rounded-full glass-card mx-auto flex items-center justify-center text-muted-foreground/50">
            <HardDrive size={32} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">Play Your Local Music</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
              Select files or import an entire music folder from your hard drive. Title, artist, album, duration, and embedded cover art are extracted with full fidelity.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 shadow-lg"
            >
              Choose Audio Files
            </button>
            <button
              onClick={() => folderInputRef.current?.click()}
              className="px-4 py-2 rounded-xl glass-subtle text-foreground text-xs font-semibold hover:bg-accent/40"
            >
              Select Folder
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── PlaylistItem Component with Delete & Rename ───
function PlaylistItem({
  playlist,
  onClick,
  onDelete,
  onRename,
}: {
  playlist: any;
  onClick: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(playlist.title);

  const handleSaveRename = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    if (title.trim()) {
      onRename(String(playlist.id), title.trim());
      setIsEditing(false);
    }
  };

  return (
    <motion.div
      whileHover={{ x: 4 }}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl glass-card-elevated liquid-glass-card hover:bg-accent/50 cursor-pointer transition-colors group"
      onClick={onClick}
    >
      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm">
        {playlist.thumbnail ? (
          <img src={playlist.thumbnail} alt={playlist.title} className="w-full h-full object-cover" />
        ) : (
          <ListMusic size={18} className="text-muted-foreground" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        {isEditing ? (
          <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSaveRename(e); if (e.key === 'Escape') setIsEditing(false); }}
              className="px-2 py-0.5 text-xs bg-input rounded border border-border outline-none focus:ring-1 focus:ring-primary w-40"
              autoFocus
            />
            <button onClick={handleSaveRename} className="p-1 text-primary hover:text-primary/80">
              <Check size={12} />
            </button>
            <button onClick={() => setIsEditing(false)} className="p-1 text-muted-foreground hover:text-foreground">
              <X size={12} />
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm font-medium tracking-wide truncate">{playlist.title}</p>
            <p className="text-xs text-muted-foreground/70">{playlist.trackCount || playlist.tracks?.length || 0} songs</p>
          </>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
        <button
          onClick={() => setIsEditing(true)}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
          title="Rename Playlist"
        >
          <Edit2 size={13} />
        </button>
        <button
          onClick={() => onDelete(String(playlist.id))}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          title="Delete Playlist"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </motion.div>
  );
}

// ─── LibraryCard Component ───
function LibraryCard({ icon: Icon, label, count, onClick }: {
  icon: React.ComponentType<Record<string, unknown>>;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className="flex flex-col md:flex-row md:items-center justify-center md:justify-start items-center gap-2 md:gap-3 p-3.5 md:p-4 glass-card shadow-lg ring-1 ring-white/5 rounded-2xl md:text-left transition-all hover:bg-white/10"
    >
      <div className="w-10 h-10 md:w-auto md:h-auto rounded-full bg-white/5 flex items-center justify-center md:bg-transparent">
        <Icon size={20} className="text-white md:text-foreground flex-shrink-0" />
      </div>
      <div className="text-center md:text-left">
        <p className="text-xs md:text-sm font-medium tracking-wide">{label}</p>
        <p className="text-[10px] md:text-xs text-muted-foreground/70">{count} {count === 1 ? 'song' : 'songs'}</p>
      </div>
    </motion.button>
  );
}

// ─── PlaylistCreateButton ───
function PlaylistCreateButton() {
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const { createPlaylist } = useLibraryStore();
  const account = useAccountStore(s => s.account);

  const handleCreate = async () => {
    if (!name.trim()) return;
    const pl = createPlaylist(name.trim());
    if (account?.signedIn) {
      musicAPI.createPlaylist(name.trim()).catch(() => {});
    }
    setName('');
    setIsCreating(false);
    toast.success(`Created playlist "${pl.title}"`);
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
          className="px-2.5 py-1.5 text-xs bg-input rounded-lg border border-border outline-none focus:ring-1 focus:ring-ring w-36"
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

// ─── PlaylistImportButton ───
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
            placeholder="YouTube or Spotify URL..."
            className="px-2.5 py-1.5 text-xs bg-input rounded-lg border border-border outline-none focus:ring-1 focus:ring-ring w-52"
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

// ─── EmptyState Component ───
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
