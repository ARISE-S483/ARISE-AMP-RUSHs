import { useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '@/stores/playerStore';

interface AmbientColors {
  primary: string;
  secondary: string;
  tertiary: string;
}

const DEFAULT_COLORS: AmbientColors = {
  primary: 'hsl(220, 15%, 8%)',
  secondary: 'hsl(260, 10%, 6%)',
  tertiary: 'hsl(200, 12%, 5%)',
};

function extractColors(img: HTMLImageElement): AmbientColors {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return DEFAULT_COLORS;

  canvas.width = 64;
  canvas.height = 64;
  ctx.drawImage(img, 0, 0, 64, 64);

  const data = ctx.getImageData(0, 0, 64, 64).data;

  // Sample regions: top-left, center, bottom-right
  const regions = [
    { x: 8, y: 8 },
    { x: 32, y: 32 },
    { x: 56, y: 56 },
  ];

  const colors = regions.map(({ x, y }) => {
    const i = (y * 64 + x) * 4;
    return { r: data[i], g: data[i + 1], b: data[i + 2] };
  });

  return {
    primary: `rgb(${colors[0].r}, ${colors[0].g}, ${colors[0].b})`,
    secondary: `rgb(${colors[1].r}, ${colors[1].g}, ${colors[1].b})`,
    tertiary: `rgb(${colors[2].r}, ${colors[2].g}, ${colors[2].b})`,
  };
}

export function AmbientBackground() {
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const [colors, setColors] = useState<AmbientColors>(DEFAULT_COLORS);
  const lastUrl = useRef('');

  useEffect(() => {
    const url = currentTrack?.thumbnail;
    if (!url || url === lastUrl.current) return;
    lastUrl.current = url;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setColors(extractColors(img));
    img.onerror = () => setColors(DEFAULT_COLORS);
    img.src = url;
  }, [currentTrack?.thumbnail]);

  return (
    <div
      className="fixed inset-0 z-0 overflow-hidden pointer-events-none"
      style={{ position: 'absolute', textAlign: 'left' }}
    >
      <div
        className="absolute w-[60vw] h-[60vw] rounded-full opacity-30 blur-[120px]"
        style={{
          background: colors.primary,
          top: '-10%',
          left: '-10%',
          transition: 'background 2s ease',
        }}
      />
      <div
        className="absolute w-[50vw] h-[50vw] rounded-full opacity-25 blur-[100px]"
        style={{
          background: colors.secondary,
          bottom: '-15%',
          right: '-5%',
          transition: 'background 2s ease',
        }}
      />
      <div
        className="absolute w-[40vw] h-[40vw] rounded-full opacity-20 blur-[80px]"
        style={{
          background: colors.tertiary,
          top: '40%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          transition: 'background 2s ease',
        }}
      />
    </div>
  );
}
