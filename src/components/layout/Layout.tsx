import { useState, useEffect, useCallback, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { SearchOverlay } from './SearchOverlay';
import { AmbientBackground } from './AmbientBackground';
import { MobileNav } from './MobileNav';
import { PlayerBar } from '../player/PlayerBar';
import { QueuePanel } from '../player/QueuePanel';
import { LyricsPanel } from '../player/LyricsPanel';
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
  const { backgroundImage, customBackgroundUrl, customBackgroundType, backgroundOverlayOpacity, backgroundBlurAmount, glassOpacity, glassBlur, initCustomBackground } = useSettingsStore();
  const [searchOpen, setSearchOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    initCustomBackground();
  }, [initCustomBackground]);

  useEffect(() => {
    document.documentElement.style.setProperty('--glass-opacity', String((glassOpacity ?? 10) / 100));
    
    // Scale blur (0 to 100) to actual pixels
    const blurSetting = glassBlur ?? 30;
    const heavyBlur = Math.min(100, blurSetting * 3.33);
    
    document.documentElement.style.setProperty('--glass-panel-blur', `${blurSetting}px`);
    document.documentElement.style.setProperty('--glass-blur', `${heavyBlur}px`);
  }, [glassOpacity, glassBlur]);

  const bgData = BG_MAP[backgroundImage] || { url: '', type: 'none' };
  const bgUrl = backgroundImage === 'custom' ? customBackgroundUrl : bgData.url;
  const bgType = backgroundImage === 'custom' ? customBackgroundType : bgData.type;
  const showBg = backgroundImage !== 'none' && bgUrl;

  const bottomPadding = currentTrack
    ? isMobile ? 'pb-[calc(var(--player-height)+var(--bottom-nav-height)+16px)]' : 'pb-[calc(var(--player-height)+12px)]'
    : isMobile ? 'pb-[var(--bottom-nav-height)]' : '';

  const handleSearchOpen = useCallback(() => setSearchOpen(true), []);
  const handleSearchClose = useCallback(() => setSearchOpen(false), []);

  // Cmd+K global shortcut
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

  // Force background video playback on mount/url change
  useEffect(() => {
    if (showBg && bgType === 'video' && videoRef.current) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.warn('Background video autoplay prevented:', error);
        });
      }
    }
  }, [showBg, bgType, bgUrl]);

  return (
    <div className="h-[100dvh] flex items-center justify-center relative overflow-hidden">
      <AudioEngine />

      {/* ===== Background layer (z-0) — rendered FIRST so it's behind everything ===== */}
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
              backdropFilter: `blur(${backgroundBlurAmount ?? 2}px)`,
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
              backdropFilter: `blur(${backgroundBlurAmount ?? 2}px)`,
            }}
          />
        </>
      )}

      {/* Ambient background (z-[2]) */}
      <AmbientBackground />

      {/* Sidebar floats outside the glass panel (z-[5]) */}
      {!isMobile && <Sidebar onSearchOpen={handleSearchOpen} />}

      {/* Floating glass panel (z-10) */}
      <div
        className={`relative z-10 flex flex-col glass-panel vision-border ${
          isMobile ? 'w-full h-full rounded-none' : 'w-[75%] h-[calc(100%-24px-var(--player-height)-12px)] rounded-2xl ml-auto mr-3'
        }`}
        style={
          isMobile
            ? undefined
            : {
                paddingLeft: 0,
                paddingRight: 0,
                position: 'absolute',
                left: 130,
                top: 15,
              }
        }
      >
        <div className="flex flex-1 overflow-hidden">
          <main
            className="flex-1 flex flex-col overflow-hidden"
          >
            <div className={`flex-1 overflow-y-auto scrollbar-thin ${bottomPadding}`}>
              <Outlet />
            </div>
          </main>
        </div>
        <QueuePanel />
        <LyricsPanel />
      </div>

      {/* Mobile Nav outside glass panel so it anchors to viewport bottom */}
      {isMobile && <MobileNav />}

      {/* Floating player outside glass panel (z-[55]) */}
      <PlayerBar />

      {/* Search overlay (z-50) */}
      <SearchOverlay open={searchOpen} onClose={handleSearchClose} />
    </div>
  );
}
