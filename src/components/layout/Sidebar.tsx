import { NavLink } from 'react-router-dom';
import { Home, Compass, BarChart3, Gift, Music2, Users, Settings, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/explore', icon: Compass, label: 'Explore & Moods' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/wrapped', icon: Gift, label: 'Wrapped' },
  { to: '/library', icon: Music2, label: 'Library' },
  { to: '/listen-together', icon: Users, label: 'Listen Together' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const spring = { type: 'spring' as const, stiffness: 450, damping: 24 };

interface SidebarProps {
  onSearchOpen: () => void;
}

export function Sidebar({ onSearchOpen }: SidebarProps) {
  return (
    <TooltipProvider delayDuration={150}>
      <aside
        className="w-[68px] md:w-[72px] h-full flex flex-col items-center py-4 gap-2 bg-[#090e1d]/75 backdrop-blur-2xl border-r border-white/10 shrink-0 z-30 select-none"
        style={{
          boxShadow: '4px 0 24px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* Navigation items */}
        <div className="flex-1 flex flex-col items-center gap-2.5 w-full">
          {navItems.map(item => (
            <Tooltip key={item.to}>
              <TooltipTrigger asChild>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `relative w-11 h-11 flex flex-col items-center justify-center rounded-2xl transition-all duration-200 group ${
                      isActive
                        ? 'text-sky-300 bg-sky-500/20 shadow-[0_0_16px_rgba(142,202,230,0.35)] border border-sky-400/40'
                        : 'text-white/60 hover:text-white hover:bg-white/8'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {/* Active indicator bar */}
                      {isActive && (
                        <motion.div
                          layoutId="activeNavPill"
                          className="absolute -left-[14px] w-1 h-5 rounded-r-full bg-sky-400 shadow-[0_0_8px_#8ECAE6]"
                          transition={spring}
                        />
                      )}
                      <motion.div
                        whileHover={{ scale: 1.12 }}
                        whileTap={{ scale: 0.92 }}
                        transition={spring}
                      >
                        <item.icon size={20} strokeWidth={isActive ? 2.2 : 1.7} />
                      </motion.div>
                    </>
                  )}
                </NavLink>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-[#10172a] text-white border-white/15 shadow-xl font-medium text-xs">
                {item.label}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Bottom Search shortcut button */}
        <div className="pt-2 border-t border-white/10 w-full flex flex-col items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onSearchOpen}
                className="w-11 h-11 flex items-center justify-center rounded-2xl text-white/60 hover:text-white hover:bg-white/10 transition-all duration-200"
                aria-label="Search"
              >
                <motion.div
                  whileHover={{ scale: 1.12 }}
                  whileTap={{ scale: 0.92 }}
                  transition={spring}
                >
                  <Search size={20} strokeWidth={1.7} />
                </motion.div>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-[#10172a] text-white border-white/15 shadow-xl font-medium text-xs">
              Quick Search (Ctrl+K)
            </TooltipContent>
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}
