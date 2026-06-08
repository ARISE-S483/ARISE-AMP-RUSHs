import { motion } from 'framer-motion';
import { QuickPicks } from '@/components/home/QuickPicks';
import { FeaturedPlaylists } from '@/components/home/FeaturedPlaylists';
import { GenreBrowser } from '@/components/home/GenreBrowser';
import { useIsMobile } from '@/hooks/use-mobile';
import { Search } from 'lucide-react';
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

export default function HomePage() {
  const isMobile = useIsMobile();

  return (
    <motion.div
      className="p-4 md:p-6 overflow-y-auto scrollbar-thin space-y-8 pb-32"
      initial="hidden"
      animate="show"
      variants={stagger}
    >
      {isMobile && (
        <div className="flex flex-col gap-5 mb-2 mt-2">
           <div className="flex gap-5 overflow-x-auto scrollbar-none pb-1 text-sm font-medium whitespace-nowrap pl-1">
              <span className="text-white border-b-2 border-white pb-1 tracking-wide">Bollywood Hits</span>
              <span className="text-white/50 tracking-wide">New Releases</span>
              <span className="text-white/50 tracking-wide">Top Charts</span>
              <span className="text-white/50 tracking-wide">Discovery</span>
           </div>
        </div>
      )}

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
