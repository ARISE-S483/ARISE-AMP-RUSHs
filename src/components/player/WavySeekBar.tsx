import React, { useRef, useState, useEffect, useCallback } from 'react';

interface WavySeekBarProps {
  current: number;
  duration: number;
  isPlaying: boolean;
  onSeek: (seconds: number) => void;
  className?: string;
  wavy?: boolean;
}

/**
 * WavySeekBar: Inspired by SimpMusic's M3 Expressive WavySeekBar
 * - Sine wave undulating across the played portion while track is playing.
 * - Flattens to a smooth straight bar while scrubbing or paused.
 */
export function WavySeekBar({
  current,
  duration,
  isPlaying,
  onSeek,
  className = '',
  wavy = true,
}: WavySeekBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragFraction, setDragFraction] = useState<number | null>(null);
  const [hoverFraction, setHoverFraction] = useState<number | null>(null);
  const animFrameRef = useRef<number>(0);
  const wavePhaseRef = useRef<number>(0);

  const displayedFraction = isDragging && dragFraction !== null
    ? dragFraction
    : duration > 0
    ? Math.min(1, Math.max(0, current / duration))
    : 0;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    updateSeekFromEvent(e);
  };

  const updateSeekFromEvent = useCallback((e: React.PointerEvent<HTMLDivElement> | PointerEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const fraction = rect.width > 0 ? x / rect.width : 0;
    setDragFraction(fraction);
  }, []);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    setHoverFraction(rect.width > 0 ? x / rect.width : null);

    if (isDragging) {
      updateSeekFromEvent(e);
    }
  };

  const handlePointerLeave = () => {
    setHoverFraction(null);
  };

  // Commit seek on drag release
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (isDragging && dragFraction !== null) {
        onSeek(dragFraction * duration);
        setIsDragging(false);
        setDragFraction(null);
      }
    };

    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (isDragging) {
        updateSeekFromEvent(e);
      }
    };

    if (isDragging) {
      window.addEventListener('pointerup', handleGlobalPointerUp);
      window.addEventListener('pointermove', handleGlobalPointerMove);
    }
    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointermove', handleGlobalPointerMove);
    };
  }, [isDragging, dragFraction, duration, onSeek, updateSeekFromEvent]);

  // Canvas drawing loop for wavy progress
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let targetAmplitude = isPlaying && !isDragging && wavy ? 3.5 : 0;
    let currentAmplitude = targetAmplitude;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const centerY = height / 2;
      const playedWidth = displayedFraction * width;

      // Smooth amplitude transition
      targetAmplitude = isPlaying && !isDragging && wavy ? 3.5 : 0;
      currentAmplitude += (targetAmplitude - currentAmplitude) * 0.12;
      wavePhaseRef.current += 0.08;

      // 1. Draw Unplayed Track (Right background)
      ctx.beginPath();
      ctx.moveTo(playedWidth, centerY);
      ctx.lineTo(width, centerY);
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.stroke();

      // 2. Draw Played Track (Left foreground)
      if (playedWidth > 0) {
        ctx.beginPath();
        const wavelength = 28;
        const waveFreq = (Math.PI * 2) / wavelength;

        ctx.moveTo(0, centerY);

        for (let x = 0; x <= playedWidth; x += 2) {
          const y = centerY + Math.sin(x * waveFreq - wavePhaseRef.current) * currentAmplitude;
          ctx.lineTo(x, y);
        }

        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        // SimpMusic Primary gradient
        const grad = ctx.createLinearGradient(0, 0, playedWidth, 0);
        grad.addColorStop(0, '#8ECAE6');
        grad.addColorStop(1, '#219EBC');
        ctx.strokeStyle = grad;
        ctx.stroke();

        // 3. Draw Thumb
        ctx.beginPath();
        const thumbY = centerY + Math.sin(playedWidth * waveFreq - wavePhaseRef.current) * currentAmplitude;
        const thumbRadius = isDragging ? 7 : 5.5;
        ctx.arc(playedWidth, thumbY, thumbRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = '#8ECAE6';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [displayedFraction, isPlaying, isDragging, wavy]);

  // Sync canvas size with container
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        canvasRef.current.width = rect.width * window.devicePixelRatio;
        canvasRef.current.height = 24 * window.devicePixelRatio;
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        }
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`relative h-6 w-full cursor-pointer flex items-center select-none ${className}`}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full pointer-events-none"
        style={{ width: '100%', height: '24px' }}
      />
    </div>
  );
}
