import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QuickPicks } from '@/components/home/QuickPicks';
import { FeaturedPlaylists } from '@/components/home/FeaturedPlaylists';
import { GenreBrowser } from '@/components/home/GenreBrowser';
import { useIsMobile } from '@/hooks/use-mobile';
import { useProfileStore } from '@/stores/profileStore';
import { useAccountStore } from '@/stores/accountStore';
import { musicAPI } from '@/api/musicAPI';
import type { Track } from '@/api/types';
import { TrackList } from '@/components/common/TrackList';
import { Sparkles, Flame, Coffee, Dumbbell, Zap, Headphones, Car, PartyPopper } from 'lucide-react';
import {
  TrendingSongs,
  NewReleases,
  BollywoodHits,
  PunjabiHits,
  PopularAlbums,
  TopArtists,
  GlobalHits,
  MadeForYou,
  TopCharts,
  AcousticSessions,
  PartyStarters,
} from '@/components/home/TrendingSection';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const MOOD_CHIPS = [
  { id: 'all', label: 'All', icon: Sparkles },
  { id: 'relax', label: 'Relax', query: 'chill acoustic relaxing music', icon: Coffee },
  { id: 'energize', label: 'Energize', query: 'energetic electronic pop beats', icon: Zap },
  { id: 'workout', label: 'Workout', query: 'gym workout motivation music', icon: Dumbbell },
  { id: 'focus', label: 'Focus', query: 'lofi study beats concentration', icon: Headphones },
  { id: 'commute', label: 'Commute', query: 'driving road trip music songs', icon: Car },
  { id: 'party', label: 'Party', query: 'party dance club hits', icon: PartyPopper },
];

export default function HomePage() {
  const isMobile = useIsMobile();
  const profile = useProfileStore();
  const account = useAccountStore(s => s.account);
  const [selectedMood, setSelectedMood] = useState('all');
  const [moodTracks, setMoodTracks] = useState<Track[]>([]);
  const [moodLoading, setMoodLoading] = useState(false);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const userName = account?.name || profile.displayName || '';

  const handleMoodSelect = async (moodId: string) => {
    setSelectedMood(moodId);
    if (moodId === 'all') {
      setMoodTracks([]);
      return;
    }
    const item = MOOD_CHIPS.find(m => m.id === moodId);
    if (item && item.query) {
      setMoodLoading(true);
      try {
        const results = await musicAPI.searchTracks(item.query);
        setMoodTracks(results.slice(0, 16));
      } catch {
        setMoodTracks([]);
      } finally {
        setMoodLoading(false);
      }
    }
  };

  return (
    <motion.div
      className="p-3 sm:p-5 md:p-6 overflow-y-auto scrollbar-thin space-y-7 pb-36"
      initial="hidden"
      animate="show"
      variants={stagger}
    >
      {/* ─── SimpMusic Dynamic Greeting & Mood Filter ─── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase font-bold tracking-widest text-sky-400">SimpMusic Home</p>
            <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-extrabold text-foreground">
              {greeting}{userName ? `, ${userName}` : ''}
            </h1>
          </div>
        </div>

        {/* Horizontal Mood Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {MOOD_CHIPS.map(chip => {
            const isActive = selectedMood === chip.id;
            const Icon = chip.icon;
            return (
              <button
                key={chip.id}
                onClick={() => handleMoodSelect(chip.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-sky-500 to-cyan-400 text-slate-950 shadow-[0_0_14px_rgba(142,202,230,0.4)] scale-105'
                    : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10'
                }`}
              >
                <Icon size={13} className={isActive ? 'text-slate-950' : 'text-sky-400'} />
                <span>{chip.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Mood-Specific Section (When filtered) ─── */}
      <AnimatePresence>
        {selectedMood !== 'all' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-3xl bg-secondary/30 border border-border/50 backdrop-blur-xl space-y-3"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-base text-foreground capitalize flex items-center gap-2">
                <Flame size={18} className="text-amber-400" />
                <span>{selectedMood} Mood Mixes</span>
              </h2>
              <button
                onClick={() => handleMoodSelect('all')}
                className="text-xs text-sky-400 hover:underline"
              >
                Show All
              </button>
            </div>
            {moodLoading ? (
              <div className="space-y-2 py-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : moodTracks.length > 0 ? (
              <TrackList tracks={moodTracks} />
            ) : (
              <p className="text-xs text-muted-foreground py-2">No tracks found for this mood.</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Standard Core Home Experience ─── */}
      <QuickPicks />
      <MadeForYou />
      <TrendingSongs />
      <TopCharts />
      <FeaturedPlaylists />
      <NewReleases />
      <PartyStarters />
      <PopularAlbums />
      <BollywoodHits />
      <AcousticSessions />
      <PunjabiHits />
      <GlobalHits />
      <TopArtists />
      <GenreBrowser />
    </motion.div>
  );
}
