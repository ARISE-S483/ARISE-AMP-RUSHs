import { useRef, useCallback, useState } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { formatTime } from '@/lib/format';

export function ProgressBar({ compact = false, mobileVariant = false }: { compact?: boolean, mobileVariant?: boolean }) {
  const currentTime = usePlayerStore(s => s.currentTime);
  const duration = usePlayerStore(s => s.duration);
  const seek = usePlayerStore(s => s.seek);
  const barRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const displayProgress = isDragging ? dragProgress : progress;

  const calcProgress = useCallback((clientX: number) => {
    if (!barRef.current || !duration) return 0;
    const rect = barRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
  }, [duration]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    e.preventDefault();
    setIsDragging(true);
    const pct = calcProgress(e.clientX);
    setDragProgress(pct);

    const onMove = (ev: MouseEvent) => {
      setDragProgress(calcProgress(ev.clientX));
    };
    const onUp = (ev: MouseEvent) => {
      const finalPct = calcProgress(ev.clientX);
      seek((finalPct / 100) * duration);
      setIsDragging(false);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [duration, seek, calcProgress]);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!duration) return;
    setIsDragging(true);
    const touch = e.touches[0];
    setDragProgress(calcProgress(touch.clientX));

    const onMove = (ev: TouchEvent) => {
      setDragProgress(calcProgress(ev.touches[0].clientX));
    };
    const onEnd = (ev: TouchEvent) => {
      const finalPct = calcProgress(ev.changedTouches[0].clientX);
      seek((finalPct / 100) * duration);
      setIsDragging(false);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
    };
    document.addEventListener('touchmove', onMove, { passive: true });
    document.addEventListener('touchend', onEnd, { once: true });
  }, [duration, seek, calcProgress]);

  if (compact) {
    return (
      <div
        ref={barRef}
        className="h-1 w-full cursor-pointer bg-secondary"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div
          className="h-full bg-foreground transition-[width] duration-100"
          style={{ width: `${displayProgress}%` }}
        />
      </div>
    );
  }

  if (mobileVariant) {
    return (
      <div className="flex flex-col w-full gap-2">
        <div
          ref={barRef}
          className="relative w-full h-[3px] cursor-pointer bg-white/20 rounded-full group"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <div
            className="absolute inset-y-0 left-0 bg-white shadow-[0_0_10px_rgba(255,255,255,0.7)] rounded-full"
            style={{ width: `${displayProgress}%`, transition: isDragging ? 'none' : 'width 100ms' }}
          />
          <div
            className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] transition-opacity ${isDragging ? 'opacity-100' : 'opacity-100'}`}
            style={{ left: `calc(${displayProgress}% - 8px)` }}
          />
        </div>
        <div className="flex justify-between items-center w-full px-0.5">
          <span className="text-[11px] text-white/50 font-medium tracking-wide">
            {formatTime(isDragging ? (dragProgress / 100) * duration : currentTime)}
          </span>
          <span className="text-[11px] text-white/50 font-medium tracking-wide">
            {formatTime(duration)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 w-full">
      <span className="text-xs text-muted-foreground font-mono w-10 text-right">
        {formatTime(isDragging ? (dragProgress / 100) * duration : currentTime)}
      </span>
      <div
        ref={barRef}
        className="relative flex-1 h-1.5 cursor-pointer bg-secondary rounded-full group"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div
          className="absolute inset-y-0 left-0 bg-foreground rounded-full"
          style={{ width: `${displayProgress}%`, transition: isDragging ? 'none' : 'width 100ms' }}
        />
        <div
          className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-foreground rounded-full transition-opacity ${isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
          style={{ left: `calc(${displayProgress}% - 6px)` }}
        />
      </div>
      <span className="text-xs text-muted-foreground font-mono w-10">
        {formatTime(duration)}
      </span>
    </div>
  );
}
