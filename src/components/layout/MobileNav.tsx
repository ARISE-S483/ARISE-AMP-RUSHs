import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, Library, Compass } from 'lucide-react';
import { motion } from 'framer-motion';

interface MobileNavProps {
  onSearchOpen?: () => void;
}

/**
 * SimpMusic Material 3 Expressive Bottom Navigation Bar
 * Faithfully matches SimpMusic Android UI from user screenshots:
 * - 3 Primary Destinations: Home, Search, Library
 * - Material 3 active pill indicator container
 * - Edge-to-edge AMOLED black backdrop with safe-area padding
 * - Quick explore/more shortcut drawer access
 */
export function MobileNav({ onSearchOpen }: MobileNavProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    {
      to: '/',
      label: 'Home',
      icon: Home,
      isActive: location.pathname === '/',
    },
    {
      to: '/search',
      label: 'Search',
      icon: Search,
      isActive: location.pathname.startsWith('/search'),
      onClick: (e: React.MouseEvent) => {
        if (onSearchOpen) {
          e.preventDefault();
          onSearchOpen();
        }
      },
    },
    {
      to: '/library',
      label: 'Library',
      icon: Library,
      isActive:
        location.pathname.startsWith('/library') ||
        location.pathname.startsWith('/playlist') ||
        location.pathname.startsWith('/album'),
    },
  ];

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-black/95 backdrop-blur-2xl border-t border-white/10 select-none"
      style={{
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 4px)',
      }}
    >
      <nav className="h-[62px] w-full max-w-md mx-auto flex items-center justify-around px-4 relative">
        {navItems.map(item => {
          const active = item.isActive;

          return (
            <NavLink
              key={item.label}
              to={item.to}
              onClick={item.onClick}
              className="flex-1 flex flex-col items-center justify-center py-1 group relative transition-transform active:scale-95"
            >
              <div className="relative flex items-center justify-center">
                {/* Material 3 Rounded Pill Indicator */}
                {active && (
                  <motion.div
                    layoutId="m3NavPill"
                    className="absolute inset-x-[-12px] inset-y-[-3px] rounded-full bg-[#2d3a4d] border border-white/15 shadow-sm"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <item.icon
                  size={21}
                  className={`relative z-10 transition-colors duration-200 ${
                    active ? 'text-white' : 'text-white/60 group-hover:text-white/90'
                  }`}
                  strokeWidth={active ? 2.4 : 1.8}
                />
              </div>

              <span
                className={`text-[11px] font-medium tracking-tight mt-1 transition-colors duration-200 relative z-10 ${
                  active ? 'text-white font-semibold' : 'text-white/50 group-hover:text-white/80'
                }`}
              >
                {item.label}
              </span>
            </NavLink>
          );
        })}

        {/* Quick Explore / Charts link for mobile */}
        <button
          onClick={() => navigate('/explore')}
          className={`flex flex-col items-center justify-center py-1 group transition-transform active:scale-95 ${
            location.pathname.startsWith('/explore') || location.pathname.startsWith('/charts')
              ? 'text-white'
              : 'text-white/50 hover:text-white/80'
          }`}
          title="Explore & Charts"
        >
          <div className="relative flex items-center justify-center">
            {(location.pathname.startsWith('/explore') || location.pathname.startsWith('/charts')) && (
              <motion.div
                layoutId="m3NavPill"
                className="absolute inset-x-[-12px] inset-y-[-3px] rounded-full bg-[#2d3a4d] border border-white/15 shadow-sm"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <Compass size={21} className="relative z-10" strokeWidth={1.8} />
          </div>
          <span className="text-[11px] font-medium tracking-tight mt-1 relative z-10">
            Explore
          </span>
        </button>
      </nav>
    </div>
  );
}
