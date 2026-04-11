import { useRef, useCallback, useState, forwardRef } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { Volume2, VolumeX, Volume1 } from 'lucide-react';

export const VolumeControl = forwardRef<HTMLDivElement, { light?: boolean }>(function VolumeControl({ light }, ref) {
  const volume = usePlayerStore(s => s.volume);
  const isMuted = usePlayerStore(s => s.isMuted);
  const setVolume = usePlayerStore(s => s.setVolume);
  const toggleMute = usePlayerStore(s => s.toggleMute);
  const barRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragVolume, setDragVolume] = useState(0);

  const effectiveVolume = isMuted ? 0 : (isDragging ? dragVolume : volume);

  const calcVol = useCallback((clientX: number) => {
    if (!barRef.current) return 0;
    const rect = barRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    const vol = calcVol(e.clientX);
    setDragVolume(vol);
    setVolume(vol);

    const onMove = (ev: MouseEvent) => {
      const v = calcVol(ev.clientX);
      setDragVolume(v);
      setVolume(v);
    };
    const onUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [setVolume, calcVol]);

  const VolumeIcon = isMuted || effectiveVolume === 0
    ? VolumeX
    : effectiveVolume < 0.5
    ? Volume1
    : Volume2;

  const iconClass = light ? 'text-gray-400 hover:text-gray-600 transition-colors' : 'text-muted-foreground hover:text-foreground transition-colors';
  const trackClass = light ? 'w-20 h-1 bg-gray-200 rounded-full cursor-pointer group relative' : 'w-20 h-1 bg-secondary rounded-full cursor-pointer group relative';
  const fillClass = light ? 'absolute inset-y-0 left-0 bg-gray-500 rounded-full' : 'absolute inset-y-0 left-0 bg-foreground rounded-full';
  const thumbClass = light
    ? `absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-gray-500 rounded-full transition-opacity ${isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`
    : `absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-foreground rounded-full transition-opacity ${isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`;

  return (
    <div ref={ref} className="flex items-center gap-2">
      <button onClick={toggleMute} className={iconClass}>
        <VolumeIcon size={18} />
      </button>
      <div
        ref={barRef}
        className={trackClass}
        onMouseDown={handleMouseDown}
      >
        <div
          className={fillClass}
          style={{ width: `${effectiveVolume * 100}%` }}
        />
        <div
          className={thumbClass}
          style={{ left: `calc(${effectiveVolume * 100}% - 5px)` }}
        />
      </div>
    </div>
  );
});
