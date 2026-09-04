import { useEffect, useRef, useCallback } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { musicAPI } from '@/api/musicAPI';
import { toast } from '@/hooks/use-toast';

export function AudioEngine() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const unlockedRef = useRef(false);
  const retryCountRef = useRef(0);
  const currentTrackIdRef = useRef<string | null>(null);
  const setAudioElement = usePlayerStore(s => s.setAudioElement);
  const setCurrentTime = usePlayerStore(s => s.setCurrentTime);
  const setDuration = usePlayerStore(s => s.setDuration);
  const next = usePlayerStore(s => s.next);

  // Reset retry count whenever track changes
  useEffect(() => {
    const unsub = usePlayerStore.subscribe(state => {
      const id = state.currentTrack?.id ? String(state.currentTrack.id) : null;
      if (id !== currentTrackIdRef.current) {
        currentTrackIdRef.current = id;
        retryCountRef.current = 0;
      }
    });
    return unsub;
  }, []);

  // Unlock audio context on first user gesture (required by browsers)
  const unlockAudio = useCallback(() => {
    if (unlockedRef.current) return;
    unlockedRef.current = true;
    const store = usePlayerStore.getState();
    if (!store.audioContext) {
      store.initAudioContext();
    } else if (store.audioContext.state === 'suspended') {
      store.audioContext.resume().catch(() => {});
    }
  }, []);

  // ─── Audio Error Recovery ───
  // When a stream URL fails (403, network error, decode error), this fires.
  // We attempt to find a fallback stream URL for the same track before skipping.
  const handleAudioError = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    const src = audio.src;
    // Ignore errors from empty or data src
    if (!src || src.startsWith('data:')) return;

    const store = usePlayerStore.getState();
    const track = store.currentTrack;
    if (!track) return;

    const MAX_RETRIES = 3;

    if (retryCountRef.current < MAX_RETRIES) {
      retryCountRef.current++;
      const retryNum = retryCountRef.current;
      console.warn(
        `[AudioEngine] Stream error for "${track.title}" (retry ${retryNum}/${MAX_RETRIES}). src: ${src.slice(0, 80)}`
      );

      try {
        const fallbackTrack = {
          ...track,
          streamUrl: undefined,
          videoId: retryNum >= 2 ? undefined : track.videoId,
        };

        const fallbackUrl = await musicAPI.getStreamUrl(fallbackTrack, 'HIGH');
        if (fallbackUrl && fallbackUrl !== src) {
          console.info(`[AudioEngine] Retry ${retryNum} — switching to fallback URL`);
          audio.pause();
          audio.src = fallbackUrl;
          audio.volume = store.isMuted ? 0 : store.volume;
          audio.load();
          await audio.play();
          usePlayerStore.setState({ isPlaying: true, isLoading: false });
          return;
        }
      } catch (err) {
        console.warn(`[AudioEngine] Fallback fetch failed on retry ${retryNum}:`, err);
      }
      return;
    }

    // All retries exhausted — skip to next track
    console.error(`[AudioEngine] All ${MAX_RETRIES} retries exhausted for "${track.title}". Skipping.`);
    toast({
      title: 'Playback failed',
      description: `Could not stream "${track.title}" from YouTube. Skipping...`,
      variant: 'destructive',
    });
    usePlayerStore.setState({ isLoading: false, isPlaying: false });
    retryCountRef.current = 0;
    setTimeout(() => next(), 800);
  }, [next]);

  useEffect(() => {
    if (audioRef.current) {
      setAudioElement(audioRef.current);
    }

    // Listen for first user interaction to resume audio context
    const events = ['click', 'touchstart', 'keydown'] as const;
    events.forEach(e => document.addEventListener(e, unlockAudio, { once: true, passive: true }));
    return () => {
      events.forEach(e => document.removeEventListener(e, unlockAudio));
    };
  }, [setAudioElement, unlockAudio]);

  return (
    <audio
      ref={audioRef}
      preload="auto"
      playsInline
      crossOrigin="anonymous"
      onPlay={() => usePlayerStore.setState({ isPlaying: true })}
      onPause={() => usePlayerStore.setState({ isPlaying: false })}
      onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
      onDurationChange={(e) => setDuration(e.currentTarget.duration || 0)}
      onEnded={next}
      onError={handleAudioError}
    />
  );
}
