import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { musicAPI } from '@/api/musicAPI';
import { motion, AnimatePresence } from 'framer-motion';

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setSuggestions([]);
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // parent handles open toggle
      }
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const handleSearch = useCallback((searchQuery: string) => {
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      onClose();
    }
  }, [navigate, onClose]);

  const handleInputChange = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length > 1) {
      debounceRef.current = setTimeout(async () => {
        const results = await musicAPI.getSuggestions(value);
        setSuggestions(results.filter((s: string) => s && s.trim()).slice(0, 8));
      }, 300);
    } else {
      setSuggestions([]);
    }
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Search panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-[8%] left-1/2 -translate-x-1/2 z-50 w-[90vw] max-w-lg"
          >
            <div className="glass-card vision-border rounded-2xl overflow-hidden">
              {/* Input */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border/30">
                <Search size={18} className="text-muted-foreground flex-shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
                  placeholder="Search songs, artists, albums..."
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                {query && (
                  <button onClick={() => { setQuery(''); setSuggestions([]); }} className="text-muted-foreground hover:text-foreground transition-colors">
                    <X size={14} />
                  </button>
                )}
                <kbd className="hidden sm:inline-flex items-center text-[10px] text-muted-foreground bg-accent/60 px-2 py-0.5 rounded-md font-mono">
                  ESC
                </kbd>
              </div>

              {/* Suggestions */}
              {suggestions.length > 0 && (
                <div className="max-h-[320px] overflow-y-auto scrollbar-thin py-2">
                  {suggestions.map((suggestion, i) => (
                    <button
                      key={i}
                      className="w-full text-left px-5 py-2.5 text-sm hover:bg-accent/40 transition-colors flex items-center gap-3"
                      onClick={() => {
                        const term = suggestion.includes(' - ') ? suggestion.split(' - ').pop()?.trim() || suggestion : suggestion;
                        setQuery(term);
                        handleSearch(term);
                      }}
                    >
                      <Search size={13} className="text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{suggestion}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {query.length > 1 && suggestions.length === 0 && (
                <div className="px-5 py-6 text-center text-sm text-muted-foreground">
                  Type to search...
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
