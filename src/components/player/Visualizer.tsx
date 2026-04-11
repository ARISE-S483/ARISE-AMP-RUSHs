import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { useSettingsStore } from '@/stores/settingsStore';
import type { VisualizerStyle } from '@/stores/settingsStore';

function drawBars(ctx: CanvasRenderingContext2D, dataArray: Uint8Array, w: number, h: number) {
  const barCount = 48;
  const barWidth = w / barCount;
  const step = Math.floor(dataArray.length / barCount);
  for (let i = 0; i < barCount; i++) {
    const value = dataArray[i * step] / 255;
    const barHeight = value * h * 0.8;
    const alpha = 0.3 + value * 0.7;
    ctx.fillStyle = `rgba(245, 245, 245, ${alpha})`;
    const x = i * barWidth + barWidth * 0.15;
    const bw = barWidth * 0.7;
    ctx.beginPath();
    ctx.roundRect(x, h - barHeight, bw, barHeight, 2);
    ctx.fill();
  }
}

function drawWave(ctx: CanvasRenderingContext2D, dataArray: Uint8Array, w: number, h: number) {
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(245, 245, 245, 0.6)';
  ctx.beginPath();
  const sliceWidth = w / dataArray.length;
  let x = 0;
  for (let i = 0; i < dataArray.length; i++) {
    const v = dataArray[i] / 255;
    const y = h - v * h * 0.8;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
    x += sliceWidth;
  }
  ctx.stroke();

  // Fill underneath
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fillStyle = 'rgba(140, 80, 255, 0.08)';
  ctx.fill();
}

function drawCircular(ctx: CanvasRenderingContext2D, dataArray: Uint8Array, w: number, h: number) {
  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.min(cx, cy) * 0.5;
  const barCount = 64;
  const step = Math.floor(dataArray.length / barCount);

  for (let i = 0; i < barCount; i++) {
    const value = dataArray[i * step] / 255;
    const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
    const barLength = value * radius * 0.8;
    const x1 = cx + Math.cos(angle) * radius;
    const y1 = cy + Math.sin(angle) * radius;
    const x2 = cx + Math.cos(angle) * (radius + barLength);
    const y2 = cy + Math.sin(angle) * (radius + barLength);

    const alpha = 0.3 + value * 0.7;
    ctx.strokeStyle = `rgba(140, 80, 255, ${alpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // Inner circle glow
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.95, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(140, 80, 255, 0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

const DRAW_MAP: Record<string, typeof drawBars> = {
  bars: drawBars,
  wave: drawWave,
  circular: drawCircular,
};

export function Visualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserNode = usePlayerStore(s => s.analyserNode);
  const isPlaying = usePlayerStore(s => s.isPlaying);
  const style = useSettingsStore(s => s.visualizerStyle);
  const dimming = useSettingsStore(s => s.visualizerDimming);
  const animRef = useRef<number>(0);

  useEffect(() => {
    if (!analyserNode || !canvasRef.current || !isPlaying || style === 'none') return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const drawFn = DRAW_MAP[style] || drawBars;

    const draw = () => {
      animRef.current = requestAnimationFrame(draw);
      analyserNode.getByteFrequencyData(dataArray);
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawFn(ctx, dataArray, canvas.width, canvas.height);
    };

    draw();
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [analyserNode, isPlaying, style]);

  if (style === 'none') return null;

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-16 ${dimming ? 'opacity-30' : 'opacity-60'}`}
      style={{ imageRendering: 'auto' }}
    />
  );
}
