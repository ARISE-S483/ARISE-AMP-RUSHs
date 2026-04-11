import { NavLink } from 'react-router-dom';
import { Home, Music2, AudioWaveform, Settings, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/library', icon: Music2, label: 'Library' },
  { to: '/explore', icon: AudioWaveform, label: 'Explore' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const spring = { type: 'spring' as const, stiffness: 400, damping: 17 };

interface SidebarProps {
  onSearchOpen: () => void;
}

export function Sidebar({ onSearchOpen }: SidebarProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className="fixed left-3 top-[20%] -translate-y-1/2 w-[72px] hidden md:flex flex-col items-center z-30 py-3 gap-1.5 rounded-full border border-border/40 vision-border"
        style={{
          background: 'transparent',
          backdropFilter: 'blur(30px) saturate(120%)',
          WebkitBackdropFilter: 'blur(30px) saturate(120%)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.12), inset 0 1px 0 0 rgba(255,255,255,0.15), inset 0 -1px 0 0 rgba(255,255,255,0.05)',
          // Browser preview adjustments
          position: 'absolute',
          left: '8px',
          top: '324px',
          transform: 'matrix(1, 0, 0, 1, 0, -135)',
          display: 'flex',
          flexFlow: 'column',
          alignItems: 'center',
          gap: '15px',
        }}
      >
        {navItems.map(item => (
          <Tooltip key={item.to}>
            <TooltipTrigger asChild>
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `w-11 h-11 flex items-center justify-center rounded-full transition-all duration-200 ${
                    isActive
                      ? 'bg-white/15 text-foreground shadow-[0_0_12px_rgba(80,160,255,0.3)]'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/8'
                  }`
                }
              >
                <motion.div
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.95 }}
                  transition={spring}
                >
                  <item.icon size={22} strokeWidth={1.5} />
                </motion.div>
              </NavLink>
            </TooltipTrigger>
            <TooltipContent side="right" className="glass border-border/40 text-foreground">
              {item.label}
            </TooltipContent>
          </Tooltip>
        ))}

        {/* Search button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onSearchOpen}
              className="w-11 h-11 flex items-center justify-center rounded-full transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-white/8"
            >
              <motion.div
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.95 }}
                transition={spring}
              >
                <Search size={22} strokeWidth={1.5} />
              </motion.div>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="glass border-border/40 text-foreground">
            Search
          </TooltipContent>
        </Tooltip>
      </aside>
    </TooltipProvider>
  );
}
