import { useState, useEffect, useCallback, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { CustomTitleBar } from './CustomTitleBar';
import { SearchOverlay } from './SearchOverlay';
import { AmbientBackground } from './AmbientBackground';
import { MobileNav } from './MobileNav';
import { PlayerBar } from '../player/PlayerBar';
import { QueuePanel } from '../player/QueuePanel';
import { LyricsPanel } from '../player/LyricsPanel';
import { MiniPlayer } from '../player/MiniPlayer';
import { AudioEngine } from '../player/AudioEngine';
import { usePlayerStore } from '@/stores/playerStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useIsMobile } from '@/hooks/use-mobile';

const BG_MAP: Record<string, { url: string; type: 'image' | 'video' }> = {
  'blue-mountains': { url: '/backgrounds/blue-mountains.jpg', type: 'image' },
  'cosmic-purple': { url: '/backgrounds/cosmic-purple.jpg', type: 'image' },
  'dark-forest': { url: '/backgrounds/dark-forest.jpg', type: 'image' },
  'neon-city': { url: '/backgrounds/neon-city.jpg', type: 'image' },
  'valkyrie': { url: '/backgrounds/fallen-valkyrie.mp4', type: 'video' },
};

export function Layout() {
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const isMobile = useIsMobile();
  const {
    backgroundImage,
    customBackgroundUrl,
    customBackgroundType,
    backgroundOverlayOpacity,
    backgroundBlurAmount,
    glassOpacity,
    glassBlur,
    initCustomBackground,
  } = useSettingsStore();

  const [searchOpen, setSearchOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    initCustomBackground();
  }, [initCustomBackground]);

  useEffect(() => {
    document.documentElement.style.setProperty('--glass-opacity', String((glassOpacity ?? 12) / 100));
    const blurSetting = glassBlur ?? 28;
    document.documentElement.style.setProperty('--glass-panel-blur', `${blurSetting}px`);
  }, [glassOpacity, glassBlur]);

  const bgData = BG_MAP[backgroundImage] || { url: '', type: 'none' };
  const bgUrl = backgroundImage === 'custom' ? customBackgroundUrl : bgData.url;
  const bgType = backgroundImage === 'custom' ? customBackgroundType : bgData.type;
  const showBg = backgroundImage !== 'none' && bgUrl;

  const handleSearchOpen = useCallback(() => setSearchOpen(true), []);
  const handleSearchClose = useCallback(() => setSearchOpen(false), []);

  // Global Ctrl+K / Cmd+K search shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Bottom clearance for player bar
  const bottomPadding = currentTrack
    ? isMobile
      ? 'pb-[calc(var(--player-height,76px)+var(--bottom-nav-height,64px)+16px)]'
      : 'pb-[100px]'
    : isMobile
    ? 'pb-[var(--bottom-nav-height,64px)]'
    : 'pb-6';

  return (
    <div className="h-[100dvh] w-screen flex flex-col bg-[#050811] text-foreground relative overflow-hidden select-none">
      {/* Audio Engine - Local playback core (strictly preserved) */}
      <AudioEngine />

      {/* Top Desktop Title Bar */}
      <CustomTitleBar onSearchOpen={handleSearchOpen} />

      {/* ===== Background Wallpaper Layer ===== */}
      {showBg && bgType === 'image' && (
        <>
          <div
            className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${bgUrl})` }}
          />
          <div
            className="absolute inset-0 z-[1]"
            style={{
              backgroundColor: `hsl(220 10% 4% / ${backgroundOverlayOpacity / 100})`,
              backdropFilter: `blur(${backgroundBlurAmount ?? 4}px)`,
            }}
          />
        </>
      )}

      {showBg && bgType === 'video' && (
        <>
          <video
            ref={videoRef}
            key={bgUrl}
            src={bgUrl}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 z-0 w-full h-full object-cover pointer-events-none"
          />
          <div
            className="absolute inset-0 z-[1]"
            style={{
              backgroundColor: `hsl(220 10% 4% / ${backgroundOverlayOpacity / 100})`,
              backdropFilter: `blur(${backgroundBlurAmount ?? 4}px)`,
            }}
          />
        </>
      )}

      {/* Dynamic Ambient Fluid Glow */}
      <AmbientBackground />

      {/* ===== Body: Sidebar + Main Content Viewport ===== */}
      <div className="flex flex-1 w-full overflow-hidden relative z-10">
        {/* SimpMusic Desktop Sidebar Navigation Rail */}
        {!isMobile && <Sidebar onSearchOpen={handleSearchOpen} />}

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative bg-[#070b16]/40 backdrop-blur-xl">
          <div className={`flex-1 overflow-y-auto scrollbar-thin px-4 md:px-8 py-5 ${bottomPadding}`}>
            <Outlet />
          </div>

          {/* Drawers */}
          <QueuePanel />
          <LyricsPanel />
        </main>
      </div>

      {/* Mobile Nav if on small screens */}
      {isMobile && <MobileNav />}

      {/* Floating SimpMusic Player Bar */}
      <PlayerBar />

      {/* Draggable Desktop Mini Player */}
      <MiniPlayer />

      {/* Quick Search Overlay */}
      <SearchOverlay open={searchOpen} onClose={handleSearchClose} />
    </div>
  );
}
