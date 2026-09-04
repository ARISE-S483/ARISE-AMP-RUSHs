import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, X, Command, ChevronLeft, ChevronRight, Minimize2 } from 'lucide-react';
import { musicAPI } from '@/api/musicAPI';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '@/stores/playerStore';
import { LastFmButton } from './LastFmButton';
import { AccountMenu } from './AccountMenu';

export function TopBar() {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const isMiniPlayerOpen = usePlayerStore(s => s.isMiniPlayerOpen);
  const toggleMiniPlayer = usePlayerStore(s => s.toggleMiniPlayer);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const urlQuery = searchParams.get('q') || '';
    setQuery(urlQuery);
  }, [searchParams]);

  const handleSearch = useCallback((searchQuery: string) => {
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  }, [navigate]);

  const handleInputChange = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length > 1) {
      debounceRef.current = setTimeout(async () => {
        const results = await musicAPI.getSuggestions(value);
        setSuggestions(results.slice(0, 6));
        setShowSuggestions(true);
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setShowSuggestions(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="h-12 flex items-center gap-3 px-4 md:px-6 sticky top-0 z-30 border-b border-border/50">
      {/* Navigation arrows */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => window.history.back()}
          className="w-7 h-7 rounded-full glass-subtle flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-all duration-200 border border-border/30"
        >
          <ChevronLeft size={14} />
        </button>
        <button
          onClick={() => window.history.forward()}
          className="w-7 h-7 rounded-full glass-subtle flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-all duration-200 border border-border/30"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Search — glass input */}
      <div className="relative flex-1 max-w-xl">
        <div className={`flex items-center glass-input rounded-2xl ${isFocused ? 'border-primary/20 shadow-lg shadow-primary/5' : ''}`}>
          <Search size={15} className="ml-4 text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
            onFocus={() => { setIsFocused(true); suggestions.length > 0 && setShowSuggestions(true); }}
            onBlur={() => { setIsFocused(false); setTimeout(() => setShowSuggestions(false), 200); }}
            placeholder="Search songs, artists, albums..."
            className="w-full h-9 bg-transparent pl-3 pr-16 text-sm outline-none placeholder:text-muted-foreground"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-muted-foreground">
            {query && (
              <button onClick={() => { setQuery(''); setSuggestions([]); }} className="hover:text-foreground transition-colors">
                <X size={12} />
              </button>
            )}
            <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[9px] bg-accent/80 px-1.5 py-0.5 rounded font-mono">
              <Command size={8} />K
            </kbd>
          </div>
        </div>

        <AnimatePresence>
          {showSuggestions && suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 right-0 mt-2 glass-card rounded-xl shadow-2xl overflow-hidden z-50"
            >
              {suggestions.map((suggestion, i) => (
                <button
                  key={i}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-accent/50 transition-colors flex items-center gap-3"
                  onMouseDown={() => {
                    const searchTerm = suggestion.includes(' - ') ? suggestion.split(' - ').pop()?.trim() || suggestion : suggestion;
                    setQuery(searchTerm);
                    handleSearch(searchTerm);
                  }}
                >
                  <Search size={12} className="text-muted-foreground flex-shrink-0" />
                  <span className="truncate">{suggestion}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right controls: Mini Player, Last.fm scrobbler, YouTube Music Account */}
      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={toggleMiniPlayer}
          className={`w-7 h-7 rounded-full glass-subtle flex items-center justify-center transition-all border border-border/30 ${
            isMiniPlayerOpen ? 'text-primary bg-primary/15 border-primary/40 shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-accent/40'
          }`}
          title={isMiniPlayerOpen ? 'Close Mini Player' : 'Open Mini Player'}
        >
          <Minimize2 size={13} />
        </button>
        <LastFmButton />
        <AccountMenu />
      </div>
    </div>
  );
}
