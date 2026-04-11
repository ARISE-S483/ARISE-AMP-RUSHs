import { NavLink } from 'react-router-dom';
import { Compass, Search, Library, User, Pause, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '@/stores/playerStore';

const leftItems = [
  { to: '/', icon: Compass, label: 'Discover' },
  { to: '/library', icon: Library, label: 'Library' },
];

const rightItems = [
  { to: '/search', icon: Search, label: 'Search' },
  { to: '/settings', icon: User, label: 'Account' },
];

export function MobileNav() {
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const isPlaying = usePlayerStore(s => s.isPlaying);
  
  // Custom hook to open player - usually done by clicking mini player. 
  // For now it toggles full screen player by faking click on a hidden element, 
  // but better to add a simple store action or just dispatch an event.
  const openPlayer = () => {
    document.dispatchEvent(new CustomEvent('open-fullscreen-player'));
  };

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-[60] md:hidden"
      style={{ 
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        backgroundColor: 'rgba(20, 22, 30, 0.75)',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
      }}
    >
      <div className="flex items-center justify-between h-[70px] px-4 relative">
        {leftItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className="flex-1 flex justify-center pb-2"
          >
            {({ isActive }) => (
              <div className="flex flex-col items-center justify-center gap-1">
                <item.icon 
                  size={24} 
                  strokeWidth={isActive ? 2.5 : 1.5} 
                  className={isActive ? 'text-white' : 'text-white/40'} 
                />
                <span className={`text-[10px] ${isActive ? 'text-white' : 'text-white/40'}`}>
                  {item.label}
                </span>
              </div>
            )}
          </NavLink>
        ))}

        {/* Center Prominent Play Button */}
        <div className="flex-1 flex justify-center pb-8 z-10 relative">
          <div 
            onClick={openPlayer}
            className="absolute -top-10 flex items-center justify-center w-16 h-16 rounded-full shadow-[0_4px_24px_rgba(0,0,0,0.5)] cursor-pointer"
            style={{ 
              background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.0))',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)'
            }}
          >
            {currentTrack ? (
              <img 
                src={currentTrack.thumbnail} 
                alt="" 
                className="absolute inset-0 w-full h-full rounded-full object-cover p-[2px]" 
              />
            ) : (
              <div className="absolute inset-0 w-full h-full rounded-full bg-white/10" />
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full hover:bg-black/20 transition-colors">
              {isPlaying ? (
                <Pause size={24} className="text-white" fill="currentColor" />
              ) : (
                <Play size={24} className="text-white ml-1" fill="currentColor" />
              )}
            </div>
          </div>
        </div>

        {rightItems.map(item => (
           <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className="flex-1 flex justify-center pb-2"
          >
            {({ isActive }) => (
               <div className="flex flex-col items-center justify-center gap-1">
                <item.icon 
                  size={24} 
                  strokeWidth={isActive ? 2.5 : 1.5} 
                  className={isActive ? 'text-white' : 'text-white/40'} 
                />
                <span className={`text-[10px] ${isActive ? 'text-white' : 'text-white/40'}`}>
                  {item.label}
                </span>
              </div>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
