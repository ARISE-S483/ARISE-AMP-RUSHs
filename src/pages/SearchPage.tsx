import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { musicAPI } from '@/api/musicAPI';
import type { SearchResults } from '@/api/types';
import { TrackList } from '@/components/common/TrackList';
import { AlbumCard, ArtistCard } from '@/components/common/MediaCards';
import { Search, Loader2, TrendingUp, Music, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const tabs = ['all', 'tracks', 'videos', 'artists', 'albums', 'playlists'] as const;

const TRENDING_SEARCHES = [
  "Arijit Singh",
  "Taylor Swift",
  "The Weeknd",
  "Lofi Hip Hop",
  "Workout Mix",
  "Atif Aslam",
  "Pop Hits",
  "Ed Sheeran"
];

const BROWSE_CATEGORIES = [
  { name: "Pop", color: "from-pink-500/80 to-rose-400/80" },
  { name: "Hip-Hop", color: "from-orange-500/80 to-amber-400/80" },
  { name: "Electronic", color: "from-blue-600/80 to-cyan-400/80" },
  { name: "Rock", color: "from-slate-700/80 to-slate-500/80" },
  { name: "Focus", color: "from-emerald-500/80 to-teal-400/80" },
  { name: "R&B", color: "from-violet-600/80 to-purple-400/80" },
  { name: "Chill", color: "from-indigo-600/80 to-blue-500/80" },
  { name: "Workout", color: "from-red-600/80 to-orange-500/80" }
];

function SearchSkeleton() {
  return (
    <div className="space-y-6 mt-4 animate-in fade-in duration-300">
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-8 w-20 rounded-full bg-secondary/60 animate-pulse" />
        ))}
      </div>
      <div className="space-y-1">
        <div className="h-5 w-24 bg-secondary/40 rounded animate-pulse mb-3" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
            <div className="w-10 h-10 rounded-md bg-secondary/60 animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 bg-secondary/50 rounded animate-pulse" style={{ width: `${180 + Math.random() * 100}px` }} />
              <div className="h-2.5 bg-secondary/30 rounded animate-pulse" style={{ width: `${100 + Math.random() * 80}px` }} />
            </div>
            <div className="h-3 w-10 bg-secondary/30 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

function TabBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="ml-1.5 text-[10px] bg-foreground/10 rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
      {count > 99 ? '99+' : count}
    </span>
  );
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [localQuery, setLocalQuery] = useState(query);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(!!query);
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>('all');
  const [apiSources, setApiSources] = useState<string[]>([]);
  const abortRef = useRef<AbortController>();
  const prevQueryRef = useRef('');
  const suggestionsDebounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleInputChange = (value: string) => {
    setLocalQuery(value);
    
    if (value.trim() === '' || value === query) {
      setSuggestions([]);
      if (suggestionsDebounceRef.current) clearTimeout(suggestionsDebounceRef.current);
      return;
    }

    if (suggestionsDebounceRef.current) clearTimeout(suggestionsDebounceRef.current);
    
    if (value.trim().length > 1) {
      suggestionsDebounceRef.current = setTimeout(async () => {
        try {
          const res = await musicAPI.getSuggestions(value);
          setSuggestions(res.slice(0, 6)); // Top 6 for mobile
        } catch {
          setSuggestions([]);
        }
      }, 300);
    } else {
      setSuggestions([]);
    }
  };

  useEffect(() => {
    setLocalQuery(query);
    setSuggestions([]);
  }, [query]);

  useEffect(() => {
    if (!query) {
      setResults(null);
      setLoading(false);
      prevQueryRef.current = '';
      return;
    }

    if (query === prevQueryRef.current && results) return;
    prevQueryRef.current = query;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setActiveTab('all');

    musicAPI.search(query, controller.signal).then(data => {
      if (!controller.signal.aborted) {
        setResults(data);
        setLoading(false);
        
        // Determine which APIs returned results
        const sources: string[] = [];
        if (data.tracks.length > 0) {
          const trackSources = new Set(data.tracks.map(t => t.source).filter(Boolean));
          trackSources.forEach(s => {
            if (s === 'piped') sources.push('YouTube Music');
            else if (s === 'tidal') sources.push('TIDAL');
            else if (s === 'jiosaavn') sources.push('JioSaavn');
            else if (s === 'rapidapi') sources.push('RapidAPI');
            else if (s === 'deezer') sources.push('Deezer');
            else if (s === 'shazam') sources.push('Shazam');
            else if (s === 'spotify') sources.push('Spotify');
          });
        }
        if (data.artists.length > 0) sources.push('Artists');
        if (data.albums.length > 0) sources.push('Albums');
        if (data.playlists.length > 0) sources.push('Playlists');
        setApiSources([...new Set(sources)]);
      }
    }).catch(err => {
      if (err.name !== 'AbortError' && !controller.signal.aborted) {
        setLoading(false);
        setResults({ tracks: [], albums: [], artists: [], playlists: [] });
      }
    });

    return () => {
      controller.abort();
    };
  }, [query]);

  const tabCounts = results ? {
    all: results.tracks.length + (results.videos?.length || 0) + results.artists.length + results.albums.length + results.playlists.length,
    tracks: results.tracks.length,
    videos: results.videos?.length || 0,
    artists: results.artists.length,
    albums: results.albums.length,
    playlists: results.playlists.length,
  } : { all: 0, tracks: 0, videos: 0, artists: 0, albums: 0, playlists: 0 };

  const hasResults = results && (
    results.tracks.length > 0 || (results.videos && results.videos.length > 0) || results.artists.length > 0 ||
    results.albums.length > 0 || results.playlists.length > 0
  );

  return (
    <motion.div className="p-4 md:p-6 min-h-[60vh] flex flex-col" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      
      {/* Mobile-only Search Bar (Sticky at top) */}
      <div className="md:hidden sticky top-0 z-20 pt-1 pb-3 -mx-4 px-4 mb-4" style={{ backgroundColor: 'var(--background)' }}>
        <div className="relative group">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={localQuery}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (localQuery.trim()) {
                  setSearchParams({ q: localQuery.trim() });
                  setSuggestions([]);
                }
                (e.target as HTMLInputElement).blur();
              }
            }}
            placeholder="Search songs, artists, albums..."
            className="w-full bg-white/10 text-foreground text-[16px] rounded-2xl pl-11 pr-10 py-3.5 outline-none border border-white/5 focus:border-white/20 focus:bg-white/15 transition-all shadow-[0_4px_16px_rgba(0,0,0,0.2)] placeholder:text-muted-foreground/70 appearance-none"
          />
          {localQuery && (
            <button 
              onClick={() => { handleInputChange(''); setSearchParams({}); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/10 text-muted-foreground/80 hover:text-foreground hover:bg-white/20 transition-colors active:scale-90"
            >
              <X size={14} strokeWidth={2.5} />
            </button>
          )}

          {/* Mobile Search Suggestions Dropdown */}
          {suggestions.length > 0 && localQuery !== query && (
            <div className="absolute top-[110%] left-0 right-0 bg-[#161a22]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden z-30 animate-in slide-in-from-top-2 fade-in duration-200">
              {suggestions.map((suggestion, i) => (
                <button
                  key={i}
                  className="w-full text-left px-5 py-3.5 text-[15px] hover:bg-white/10 active:bg-white/15 transition-colors flex items-center gap-3 border-b border-white/5 last:border-0"
                  onClick={() => {
                    const term = suggestion.includes(' - ') ? suggestion.split(' - ').pop()?.trim() || suggestion : suggestion;
                    setLocalQuery(term);
                    setSearchParams({ q: term });
                    setSuggestions([]);
                  }}
                >
                  <Search size={14} className="text-muted-foreground opacity-70 flex-shrink-0" />
                  <span className="truncate text-foreground/90">{suggestion}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {!query ? (
        <div className="flex-1 overflow-y-auto scrollbar-thin pb-32 pt-2 animate-in fade-in duration-500">
          
          <div className="mb-8 pl-1">
            <h2 className="text-lg md:text-xl font-display font-bold mb-4 flex items-center gap-2">
              <TrendingUp size={20} className="text-primary" />
              Popular Right Now
            </h2>
            <div className="flex flex-wrap gap-2.5">
              {TRENDING_SEARCHES.map((term, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setLocalQuery(term);
                    setSearchParams({ q: term });
                  }}
                  className="px-4 py-2 bg-secondary/40 hover:bg-secondary/80 border border-white/5 rounded-full text-sm font-medium transition-all text-secondary-foreground hover:text-foreground active:scale-95 flex items-center gap-2"
                >
                  <Search size={14} className="opacity-50" />
                  {term}
                </button>
              ))}
            </div>
          </div>

          <div className="pl-1">
            <h2 className="text-lg md:text-xl font-display font-bold mb-4 flex items-center gap-2">
              <Music size={20} className="text-primary" />
              Browse Categories
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {BROWSE_CATEGORIES.map((cat, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setLocalQuery(cat.name);
                    setSearchParams({ q: cat.name });
                  }}
                  className={`relative overflow-hidden aspect-[2/1] rounded-xl bg-gradient-to-br ${cat.color} p-4 text-left transition-transform hover:scale-[1.02] active:scale-95 shadow-lg group`}
                >
                  <span className="relative z-10 font-display font-bold text-[15px] md:text-lg text-white shadow-black/20 drop-shadow-md">
                    {cat.name}
                  </span>
                  <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-white/20 blur-xl rounded-full transform group-hover:scale-150 transition-transform duration-500" />
                </button>
              ))}
            </div>
          </div>

        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h1 className="font-display text-xl md:text-2xl font-bold">Results for "{query}"</h1>
            {loading && <Loader2 size={18} className="animate-spin text-muted-foreground" />}
          </div>
      
      {/* API Sources indicator */}
      {!loading && apiSources.length > 0 && (
        <div className="flex items-center gap-2 mt-2 mb-4 flex-wrap">
          <span className="text-xs text-muted-foreground">Sources:</span>
          {apiSources.map(source => (
            <span 
              key={source} 
              className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20"
            >
              {source}
            </span>
          ))}
        </div>
      )}

      {(loading || (!!query && !results)) && <SearchSkeleton />}

      {!loading && results && (
        <>
          <div className="flex gap-2 mt-4 mb-6 overflow-x-auto pb-1 scrollbar-thin">
            {tabs.map(tab => (
              <motion.button
                key={tab}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-all duration-200 flex items-center ${
                  activeTab === tab
                    ? 'bg-foreground text-background font-medium shadow-lg'
                    : 'bg-secondary/60 text-secondary-foreground hover:bg-accent'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                <TabBadge count={tabCounts[tab]} />
              </motion.button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {/* Top Hit (only in "all" tab) */}
              {activeTab === 'all' && results.tracks.length > 0 && (
                <section className="mb-8">
                  <h2 className="font-display text-lg font-semibold mb-3">Top Hit</h2>
                  <TrackList tracks={results.tracks.slice(0, 1)} showIndex={false} />
                </section>
              )}

              {(activeTab === 'all' || activeTab === 'tracks') && results.tracks.length > 0 && (
                <section className="mb-8">
                  {activeTab === 'all' && <h2 className="font-display text-lg font-semibold mb-3">Songs ({results.tracks.length - 1})</h2>}
                  <TrackList tracks={activeTab === 'all' ? results.tracks.slice(1) : results.tracks} />
                </section>
              )}

              {(activeTab === 'all' || activeTab === 'videos') && results.videos && results.videos.length > 0 && (
                <section className="mb-8">
                  {activeTab === 'all' && <h2 className="font-display text-lg font-semibold mb-3">Music Videos ({results.videos.length})</h2>}
                  <TrackList tracks={results.videos} />
                </section>
              )}

              {(activeTab === 'all' || activeTab === 'artists') && results.artists.length > 0 && (
                <section className="mb-8">
                  {activeTab === 'all' && <h2 className="font-display text-lg font-semibold mb-3">Artists ({results.artists.length})</h2>}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {results.artists.map(artist => (
                      <ArtistCard key={String(artist.id)} artist={artist} />
                    ))}
                  </div>
                </section>
              )}

              {(activeTab === 'all' || activeTab === 'albums') && results.albums.length > 0 && (
                <section className="mb-8">
                  {activeTab === 'all' && <h2 className="font-display text-lg font-semibold mb-3">Albums ({results.albums.length})</h2>}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {results.albums.map(album => (
                      <AlbumCard key={String(album.id)} album={album} />
                    ))}
                  </div>
                </section>
              )}

              {(activeTab === 'all' || activeTab === 'playlists') && results.playlists.length > 0 && (
                <section className="mb-8">
                  {activeTab === 'all' && <h2 className="font-display text-lg font-semibold mb-3">Playlists ({results.playlists.length})</h2>}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {results.playlists.map(pl => (
                      <AlbumCard key={String(pl.id)} album={{
                        id: pl.id as number,
                        title: pl.title,
                        artist: { id: 0, name: pl.creator || '' },
                        thumbnail: pl.thumbnail,
                      }} />
                    ))}
                  </div>
                </section>
              )}

              {!hasResults && (
                <div className="text-center py-16">
                  <Search size={32} className="text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No results found for "{query}"</p>
                  <p className="text-muted-foreground/50 text-sm mt-1">Try a different search term</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </>
      )}
      </>
      )}
    </motion.div>
  );
}
