import { useEffect, useState, useRef, useCallback } from 'react';
import { musicAPI } from '@/api/musicAPI';
import { usePlayerStore } from '@/stores/playerStore';
import type { Track } from '@/api/types';
import { Play } from 'lucide-react';
import { motion } from 'framer-motion';

const SPOTLIGHT_QUERIES = [
  'The Weeknd',
  'Taylor Swift',
  'Drake',
  'Bad Bunny',
  'Billie Eilish',
  'SZA',
  'Dua Lipa',
  'Travis Scott',
];

interface SpotlightData {
  title: string;
  subtitle: string;
  description: string;
  thumbnail: string;
  tracks: Track[];
}

export function HeroSpotlight() {
  const [spotlight, setSpotlight] = useState<SpotlightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [scrollY, setScrollY] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const play = usePlayerStore(s => s.play);

  // Parallax: listen to parent scroll container
  const handleScroll = useCallback(() => {
    const section = sectionRef.current;
    if (!section) return;
    const scrollContainer = section.closest('.overflow-y-auto');
    if (!scrollContainer) return;
    const rect = section.getBoundingClientRect();
    const containerRect = scrollContainer.getBoundingClientRect();
    const offset = containerRect.top - rect.top;
    setScrollY(offset);
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const scrollContainer = section.closest('.overflow-y-auto');
    if (!scrollContainer) return;
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [handleScroll, loading]);

  useEffect(() => {
    const load = async () => {
      try {
        const query = SPOTLIGHT_QUERIES[Math.floor(Math.random() * SPOTLIGHT_QUERIES.length)];
        const tracks = await musicAPI.searchTracks(query);
        if (tracks.length > 0) {
          const featured = tracks[0];
          setSpotlight({
            title: featured.artist.name,
            subtitle: featured.title,
            description: `Listen to ${featured.artist.name}'s latest tracks. Featuring "${featured.title}" and more.`,
            thumbnail: featured.thumbnailLarge || featured.thumbnail || '',
            tracks: tracks.slice(0, 20),
          });
        }
      } catch { /* ignore */ }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="relative w-full h-[280px] md:h-[340px] rounded-2xl bg-secondary/50 animate-pulse overflow-hidden" />
    );
  }

  if (!spotlight) return null;

  const parallaxBg = Math.max(-40, Math.min(40, scrollY * 0.3));
  const parallaxText = Math.max(-20, Math.min(20, scrollY * -0.1));

  return (
    <motion.section
      ref={sectionRef}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="relative w-full h-[280px] md:h-[340px] rounded-2xl overflow-hidden cursor-pointer group"
      onClick={() => {
        if (spotlight.tracks.length > 0) {
          play(spotlight.tracks[0], spotlight.tracks, 0);
        }
      }}
    >
      {/* Parallax background image */}
      <div
        className="absolute inset-[-40px] will-change-transform"
        style={{ transform: `translateY(${parallaxBg}px)` }}
      >
        <img
          src={spotlight.thumbnail}
          alt=""
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
      </div>

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-background/30" />

      {/* Content with counter-parallax */}
      <div
        className="absolute inset-0 flex flex-col justify-end p-6 md:p-10 will-change-transform"
        style={{ transform: `translateY(${parallaxText}px)` }}
      >
        <div className="glass rounded-2xl p-5 md:p-6 max-w-lg border border-border/40 vision-border">
          <p className="text-xs md:text-sm font-semibold text-primary uppercase tracking-widest mb-2">
            Spotlight
          </p>
          <h2 className="font-display text-3xl md:text-5xl font-black tracking-tight mb-2">
            {spotlight.title}
          </h2>
          <p className="text-sm md:text-base text-muted-foreground max-w-lg mb-5 line-clamp-2">
            {spotlight.description}
          </p>
          <div>
            <button className="inline-flex items-center gap-2.5 px-6 py-3 glass border border-border/50 text-foreground rounded-full font-semibold text-sm hover:bg-accent/40 transition-colors shadow-xl vision-border">
              <Play size={16} fill="currentColor" />
              Listen Now
            </button>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
