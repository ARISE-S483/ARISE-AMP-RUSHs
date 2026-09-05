import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Search, Maximize2, Minimize2, Radio, Sparkles, X, Minus, Square, Settings } from 'lucide-react';
import { SimpLogo } from '@/components/common/SimpLogo';
import { usePlayerStore } from '@/stores/playerStore';
import { useDeviceType } from '@/hooks/use-mobile';
import { AccountMenu } from './AccountMenu';

interface CustomTitleBarProps {
  onSearchOpen: () => void;
}

export function CustomTitleBar({ onSearchOpen }: CustomTitleBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const deviceType = useDeviceType();
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <header className="h-11 w-full bg-[#080d1a]/90 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-3 select-none z-40 shrink-0 text-white/90">
      {/* LEFT: Branding + Navigation History */}
      <div className="flex items-center gap-2 sm:gap-3 sm:min-w-[200px]">
        {/* SimpMusic Brand */}
        <div
          onClick={() => navigate('/')}
          className="flex items-center gap-2 cursor-pointer group px-1 py-1 rounded-lg hover:bg-white/5 transition-colors"
        >
          <SimpLogo size={24} />
          <div className="flex items-center gap-1.5">
            <span className="font-bold tracking-tight text-sm text-foreground bg-gradient-to-r from-sky-300 via-cyan-200 to-indigo-300 bg-clip-text text-transparent">
              SimpMusic
            </span>
            <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.2 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30 capitalize">
              {deviceType}
            </span>
          </div>
        </div>

        {/* History Navigation - Tablet & Desktop */}
        <div className="hidden sm:flex items-center gap-0.5 ml-1">
          <button
            onClick={() => window.history.back()}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors disabled:opacity-40"
            title="Back"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => window.history.forward()}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors disabled:opacity-40"
            title="Forward"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* CENTER: Quick Search Input Pill (Tablet & Desktop) / Mobile Search Button */}
      <div className="flex-1 max-w-md mx-2 sm:mx-4">
        {/* Mobile search button */}
        <button
          onClick={onSearchOpen}
          className="sm:hidden w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-sky-400 ml-auto"
          title="Search"
          aria-label="Search"
        >
          <Search size={15} />
        </button>

        {/* Tablet & Desktop search bar */}
        <button
          onClick={onSearchOpen}
          className="hidden sm:flex w-full h-8 px-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-all duration-200 group shadow-inner"
        >
          <div className="flex items-center gap-2 truncate">
            <Search size={14} className="text-sky-400 group-hover:text-sky-300 transition-colors" />
            <span className="truncate">Search songs, artists, podcasts, albums...</span>
          </div>
          <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-medium rounded bg-white/10 text-white/60 border border-white/10">
            <span>Ctrl</span><span>K</span>
          </kbd>
        </button>
      </div>

      {/* RIGHT: Status Badges, Quality Badge & Window Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 sm:min-w-[200px] justify-end">
        {/* Audio Stream Quality Badge (Tablet & Desktop) */}
        <div
          className="hidden md:flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-400/20 text-sky-300 text-[11px] font-medium"
          title="High Quality YouTube Music Audio Stream"
        >
          <Sparkles size={11} className="text-sky-400" />
          <span>256kbps Opus</span>
        </div>

        {/* Listen Together Quick Pill (Tablet & Desktop) */}
        <button
          onClick={() => navigate('/listen-together')}
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
            location.pathname === '/listen-together'
              ? 'bg-primary/20 text-primary border-primary/40'
              : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border-white/10'
          }`}
          title="SimpMusic Listen Together"
        >
          <Radio size={12} className="text-pink-400 animate-pulse" />
          <span>Sync Room</span>
        </button>

        {/* Account Menu */}
        <AccountMenu />

        {/* Quick Settings Action (Mobile, Tablet, Desktop) */}
        <button
          onClick={() => navigate('/settings')}
          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
            location.pathname === '/settings'
              ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40 shadow-[0_0_8px_rgba(142,202,230,0.3)]'
              : 'hover:bg-white/10 text-white/70 hover:text-white'
          }`}
          title="SimpMusic Settings"
          aria-label="Settings"
        >
          <Settings size={15} />
        </button>

        {/* Fullscreen Toggle (Tablet & Desktop) */}
        <button
          onClick={toggleFullscreen}
          className="hidden sm:flex w-7 h-7 items-center justify-center rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors ml-0.5"
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>

        {/* Desktop Window Controls Decoration */}
        <div className="hidden lg:flex items-center gap-1 pl-2 border-l border-white/10 ml-1">
          <button
            onClick={() => {}}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            title="Minimize"
          >
            <Minus size={13} />
          </button>
          <button
            onClick={toggleFullscreen}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            title="Maximize"
          >
            <Square size={11} />
          </button>
          <button
            onClick={() => {}}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-500/80 text-white/60 hover:text-white transition-colors"
            title="Close"
          >
            <X size={13} />
          </button>
        </div>
      </div>
    </header>
  );
}
