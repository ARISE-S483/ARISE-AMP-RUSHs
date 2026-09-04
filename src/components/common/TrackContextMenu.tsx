import { useState, useRef, useEffect, useCallback } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { downloadTrack } from '@/lib/download';
import { toast } from 'sonner';
import type { Track } from '@/api/types';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, ListPlus, ListMusic, Heart, Download,
  Plus, FolderPlus, Radio, Sparkles
} from 'lucide-react';

interface ContextMenuState {
  x: number;
  y: number;
  track: Track;
  tracks?: Track[];
  index?: number;
}

interface TrackContextMenuProps {
  children: (handlers: {
    onContextMenu: (e: React.MouseEvent, track: Track, tracks?: Track[], index?: number) => void;
    onLongPress: (track: Track, e: React.TouchEvent, tracks?: Track[], index?: number) => void;
  }) => React.ReactNode;
}

export function TrackContextMenu({ children }: TrackContextMenuProps) {
  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const [showPlaylists, setShowPlaylists] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  const play = usePlayerStore(s => s.play);
  const addToQueue = usePlayerStore(s => s.addToQueue);
  const addNextToQueue = usePlayerStore(s => s.addNextToQueue);
  const addSimilarToQueue = usePlayerStore(s => s.addSimilarToQueue);
  const enableRadio = usePlayerStore(s => s.enableRadio);
  const { addToFavorites, removeFromFavorites, isFavorite, playlists, createPlaylist, addToPlaylist } = useLibraryStore();

  const close = useCallback(() => {
    setMenu(null);
    setShowPlaylists(false);
    setCreating(false);
    setNewName('');
  }, []);

  useEffect(() => {
    if (!menu) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [menu, close]);

  // Adjust position to keep menu in viewport
  const getPosition = (x: number, y: number) => {
    const menuW = 220;
    const menuH = 320;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    return {
      left: Math.min(x, vw - menuW - 8),
      top: y + menuH > vh ? Math.max(8, y - menuH) : y,
    };
  };

  const onContextMenu = useCallback((e: React.MouseEvent, track: Track, tracks?: Track[], index?: number) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ x: e.clientX, y: e.clientY, track, tracks, index });
  }, []);

  // Long press for mobile
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onLongPress = useCallback((track: Track, e: React.TouchEvent, tracks?: Track[], index?: number) => {
    const touch = e.touches[0];
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    const x = touch.clientX;
    const y = touch.clientY;
    longPressTimerRef.current = setTimeout(() => {
      e.preventDefault();
      setMenu({ x, y, track, tracks, index });
    }, 500);

    const cancel = () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
    e.currentTarget.addEventListener('touchend', cancel, { once: true });
    e.currentTarget.addEventListener('touchmove', cancel, { once: true });
  }, []);

  if (!menu) return <>{children({ onContextMenu, onLongPress })}</>;

  const { track, tracks, index } = menu;
  const liked = isFavorite(String(track.id));
  const pos = getPosition(menu.x, menu.y);

  const handlePlay = () => {
    play(track, tracks || [track], index || 0);
    close();
  };

  const handlePlayNext = () => {
    addNextToQueue(track);
    toast.success(`"${track.title}" will play next`);
    close();
  };

  const handleAddToQueue = () => {
    addToQueue(track);
    toast.success(`Added "${track.title}" to queue`);
    close();
  };

  const handleToggleFavorite = () => {
    if (liked) removeFromFavorites(String(track.id));
    else addToFavorites(track);
    toast.success(liked ? 'Removed from favorites' : 'Added to favorites');
    close();
  };

  const handleDownload = async () => {
    close();
    toast.info(`Downloading "${track.title}"...`);
    try {
      await downloadTrack(track);
      toast.success('Download started!');
    } catch {
      toast.error('Download failed');
    }
  };

  const handleStartRadio = () => {
    enableRadio([track]);
    play(track, [track], 0);
    toast.success(`Started radio from "${track.title}"`);
    close();
  };

  const handleAddToPlaylist = (playlistId: string) => {
    addToPlaylist(playlistId, track);
    toast.success('Added to playlist');
    close();
  };

  const handleCreateAndAdd = () => {
    if (!newName.trim()) return;
    const pl = createPlaylist(newName.trim());
    addToPlaylist(String(pl.id), track);
    toast.success(`Created "${newName.trim()}" and added track`);
    close();
  };

  const handleAddSimilar = () => {
    addSimilarToQueue(track);
    close();
  };

  const menuItems = [
    { icon: Play, label: 'Play', action: handlePlay },
    { icon: ListPlus, label: 'Play Next', action: handlePlayNext },
    { icon: Plus, label: 'Add to Queue', action: handleAddToQueue },
    { icon: Sparkles, label: 'Queue Similar (ytify)', action: handleAddSimilar },
    { divider: true },
    { icon: Heart, label: liked ? 'Remove from Favorites' : 'Add to Favorites', action: handleToggleFavorite, active: liked },
    { icon: FolderPlus, label: 'Add to Playlist', action: () => setShowPlaylists(true) },
    { icon: Download, label: 'Download', action: handleDownload },
    { divider: true },
    { icon: Radio, label: 'Start Radio', action: handleStartRadio },
  ];

  return (
    <>
      {children({ onContextMenu, onLongPress })}

      <AnimatePresence>
        {menu && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-[80]" onClick={close} onContextMenu={(e) => { e.preventDefault(); close(); }} />

            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.12 }}
              className="fixed z-[81] w-56 rounded-xl bg-card border border-border shadow-2xl overflow-hidden"
              style={{ left: pos.left, top: pos.top }}
            >
              {/* Track info header */}
              <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-border bg-secondary/30">
                <img
                  src={track.thumbnail || ''}
                  alt=""
                  className="w-9 h-9 rounded-md object-cover flex-shrink-0 bg-secondary"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground truncate">{track.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{track.artist.name}</p>
                </div>
              </div>

              {!showPlaylists ? (
                <div className="py-1">
                  {menuItems.map((item, i) => {
                    if ('divider' in item && item.divider) {
                      return <div key={i} className="h-px bg-border mx-2 my-0.5" />;
                    }
                    const Icon = item.icon!;
                    return (
                      <button
                        key={i}
                        onClick={item.action}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-foreground hover:bg-accent/50 transition-colors"
                      >
                        <Icon size={14} className={item.active ? 'fill-primary text-primary' : 'text-muted-foreground'} />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="py-1">
                  <button
                    onClick={() => setShowPlaylists(false)}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-muted-foreground hover:bg-accent/50 transition-colors"
                  >
                    ← Back
                  </button>
                  <div className="max-h-48 overflow-y-auto scrollbar-thin">
                    {playlists.map(pl => (
                      <button
                        key={pl.id}
                        onClick={() => handleAddToPlaylist(String(pl.id))}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-foreground hover:bg-accent/50 transition-colors"
                      >
                        <ListMusic size={14} className="text-muted-foreground" />
                        <span className="truncate">{pl.title}</span>
                        <span className="ml-auto text-[10px] text-muted-foreground">{pl.trackCount}</span>
                      </button>
                    ))}
                    {playlists.length === 0 && !creating && (
                      <p className="text-[10px] text-muted-foreground px-3 py-2 text-center">No playlists yet</p>
                    )}
                  </div>
                  <div className="border-t border-border p-1.5">
                    {creating ? (
                      <div className="flex items-center gap-1.5 px-1">
                        <input
                          type="text"
                          value={newName}
                          onChange={e => setNewName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleCreateAndAdd(); if (e.key === 'Escape') setCreating(false); }}
                          placeholder="Playlist name..."
                          className="flex-1 px-2 py-1.5 text-xs bg-input rounded-md border border-border outline-none focus:ring-1 focus:ring-ring"
                          autoFocus
                        />
                        <button onClick={handleCreateAndAdd} className="text-xs text-primary font-medium px-2 py-1.5">Add</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setCreating(true)}
                        className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                      >
                        <Plus size={14} />
                        New playlist
                      </button>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
