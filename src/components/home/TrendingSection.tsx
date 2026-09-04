import { useEffect, useState } from 'react';
import { musicAPI } from '@/api/musicAPI';
import { usePlayerStore } from '@/stores/playerStore';
import { useLibraryStore } from '@/stores/libraryStore';
import type { Track, Album, Artist } from '@/api/types';
import { TrendingUp, Sparkles, Music, Disc3, Mic2, Star, Flame, Globe, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Play } from 'lucide-react';
import { ScrollRow, CardSkeletonRow, TrackSkeletonRow } from './ScrollRow';
import { TrackContextMenu } from '@/components/common/TrackContextMenu';

// ─── Reusable inline track card ───
function TrackCardInline({ track, tracks, index }: { track: Track; tracks: Track[]; index: number }) {
  const play = usePlayerStore(s => s.play);
  const [imgErr, setImgErr] = useState(false);

  return (
    <TrackContextMenu>
      {({ onContextMenu, onLongPress }) => (
        <div
          data-testid="track-card"
          className="flex-shrink-0 w-[150px] md:w-[175px] cursor-pointer group"
          style={{ scrollSnapAlign: 'start' }}
          onClick={() => play(track, tracks, index)}
          onContextMenu={(e) => onContextMenu(e, track, tracks, index)}
          onTouchStart={(e) => onLongPress(track, e, tracks, index)}
        >
          <div className="relative aspect-square rounded-2xl overflow-hidden glass-card-elevated liquid-glass-card mb-3 shadow-xl ring-1 ring-white/5">
            {!imgErr && track.thumbnail ? (
              <img
                src={track.thumbnail}
                alt={track.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                loading="lazy"
                onError={() => setImgErr(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-secondary/50">
                <Music size={24} className="text-muted-foreground" />
              </div>
            )}
            <div className="absolute inset-0 bg-background/0 group-hover:bg-background/20 transition-all flex items-center justify-center">
              <div className="w-11 h-11 rounded-full bg-primary/95 backdrop-blur-sm border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-2xl translate-y-1 group-hover:translate-y-0">
                <Play size={18} className="text-white ml-0.5" fill="currentColor" />
              </div>
            </div>
          </div>
          <p className="text-sm font-semibold truncate">{track.title}</p>
          <p className="text-xs text-muted-foreground/80 truncate mt-0.5">{track.artist.name}</p>
        </div>
      )}
    </TrackContextMenu>
  );
}

function AlbumCardInline({ album }: { album: Album }) {
  const navigate = useNavigate();

  return (
    <div
      className="flex-shrink-0 w-[150px] md:w-[175px] cursor-pointer group"
      style={{ scrollSnapAlign: 'start' }}
      onClick={() => navigate(`/playlist/${album.id}`)}
    >
      <div className="relative aspect-square rounded-2xl overflow-hidden glass-card-elevated liquid-glass-card mb-3 shadow-xl ring-1 ring-white/5">
        <img
          src={album.thumbnail || ''}
          alt={album.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-background/0 group-hover:bg-background/20 transition-all flex items-center justify-center">
          <div className="w-11 h-11 rounded-full bg-primary/95 backdrop-blur-sm border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-2xl translate-y-1 group-hover:translate-y-0">
            <Play size={18} className="text-white ml-0.5" fill="currentColor" />
          </div>
        </div>
      </div>
      <p className="text-sm font-semibold truncate">{album.title}</p>
      <p className="text-xs text-muted-foreground/80 truncate mt-0.5">{album.artist.name}</p>
    </div>
  );
}

function ArtistCardInline({ artist }: { artist: Artist }) {
  const navigate = useNavigate();

  return (
    <div
      className="flex-shrink-0 w-[140px] md:w-[160px] cursor-pointer group text-center"
      style={{ scrollSnapAlign: 'start' }}
      onClick={() => navigate(`/artist/${artist.id}`)}
    >
      <div className="relative aspect-square rounded-full overflow-hidden bg-secondary/50 mb-3 mx-auto shadow-xl ring-2 ring-white/5 group-hover:ring-white/15 transition-all glass-card-elevated" style={{ borderRadius: '9999px' }}>
        <img
          src={artist.thumbnail || ''}
          alt={artist.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
          loading="lazy"
        />
      </div>
      <p className="text-sm font-semibold truncate">{artist.name}</p>
      <p className="text-xs text-muted-foreground/80">Artist</p>
    </div>
  );
}

// ─── Generic hooks ───

function useTrackQuery(queries: string[], limit = 15) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const results = await Promise.allSettled(queries.map(q => musicAPI.searchTracks(q)));
        const all: Track[] = [];
        const seen = new Set<string>();
        for (const r of results) {
          if (r.status !== 'fulfilled') continue;
          for (const t of r.value) {
            const id = String(t.id);
            if (!seen.has(id)) { seen.add(id); all.push(t); }
          }
        }
        setTracks(all.slice(0, limit));
      } catch { /* */ }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { tracks, loading };
}

// ─── Real-time YTM official playlist hook ───
// Fetches tracks from the top official YouTube Music playlist matching the query.
// Falls back to keyword search if the playlist API returns nothing.
function useYTMPlaylist(playlistQuery: string, fallbackQueries: string[], limit = 25) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Primary: just search using musicAPI (Monochrome doesn't support fetching playlists by ID directly easily like this)
        const plTracks: Track[] = [];
        if (!cancelled && plTracks.length > 0) {
          setTracks(plTracks);
          setLoading(false);
          return;
        }
        // Fallback: keyword search
        const results = await Promise.allSettled(fallbackQueries.map(q => musicAPI.searchTracks(q)));
        const all: Track[] = [];
        const seen = new Set<string>();
        for (const r of results) {
          if (r.status !== 'fulfilled') continue;
          for (const t of r.value) {
            const id = String(t.id);
            if (!seen.has(id)) { seen.add(id); all.push(t); }
          }
        }
        if (!cancelled) setTracks(all.slice(0, limit));
      } catch { /* */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { tracks, loading };
}

function useAlbumQuery(queries: string[], limit = 15) {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const results = await Promise.allSettled(queries.map(q => musicAPI.searchAlbums(q)));
        const all: Album[] = [];
        const seen = new Set<string>();
        for (const r of results) {
          if (r.status !== 'fulfilled') continue;
          for (const a of r.value) {
            const id = String(a.id);
            if (!seen.has(id)) { seen.add(id); all.push(a); }
          }
        }
        setAlbums(all.slice(0, limit));
      } catch { /* */ }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { albums, loading };
}

function useArtistQuery(names: string[]) {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const results = await Promise.allSettled(names.map(q => musicAPI.searchArtists(q)));
        const all: Artist[] = [];
        const seen = new Set<string>();
        for (const r of results) {
          if (r.status !== 'fulfilled') continue;
          const first = r.value[0];
          if (first) {
            const id = String(first.id);
            if (!seen.has(id)) { seen.add(id); all.push(first); }
          }
        }
        setArtists(all);
      } catch { /* */ }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { artists, loading };
}

// ═══════════════════════════════════════
// EXPORTED SECTIONS
// ═══════════════════════════════════════

export function MadeForYou() {
  const { recentlyPlayed, favorites } = useLibraryStore();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  const hasHistory = recentlyPlayed.length > 0 || favorites.length > 0;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (hasHistory) {
          // Build a rich seed pool from favorites + recently played (like YTM's "Your Mix")
          const seedPool: Track[] = [];
          const seedIds = new Set<string>();
          // Prioritize favorites (strong signal), then recents
          for (const t of [...favorites.slice(0, 10), ...recentlyPlayed.slice(0, 10)]) {
            const id = String(t.id);
            if (!seedIds.has(id)) { seedIds.add(id); seedPool.push(t); }
          }

          const seen = new Set<string>();
          const all: Track[] = [];
          const addUnique = (list: Track[]) => {
            for (const t of list) {
              const id = String(t.id);
              if (!seen.has(id) && !seedIds.has(id)) { seen.add(id); all.push(t); }
            }
          };

          // 1. Primary: Playlist-based recommendation engine (seeds → YTMusic Up Next → Deezer → Spotify)
          //    This is the most YouTube Music-like approach — finds tracks related to your entire taste profile
          try {
            const playlistRecs = await musicAPI.getRecommendedTracksForPlaylist(
              seedPool.slice(0, 8), 25, { knownTrackIds: seedIds }
            );
            addUnique(playlistRecs);
          } catch { /* continue */ }

          // 2. Supplement: Per-track recs from the top favorite (deepens personalization depth)
          if (all.length < 15 && favorites.length > 0) {
            try {
              const favRecs = await musicAPI.getUpNexts(favorites[0]);
              addUnique(favRecs);
            } catch { /* continue */ }
          }

          // 3. Supplement: Home recs from TIDAL/Monochrome for catalog diversity
          if (all.length < 15) {
            try {
              const homeRecs = await musicAPI.getHomeRecommendations(seedPool.slice(0, 5));
              addUnique(homeRecs.songs);
            } catch { /* continue */ }
          }

          if (!cancelled) {
            // Shuffle for freshness (like YTM refreshes order)
            const shuffled = all.sort(() => Math.random() - 0.5);
            setTracks(shuffled.slice(0, 25));
          }
        } else {
          // No history — discover via random popular queries instead of mirroring Trending
          const fallbackQueries = ['Viral Hits', 'Top Tracks currently', 'Global Pop top tracks', 'Chill vibes playlist'];
          const randomQuery = fallbackQueries[Math.floor(Math.random() * fallbackQueries.length)];
          try {
            const searchResults = await musicAPI.searchTracks(randomQuery);
            if (!cancelled && searchResults.length > 0) {
              setTracks(searchResults.slice(0, 25));
            } else if (!cancelled) {
              const trending = await musicAPI.getTrending('IN');
              setTracks(trending.reverse().slice(0, 25)); // reverse to look slightly different
            }
          } catch {
            if (!cancelled) {
              const trending = await musicAPI.getTrending('IN');
              setTracks(trending.slice(0, 25));
            }
          }
        }
      } catch { /* */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const title = hasHistory ? 'Made for You' : 'Discover Something New';

  if (!loading && tracks.length === 0) return null;

  return (
    <ScrollRow title={title} icon={<Heart size={18} className="text-primary" />}>
      {loading ? <TrackSkeletonRow /> : tracks.map((t, i) => (
        <TrackCardInline key={String(t.id)} track={t} tracks={tracks} index={i} />
      ))}
    </ScrollRow>
  );
}

export function TrendingSongs() {
  const { recentlyPlayed, favorites } = useLibraryStore();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  const hasHistory = recentlyPlayed.length > 0 || favorites.length > 0;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (hasHistory) {
          // Pick diverse seeds from different parts of listening history
          // (like YTM picking from different genres/moods in your library)
          const allHistory = [...recentlyPlayed, ...favorites];
          const seedIds = new Set(allHistory.map(t => String(t.id)));
          const seen = new Set<string>();
          const all: Track[] = [];
          const addUnique = (list: Track[]) => {
            for (const t of list) {
              const id = String(t.id);
              if (!seen.has(id) && !seedIds.has(id)) { seen.add(id); all.push(t); }
            }
          };

          // Pick 3 seeds spread across history for variety
          const diverseSeeds: Track[] = [];
          const pickIndices = [
            0,                                                    // most recent
            Math.floor(allHistory.length * 0.3),                  // mid-recent
            Math.floor(allHistory.length * 0.7),                  // older taste
          ];
          const usedArtists = new Set<string>();
          for (const idx of pickIndices) {
            const track = allHistory[Math.min(idx, allHistory.length - 1)];
            if (track && !usedArtists.has(track.artist.name)) {
              usedArtists.add(track.artist.name);
              diverseSeeds.push(track);
            }
          }

          // Get per-track recommendations from each seed concurrently
          const recPromises = diverseSeeds.map(seed =>
            musicAPI.getUpNexts(seed).catch(() => [] as Track[])
          );
          const recResults = await Promise.allSettled(recPromises);

          // Interleave results from different seeds for variety (like YTM mixes genres)
          const perSeed: Track[][] = recResults.map(r =>
            r.status === 'fulfilled' ? r.value : []
          );
          const maxLen = Math.max(...perSeed.map(s => s.length));
          for (let i = 0; i < maxLen; i++) {
            for (const seedTracks of perSeed) {
              if (i < seedTracks.length) addUnique([seedTracks[i]]);
            }
          }

          // If still thin, use playlist-based recs with different seeds than MadeForYou
          if (all.length < 10) {
            try {
              const extraRecs = await musicAPI.getRecommendedTracksForPlaylist(
                recentlyPlayed.slice(3, 8), 15, { knownTrackIds: seedIds }
              );
              addUnique(extraRecs);
            } catch { /* continue */ }
          }

          if (!cancelled) setTracks(all.slice(0, 25));
        } else {
          // No history — global trending from YouTube/Piped
          const trending = await musicAPI.getTrending('US');
          if (!cancelled) setTracks(trending.slice(0, 25));
        }
      } catch { /* */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const title = hasHistory ? 'Recommended for You' : 'Trending Now';

  return (
    <ScrollRow title={title} icon={<TrendingUp size={20} className="text-primary" />}>
      {loading ? <TrackSkeletonRow /> : tracks.map((t, i) => (
        <TrackCardInline key={String(t.id)} track={t} tracks={tracks} index={i} />
      ))}
    </ScrollRow>
  );
}

export function NewReleases() {
  const { tracks, loading } = useYTMPlaylist(
    'New Releases',
    ['new music 2026', 'latest releases 2026', 'new songs this week'],
    25
  );

  return (
    <ScrollRow title="New Releases" icon={<Sparkles size={18} className="text-primary" />}>
      {loading ? <TrackSkeletonRow /> : tracks.map((t, i) => (
        <TrackCardInline key={String(t.id)} track={t} tracks={tracks} index={i} />
      ))}
    </ScrollRow>
  );
}

export function BollywoodHits() {
  const { tracks, loading } = useYTMPlaylist(
    'Bollywood Hits',
    ['Arijit Singh latest songs', 'Bollywood romantic songs', 'top Bollywood songs 2026'],
    25
  );

  return (
    <ScrollRow title="Bollywood Hits" icon={<Flame size={18} className="text-primary" />}>
      {loading ? <TrackSkeletonRow /> : tracks.map((t, i) => (
        <TrackCardInline key={String(t.id)} track={t} tracks={tracks} index={i} />
      ))}
    </ScrollRow>
  );
}

export function PunjabiHits() {
  const { tracks, loading } = useYTMPlaylist(
    'Punjabi Hits',
    ['AP Dhillon songs', 'Diljit Dosanjh latest', 'trending Punjabi songs 2026'],
    25
  );

  return (
    <ScrollRow title="Punjabi Vibes" icon={<Mic2 size={18} className="text-primary" />}>
      {loading ? <TrackSkeletonRow /> : tracks.map((t, i) => (
        <TrackCardInline key={String(t.id)} track={t} tracks={tracks} index={i} />
      ))}
    </ScrollRow>
  );
}

export function PopularAlbums() {
  const { albums, loading } = useAlbumQuery([
    'top albums 2026',
    'popular albums',
    'best new albums',
    'trending albums',
  ], 20);

  return (
    <ScrollRow title="Popular Albums" icon={<Disc3 size={18} className="text-muted-foreground" />}>
      {loading ? <CardSkeletonRow /> : albums.map(a => (
        <AlbumCardInline key={String(a.id)} album={a} />
      ))}
    </ScrollRow>
  );
}

export function GlobalHits() {
  const { tracks, loading } = useYTMPlaylist(
    'Global Top 50',
    ['Billboard Hot 100', 'global charts 2026', 'top global hits'],
    25
  );

  return (
    <ScrollRow title="Global Hits" icon={<Globe size={18} className="text-primary" />}>
      {loading ? <TrackSkeletonRow /> : tracks.map((t, i) => (
        <TrackCardInline key={String(t.id)} track={t} tracks={tracks} index={i} />
      ))}
    </ScrollRow>
  );
}

export function TopArtists() {
  const { artists, loading } = useArtistQuery([
    'The Weeknd', 'Taylor Swift', 'Drake', 'Bad Bunny', 'Billie Eilish',
    'SZA', 'Dua Lipa', 'Travis Scott', 'Arijit Singh', 'AP Dhillon',
    'Diljit Dosanjh', 'Rihanna', 'Ed Sheeran', 'Post Malone', 'Kendrick Lamar',
  ]);

  return (
    <ScrollRow title="Popular Artists" icon={<Star size={18} className="text-primary" />}>
      {loading ? <CardSkeletonRow /> : artists.map(a => (
        <ArtistCardInline key={String(a.id)} artist={a} />
      ))}
    </ScrollRow>
  );
}

export function TopCharts() {
  const { tracks, loading } = useYTMPlaylist(
    'Top Charts',
    ['Billboard Hot 100 2026', 'Apple Music top charts', 'Spotify top 50 global'],
    25
  );

  return (
    <ScrollRow title="Top Charts" icon={<TrendingUp size={18} className="text-primary" />}>
      {loading ? <TrackSkeletonRow /> : tracks.map((t, i) => (
        <TrackCardInline key={String(t.id)} track={t} tracks={tracks} index={i} />
      ))}
    </ScrollRow>
  );
}

export function AcousticSessions() {
  const { tracks, loading } = useYTMPlaylist(
    'Acoustic Hits',
    ['acoustic covers', 'unplugged sessions', 'acoustic versions popular songs'],
    25
  );

  return (
    <ScrollRow title="Acoustic Sessions" icon={<Music size={18} className="text-primary" />}>
      {loading ? <TrackSkeletonRow /> : tracks.map((t, i) => (
        <TrackCardInline key={String(t.id)} track={t} tracks={tracks} index={i} />
      ))}
    </ScrollRow>
  );
}

export function PartyStarters() {
  const { tracks, loading } = useYTMPlaylist(
    'Party Hits',
    ['party songs 2026', 'dance hits 2026', 'club bangers', 'EDM hits'],
    25
  );

  return (
    <ScrollRow title="Party Starters" icon={<Flame size={18} className="text-primary" />}>
      {loading ? <TrackSkeletonRow /> : tracks.map((t, i) => (
        <TrackCardInline key={String(t.id)} track={t} tracks={tracks} index={i} />
      ))}
    </ScrollRow>
  );
}

// Legacy exports
export function TrendingAlbums() {
  return <PopularAlbums />;
}

export function TrendingArtists() {
  return <TopArtists />;
}
