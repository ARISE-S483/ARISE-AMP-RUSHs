import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Home, Compass, BarChart3, Gift, Music2, Search } from 'lucide-react';
import { motion } from 'framer-motion';

const mobileTabs = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/explore', icon: Compass, label: 'Explore' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/wrapped', icon: Gift, label: 'Wrapped' },
  { to: '/library', icon: Music2, label: 'Library' },
];

interface MobileNavProps {
  onSearchOpen?: () => void;
}

/**
 * SimpMusic Liquid Glass Mobile Bottom Navigation Bar
 * Faithfully recreating LiquidGlassAppBottomNavigationBar & AppBottomNavigationBar from SimpMusic Android/Mobile
 * Features:
 * - Floating glass capsule with backdrop-filter blur & saturation
 * - Sliding indicator pill behind active tab
 * - Dedicated floating Search FAB with SimpMusic glow
 */
export function MobileNav({ onSearchOpen }: MobileNavProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleSearchClick = () => {
    if (onSearchOpen) {
      onSearchOpen();
    } else {
      navigate('/search');
    }
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[60] md:hidden px-3 pointer-events-none flex items-center justify-center gap-2"
      style={{
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)',
      }}
    >
      {/* ─── Main Liquid Glass Capsule ─── */}
      <nav
        className="pointer-events-auto h-[62px] flex-1 max-w-[340px] rounded-full bg-[#0a1022]/85 backdrop-blur-2xl border border-white/15 shadow-[0_12px_36px_rgba(0,0,0,0.6)] flex items-center justify-around px-2 relative select-none"
      >
        {mobileTabs.map(tab => {
          const isActive = location.pathname === tab.to || (tab.to !== '/' && location.pathname.startsWith(tab.to));

          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/'}
              className="relative flex-1 flex flex-col items-center justify-center h-full py-1 group"
            >
              {/* Sliding glowing active pill indicator */}
              {isActive && (
                <motion.div
                  layoutId="liquidGlassMobileIndicator"
                  className="absolute inset-x-1.5 inset-y-1 rounded-full bg-gradient-to-r from-sky-500/25 to-cyan-400/20 border border-sky-400/40 shadow-[0_0_12px_rgba(142,202,230,0.3)]"
                  transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                />
              )}

              <div className="relative z-10 flex flex-col items-center justify-center gap-0.5">
                <tab.icon
                  size={19}
                  strokeWidth={isActive ? 2.3 : 1.7}
                  className={`transition-colors duration-200 ${
                    isActive ? 'text-sky-300 drop-shadow-[0_0_8px_#8ECAE6]' : 'text-white/50 group-hover:text-white/80'
                  }`}
                />
                <span
                  className={`text-[10px] font-medium tracking-tight transition-colors duration-200 ${
                    isActive ? 'text-white font-semibold' : 'text-white/45'
                  }`}
                >
                  {tab.label}
                </span>
              </div>
            </NavLink>
          );
        })}
      </nav>

      {/* ─── SimpMusic Floating Search FAB ─── */}
      <button
        onClick={handleSearchClick}
        className="pointer-events-auto w-[54px] h-[54px] rounded-full bg-gradient-to-tr from-sky-500 to-cyan-400 text-slate-950 flex items-center justify-center shadow-[0_8px_24px_rgba(142,202,230,0.45)] border border-sky-300/40 active:scale-95 transition-transform"
        title="Search"
        aria-label="Search"
      >
        <Search size={22} strokeWidth={2.2} />
      </button>
    </div>
  );
}
