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
           <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-100 to-white pl-1">Discover</h1>
              <Search className="text-white/70" size={24} />
           </div>
           
           <div className="flex gap-5 overflow-x-auto scrollbar-none pb-1 text-sm font-medium whitespace-nowrap pl-1">
              <span className="text-white border-b-2 border-white pb-1 tracking-wide">Film Score</span>
              <span className="text-white/50 tracking-wide">Musical Theatre</span>
              <span className="text-white/50 tracking-wide">Video Games</span>
              <span className="text-white/50 tracking-wide">Classical</span>
              <span className="text-white/50 tracking-wide">Pop</span>
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
