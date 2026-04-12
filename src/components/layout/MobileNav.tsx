import { NavLink } from 'react-router-dom';
import { Compass, Search, Library, User } from 'lucide-react';

const leftItems = [
  { to: '/', icon: Compass, label: 'Discover' },
  { to: '/library', icon: Library, label: 'Library' },
];

const rightItems = [
  { to: '/search', icon: Search, label: 'Search' },
  { to: '/settings', icon: User, label: 'Account' },
];

const navItems = [
  ...leftItems,
  ...rightItems
];

export function MobileNav() {
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
      <div className="flex items-center justify-around h-[64px] px-2">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className="flex-1 flex justify-center"
          >
            {({ isActive }) => (
              <div className="flex flex-col items-center justify-center gap-1.5 py-2">
                <item.icon 
                  size={24} 
                  strokeWidth={isActive ? 2.5 : 2} 
                  className={isActive ? 'text-white' : 'text-white/40'} 
                />
                <span className={`text-[10px] font-medium ${isActive ? 'text-white' : 'text-white/40'}`}>
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
