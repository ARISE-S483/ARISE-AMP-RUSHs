// Player store - manages audio playback, queue, shuffle, repeat, radio, preload, sleep timer
import { create } from 'zustand';
import { equalizer } from '../api/equalizer';
// hifiAPI no longer used directly — streaming goes through musicAPI → monochrome bridge
import { musicAPI } from '@/api/musicAPI';
import { lastfmClient } from '@/api/lastfmClient';
import { ytifyClient } from '@/api/ytifyClient';
import type { Track, RepeatMode } from '@/api/types';
import { useSettingsStore } from './settingsStore';
import { toast } from '@/hooks/use-toast';

const QUEUE_STORAGE_KEY = 'melodies_queue_state';

interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  queue: Track[];
  queueIndex: number;
  originalQueue: Track[];
  isShuffled: boolean;
  repeatMode: RepeatMode;
  isQueueOpen: boolean;
  isLyricsOpen: boolean;
  isMiniPlayerOpen: boolean;
  isVisualizerActive: boolean;
  isLoading: boolean;
  audioElement: HTMLAudioElement | null;
  audioContext: AudioContext | null;
  analyserNode: AnalyserNode | null;
  // Radio mode
  isRadioEnabled: boolean;
  radioSeeds: Track[];
  isFetchingRadio: boolean;
  // Sleep timer
  sleepTimerEndTime: number | null;
  sleepTimerRemaining: number | null;
  // Actions
  setAudioElement: (el: HTMLAudioElement) => void;
  initAudioContext: () => void;
  play: (track: Track, queue?: Track[], startIndex?: number) => Promise<void>;
  togglePlayPause: () => void;
  pause: () => void;
  resume: () => void;
  next: () => void;
  previous: () => void;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  setRepeatMode: (mode: RepeatMode) => void;
  cycleRepeat: () => void;
  addToQueue: (track: Track) => void;
  addNextToQueue: (track: Track) => void;
  addSimilarToQueue: (track?: Track) => Promise<void>;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  reorderQueue: (from: number, to: number) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (dur: number) => void;
  toggleQueue: () => void;
  toggleLyrics: () => void;
  toggleMiniPlayer: () => void;
  setMiniPlayerOpen: (open: boolean) => void;
  toggleVisualizer: () => void;
  // Radio
  enableRadio: (seeds?: Track[]) => void;
  disableRadio: () => void;
  toggleRadio: () => void;
  // Sleep timer
  setSleepTimer: (minutes: number) => void;
  clearSleepTimer: () => void;
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Playback sequence to prevent race conditions
let playbackSequence = 0;

function waitForCanPlay(audio: HTMLAudioElement, timeoutMs = 8000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (audio.readyState >= 3) { resolve(); return; }
    const onCanPlay = () => { cleanup(); resolve(); };
    const onError = () => { cleanup(); reject(new Error('Audio load error')); };
    const timer = setTimeout(() => { cleanup(); resolve(); }, timeoutMs);
    const cleanup = () => {
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('error', onError);
      clearTimeout(timer);
    };
    audio.addEventListener('canplay', onCanPlay, { once: true });
    audio.addEventListener('error', onError, { once: true });
  });
}

async function safePlay(audio: HTMLAudioElement): Promise<void> {
  try {
    const store = usePlayerStore.getState();
    if (store.audioContext && store.audioContext.state === 'suspended') {
      await store.audioContext.resume().catch(() => {});
    }
    await audio.play();
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'NotAllowedError') {
      console.warn('Autoplay blocked, waiting for user gesture');
      return;
    }
    if (err instanceof Error && err.name === 'AbortError') return;
    throw err;
  }
}

// Queue persistence
function saveQueueState(state: Partial<PlayerState>) {
  try {
    const data = {
      queue: state.queue?.slice(0, 100),
      queueIndex: state.queueIndex,
      currentTrack: state.currentTrack,
      isShuffled: state.isShuffled,
      repeatMode: state.repeatMode,
      originalQueue: state.originalQueue?.slice(0, 100),
      isRadioEnabled: state.isRadioEnabled,
    };
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

function loadQueueState(): Partial<PlayerState> {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw);
    return {
      queue: data.queue || [],
      queueIndex: data.queueIndex ?? -1,
      currentTrack: data.currentTrack || null,
      isShuffled: data.isShuffled || false,
      repeatMode: data.repeatMode || 'off',
      originalQueue: data.originalQueue || [],
      isRadioEnabled: data.isRadioEnabled || false,
    };
  } catch { return {}; }
}

const restored = loadQueueState();

// Preload cache
const preloadCache = new Map<string, string>();
let preloadAbortController: AbortController | null = null;

async function preloadNextTracks(queue: Track[], queueIndex: number) {
  if (preloadAbortController) preloadAbortController.abort();
  preloadAbortController = new AbortController();

  const { audioQuality } = useSettingsStore.getState();

  for (let i = 1; i <= 2; i++) {
    const nextIndex = queueIndex + i;
    if (nextIndex >= queue.length) break;
    const track = queue[nextIndex];
    const key = `${track.id}_${audioQuality}`;
    if (preloadCache.has(key)) continue;

    try {
      // Use musicAPI for TIDAL quality upgrade on preloaded tracks too
      const streamUrl = await musicAPI.getStreamUrl(track, audioQuality);
      if (preloadAbortController.signal.aborted) break;
      if (streamUrl) {
        preloadCache.set(key, streamUrl);
        // Warm connection
        if (!streamUrl.startsWith('blob:')) {
          fetch(streamUrl, { method: 'HEAD', signal: preloadAbortController.signal }).catch(() => {});
        }
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'AbortError') break;
    }
  }
}

// Sleep timer
let sleepTimerId: ReturnType<typeof setTimeout> | null = null;
let sleepTimerIntervalId: ReturnType<typeof setInterval> | null = null;

// Radio state
let radioFetchPromise: Promise<void> | null = null;

let loudnessGainNode: GainNode | null = null;

export function applyLoudnessNormalization(loudnessDb?: number) {
  const { loudnessNormalization } = useSettingsStore.getState();
  if (!loudnessGainNode) return;
  const ctx = usePlayerStore.getState().audioContext;
  if (!ctx) return;

  if (!loudnessNormalization || loudnessDb == null || Number.isNaN(loudnessDb)) {
    loudnessGainNode.gain.setTargetAtTime(1.0, ctx.currentTime, 0.05);
    return;
  }

  // Target -14 LUFS (YouTube standard).
  // If loudnessDb is +3, track is 3dB louder than target -> gain = 10^(-3/20) = ~0.71
  // If loudnessDb is -2, track is 2dB quieter than target -> gain = 10^(2/20) = ~1.26
  const rawGain = Math.pow(10, (-loudnessDb) / 20);
  const targetGain = Math.max(0.25, Math.min(2.0, rawGain));
  loudnessGainNode.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.05);
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: restored.currentTrack || null,
  isPlaying: false,
  currentTime: 0,
  duration: restored.currentTrack?.duration || 0,
  volume: 0.8,
  isMuted: false,
  queue: restored.queue || [],
  queueIndex: restored.queueIndex ?? -1,
  originalQueue: restored.originalQueue || [],
  isShuffled: restored.isShuffled || false,
  repeatMode: (restored.repeatMode as RepeatMode) || 'off',
  isQueueOpen: false,
  isLyricsOpen: false,
  isMiniPlayerOpen: false,
  isVisualizerActive: false,
  isLoading: false,
  audioElement: null,
  audioContext: null,
  analyserNode: null,
  isRadioEnabled: restored.isRadioEnabled || false,
  radioSeeds: [],
  isFetchingRadio: false,
  sleepTimerEndTime: null,
  sleepTimerRemaining: null,

  setAudioElement: (el) => set({ audioElement: el }),

  initAudioContext: () => {
    const state = get();
    if (state.audioContext || !state.audioElement) return;
    try {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      const source = ctx.createMediaElementSource(state.audioElement);

      loudnessGainNode = ctx.createGain();
      loudnessGainNode.gain.value = 1.0;
      source.connect(loudnessGainNode);
      
      try {
        equalizer.init(ctx, source, state.audioElement);
      } catch (eqErr) {
        console.warn('EQ init non-fatal:', eqErr);
      }
      
      // Unbroken Audio Graph: Source -> LoudnessGainNode -> Analyser -> Destination
      loudnessGainNode.connect(analyser);
      analyser.connect(ctx.destination);
      set({ audioContext: ctx, analyserNode: analyser });
    } catch (e) {
      console.warn('Failed to create audio context:', e);
    }
  },

  play: async (track, queue, startIndex) => {
    const state = get();
    get().initAudioContext();
    const seq = ++playbackSequence;
    if (queue) {
      // New queue = reset radio seeds if not in radio mode
      if (!state.isRadioEnabled) {
        set({ radioSeeds: [] });
      }
    }
    set({ isLoading: true, currentTrack: track });

    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist.name,
        album: track.album?.title || '',
        artwork: [
          { src: track.thumbnail || '', sizes: '320x320', type: 'image/jpeg' },
          { src: track.thumbnailLarge || track.thumbnail || '', sizes: '640x640', type: 'image/jpeg' },
        ],
      });
    }

    if (queue) {
      // Helper to forcefully strip variants
      const sanitizeTitle = (str: any) => {
        if (typeof str !== 'string') return '';
        let s = str.toLowerCase();
        s = s.replace(/\s*[([].*?[)\]]\s*/g, ' '); // remove (text) or [text]
        s = s.split(/[|\-:]/)[0]; // stop at dash, pipe or colon
        s = s.replace(/\b(remix|karaoke|full|video|audio|lyrical|lyrics|slowed|reverb|official|music|hd|hq)\b/g, ' ');
        return s.trim();
      };
      
      const cleanTitleMap = new Set<string>();
      const dedupedQueue = queue.filter((t: Track) => {
        // Always allow the explicitly clicked track
        if (String(t.id) === String(track.id)) return true;
        
        const cTitle = sanitizeTitle(t.title);
        if (!cTitle) return true;
        if (cleanTitleMap.has(cTitle)) return false;
        
        cleanTitleMap.add(cTitle);
        return true;
      });
      
      // Ensure the actually clicked track is also registered in the set so we don't duplicate it later
      const clickedCleanTitle = sanitizeTitle(track.title);
      if (clickedCleanTitle) cleanTitleMap.add(clickedCleanTitle);

      const finalQueue = state.isShuffled ? shuffleArray(dedupedQueue) : dedupedQueue;

      const newState = {
        originalQueue: queue,
        queue: finalQueue,
        queueIndex: startIndex ?? finalQueue.findIndex(t => String(t.id) === String(track.id)),
      };
      
      // Safety net if queueIndex becomes -1 after dedupe
      if (newState.queueIndex === -1 && finalQueue.length > 0) {
          newState.queueIndex = 0;
          finalQueue[0] = track; // Force inject at index 0 if something failed
      }

      set(newState);
      saveQueueState({ ...get() });
    }

    try {
      const { audioQuality } = useSettingsStore.getState();
      const preloadKey = `${track.id}_${audioQuality}`;

      // Check local streamUrl or preload cache first
      let streamUrl = track.streamUrl || preloadCache.get(preloadKey) || null;

      if (!streamUrl && track.source !== 'local') {
        const details = await musicAPI.getStreamDetails(track);
        if (details) {
          streamUrl = details.url;
          track.loudnessDb = details.loudnessDb;
        }
      }

      if (seq !== playbackSequence) return;

      const audio = get().audioElement || (typeof document !== 'undefined' ? document.querySelector('audio') : null);
      if (audio && !get().audioElement) {
        set({ audioElement: audio });
      }

      if (streamUrl && audio) {
        audio.pause();
        audio.src = streamUrl;
        audio.volume = state.isMuted ? 0 : state.volume;
        audio.load();

        await waitForCanPlay(audio);
        if (seq !== playbackSequence) return;

        await safePlay(audio);
        applyLoudnessNormalization(track.loudnessDb);

        set({
          isPlaying: true,
          isLoading: false,
          duration: track.duration || 0,
        });
        saveQueueState({ ...get() });

        // Preload next tracks in background
        const currentState = get();
        preloadNextTracks(currentState.queue, currentState.queueIndex);

        // Auto-buffer Up Next queue based on song if queue has <= 2 tracks (matching ytify)
        if (currentState.queue.length <= currentState.queueIndex + 2) {
          loadRecommendations(get, set);
        }

        const { addToRecentlyPlayed } = await import('./libraryStore');
        addToRecentlyPlayed(track);
        lastfmClient.updateNowPlaying(track);
      } else {
        console.warn('No stream URL found for track:', track.id, track.title);

        // ─── Second-chance retry ───
        try {
          const retryDetails = await musicAPI.getStreamDetails({ ...track, streamUrl: undefined });
          if (retryDetails && audio && seq === playbackSequence) {
            track.loudnessDb = retryDetails.loudnessDb;
            audio.pause();
            audio.src = retryDetails.url;
            audio.volume = state.isMuted ? 0 : state.volume;
            audio.load();
            await waitForCanPlay(audio);
            if (seq !== playbackSequence) return;
            await safePlay(audio);
            applyLoudnessNormalization(track.loudnessDb);
            set({ isPlaying: true, isLoading: false, duration: track.duration || 0 });
            saveQueueState({ ...get() });
            preloadNextTracks(get().queue, get().queueIndex);
            if (get().queue.length <= get().queueIndex + 2) {
              loadRecommendations(get, set);
            }
            const { addToRecentlyPlayed } = await import('./libraryStore');
            addToRecentlyPlayed(track);
            lastfmClient.updateNowPlaying(track);
            return;
          }
        } catch { /* still failed */ }

        toast({
          title: 'Playback failed',
          description: `Could not stream "${track.title}". Skipping...`,
          variant: 'destructive',
        });
        set({ isLoading: false, isPlaying: false });
        setTimeout(() => {
          if (seq !== playbackSequence) return;
          const { queue: q, queueIndex: qi } = get();
          const nextIndex = qi + 1;
          if (nextIndex < q.length) {
            set({ queueIndex: nextIndex });
            get().play(q[nextIndex]);
          }
        }, 1000);
      }
    } catch (error) {
      if (seq !== playbackSequence) return;
      console.error('Failed to play track:', error);
      toast({
        title: 'Playback error',
        description: `Failed to play "${track.title}". Skipping...`,
        variant: 'destructive',
      });
      set({ isLoading: false, isPlaying: false });
      setTimeout(() => {
        if (seq !== playbackSequence) return;
        const { queue: q, queueIndex: qi } = get();
        const nextIndex = qi + 1;
        if (nextIndex < q.length) {
          set({ queueIndex: nextIndex });
          get().play(q[nextIndex]);
        }
      }, 1000);
    }
  },

  togglePlayPause: () => {
    const { audioElement, isPlaying, currentTrack, queue, queueIndex } = get();
    if (!audioElement) return;
    if (isPlaying) {
      audioElement.pause();
      set({ isPlaying: false });
    } else {
      if ((!audioElement.src || audioElement.src === '' || audioElement.src === window.location.href) && currentTrack) {
        get().play(currentTrack, queue, queueIndex);
        return;
      }
      get().initAudioContext();
      safePlay(audioElement);
      set({ isPlaying: true });
    }
  },

  pause: () => { get().audioElement?.pause(); set({ isPlaying: false }); },
  resume: () => {
    const { audioElement, currentTrack, queue, queueIndex } = get();
    if (!audioElement) return;
    if ((!audioElement.src || audioElement.src === '' || audioElement.src === window.location.href) && currentTrack) {
      get().play(currentTrack, queue, queueIndex);
      return;
    }
    get().initAudioContext();
    safePlay(audioElement);
    set({ isPlaying: true });
  },

  next: () => {
    const { queue, queueIndex, repeatMode, isRadioEnabled } = get();
    if (queue.length === 0) return;

    if (repeatMode === 'one') {
      const track = queue[queueIndex];
      if (track) get().play(track);
      return;
    }

    let nextIndex = queueIndex + 1;

    // Radio: fetch more tracks when near end
    if (isRadioEnabled && queueIndex >= queue.length - 3) {
      fetchRadioRecommendations(get, set);
    } else if (queueIndex >= queue.length - 3) {
      // Automix background buffering
      loadRecommendations(get, set);
    }

    if (nextIndex >= queue.length) {
      if (repeatMode === 'all') {
        nextIndex = 0;
      } else if (isRadioEnabled) {
        // Wait for radio to add tracks
        fetchRadioRecommendations(get, set).then(() => {
          const updated = get();
          if (updated.queueIndex < updated.queue.length - 1) {
            get().next();
          }
        });
        return;
      } else {
        // Wait for Automix to add tracks
        loadRecommendations(get, set).then(() => {
          const updated = get();
          if (updated.queueIndex < updated.queue.length - 1) {
             get().next();
          }
        });
        return;
      }
    }

    const nextTrack = queue[nextIndex];
    if (nextTrack) {
      set({ queueIndex: nextIndex });
      get().play(nextTrack);
    }
  },

  previous: () => {
    const { queue, queueIndex, currentTime } = get();
    if (currentTime > 3) { get().seek(0); return; }
    const prevIndex = queueIndex - 1;
    if (prevIndex < 0) { get().seek(0); return; }
    const prevTrack = queue[prevIndex];
    if (prevTrack) { set({ queueIndex: prevIndex }); get().play(prevTrack); }
  },

  seek: (time) => {
    const { audioElement } = get();
    if (audioElement) { audioElement.currentTime = time; set({ currentTime: time }); }
  },

  setVolume: (vol) => {
    const { audioElement } = get();
    if (audioElement) audioElement.volume = vol;
    set({ volume: vol, isMuted: vol === 0 });
  },

  toggleMute: () => {
    const { audioElement, isMuted, volume } = get();
    if (audioElement) audioElement.volume = isMuted ? volume : 0;
    set({ isMuted: !isMuted });
  },

  toggleShuffle: () => {
    const { isShuffled, originalQueue, queue, queueIndex, currentTrack } = get();
    if (isShuffled) {
      const newIndex = currentTrack ? originalQueue.findIndex(t => String(t.id) === String(currentTrack.id)) : 0;
      set({ queue: originalQueue, queueIndex: newIndex, isShuffled: false });
    } else {
      const currentId = queue[queueIndex]?.id;
      const shuffled = shuffleArray(queue);
      if (currentId) {
        const idx = shuffled.findIndex(t => String(t.id) === String(currentId));
        if (idx > 0) [shuffled[0], shuffled[idx]] = [shuffled[idx], shuffled[0]];
      }
      set({ queue: shuffled, queueIndex: 0, isShuffled: true });
    }
    preloadCache.clear();
    saveQueueState({ ...get() });
  },

  setRepeatMode: (mode) => { set({ repeatMode: mode }); saveQueueState({ ...get() }); },
  cycleRepeat: () => {
    const modes: RepeatMode[] = ['off', 'all', 'one'];
    const nextIndex = (modes.indexOf(get().repeatMode) + 1) % modes.length;
    set({ repeatMode: modes[nextIndex] });
    saveQueueState({ ...get() });
  },

  addToQueue: (track) => {
    const { queue } = get();
    const newQueue = [...queue, track];
    set({ queue: newQueue });
    saveQueueState({ ...get() });
  },

  addNextToQueue: (track) => {
    const { queue, queueIndex } = get();
    const newQueue = [...queue];
    newQueue.splice(queueIndex + 1, 0, track);
    set({ queue: newQueue });
    saveQueueState({ ...get() });
  },

  addSimilarToQueue: async (track) => {
    const target = track || get().currentTrack;
    if (!target) return;

    toast({
      title: 'Finding similar tracks...',
      description: `Searching songs similar to "${target.title}" (ytify)`,
    });

    try {
      const artistName = typeof target.artist === 'string' ? target.artist : target.artist?.name || '';
      const similar = await ytifyClient.getSimilar(target.title, artistName, 10);

      const { queue } = get();
      const existingIds = new Set(queue.map(t => String(t.id)));
      const cleanTitleMap = new Set(queue.map(t => (t.title || '').toLowerCase().trim()));

      const toAdd = similar.filter(t => {
        const vid = t.videoId || String(t.id);
        const title = (t.title || '').toLowerCase().trim();
        if (existingIds.has(vid)) return false;
        if (title && cleanTitleMap.has(title)) return false;
        cleanTitleMap.add(title);
        return true;
      });

      if (toAdd.length > 0) {
        const newQueue = [...queue, ...toAdd];
        set({ queue: newQueue });
        saveQueueState({ ...get() });
        preloadNextTracks(newQueue, get().queueIndex);
        toast({
          title: 'Queue updated',
          description: `Added ${toAdd.length} songs similar to "${target.title}" to Up Next`,
        });
      } else {
        toast({
          title: 'Up Next',
          description: `Similar songs already in queue`,
        });
      }
    } catch (e: any) {
      toast({
        title: 'Could not fetch similar songs',
        description: e?.message || 'Error searching ytify recommendations',
        variant: 'destructive',
      });
    }
  },

  removeFromQueue: (index) => {
    const { queue, queueIndex } = get();
    set({
      queue: queue.filter((_, i) => i !== index),
      queueIndex: index < queueIndex ? queueIndex - 1 : queueIndex,
    });
    saveQueueState({ ...get() });
  },

  clearQueue: () => {
    const { currentTrack } = get();
    if (currentTrack) {
      set({ queue: [currentTrack], queueIndex: 0, originalQueue: [currentTrack] });
    } else {
      set({ queue: [], queueIndex: -1, originalQueue: [] });
    }
    preloadCache.clear();
    saveQueueState({ ...get() });
  },

  reorderQueue: (from, to) => {
    const { queue, queueIndex } = get();
    if (from < 0 || from >= queue.length || to < 0 || to >= queue.length) return;

    const newQueue = [...queue];
    const [moved] = newQueue.splice(from, 1);
    newQueue.splice(to, 0, moved);

    // Update currentQueueIndex properly (monochrome-style)
    let newQueueIndex = queueIndex;
    if (queueIndex === from) {
      newQueueIndex = to;
    } else if (from < queueIndex && to >= queueIndex) {
      newQueueIndex--;
    } else if (from > queueIndex && to <= queueIndex) {
      newQueueIndex++;
    }

    set({ queue: newQueue, queueIndex: newQueueIndex });
    saveQueueState({ ...get() });
  },

  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (dur) => set({ duration: dur }),
  toggleQueue: () => set(s => ({ isQueueOpen: !s.isQueueOpen, isLyricsOpen: false })),
  toggleLyrics: () => set(s => ({ isLyricsOpen: !s.isLyricsOpen, isQueueOpen: false })),
  toggleMiniPlayer: () => set(s => ({ isMiniPlayerOpen: !s.isMiniPlayerOpen })),
  setMiniPlayerOpen: (open: boolean) => set({ isMiniPlayerOpen: open }),
  toggleVisualizer: () => set(s => ({ isVisualizerActive: !s.isVisualizerActive })),

  // Radio mode
  enableRadio: (seeds) => {
    const state = get();
    const radioSeeds = seeds || (state.currentTrack ? [state.currentTrack] : []);
    set({ isRadioEnabled: true, radioSeeds });
    saveQueueState({ ...get() });
    // Pre-fetch recommendations
    if (state.queueIndex >= state.queue.length - 3) {
      fetchRadioRecommendations(get, set);
    }
  },

  disableRadio: () => {
    set({ isRadioEnabled: false, radioSeeds: [] });
    saveQueueState({ ...get() });
  },

  toggleRadio: () => {
    const { isRadioEnabled } = get();
    if (isRadioEnabled) {
      get().disableRadio();
    } else {
      get().enableRadio();
    }
  },

  // Sleep timer
  setSleepTimer: (minutes) => {
    get().clearSleepTimer();
    const endTime = Date.now() + minutes * 60 * 1000;
    set({ sleepTimerEndTime: endTime, sleepTimerRemaining: minutes * 60 });

    sleepTimerId = setTimeout(() => {
      const { audioElement } = get();
      if (audioElement) audioElement.pause();
      set({ isPlaying: false, sleepTimerEndTime: null, sleepTimerRemaining: null });
      toast({ title: 'Sleep timer', description: 'Playback paused by sleep timer' });
    }, minutes * 60 * 1000);

    sleepTimerIntervalId = setInterval(() => {
      const { sleepTimerEndTime: end } = get();
      if (!end) return;
      const remaining = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      set({ sleepTimerRemaining: remaining });
      if (remaining <= 0) {
        get().clearSleepTimer();
      }
    }, 1000);
  },

  clearSleepTimer: () => {
    if (sleepTimerId) { clearTimeout(sleepTimerId); sleepTimerId = null; }
    if (sleepTimerIntervalId) { clearInterval(sleepTimerIntervalId); sleepTimerIntervalId = null; }
    set({ sleepTimerEndTime: null, sleepTimerRemaining: null });
  },
}));

// YouTube Music-style Automix (Infinite Playback queue)
const MAX_QUEUE_SIZE = 500;

let loadingRecommendations = false;

async function loadRecommendations(
  get: () => PlayerState,
  set: (partial: Partial<PlayerState>) => void
): Promise<void> {
  if (loadingRecommendations) return;
  
  const { currentTrack, queue } = get();
  if (!currentTrack) return;
  
  if (queue.length >= MAX_QUEUE_SIZE) return;

  const existingIds = new Set(queue.map(t => String(t.id)));

  try {
    loadingRecommendations = true;
    let newTracks: Track[] = [];

    // Use unified API for recommendations
    try {
      const upNext = await musicAPI.getUpNexts(currentTrack);

        // Helper to normalize strings and strip out parenthetical/dash artifacts for strict matching
        const sanitizeTitle = (str: any) => {
          if (typeof str !== 'string') return '';
          let s = str.toLowerCase();
          s = s.replace(/\s*[([].*?[)\]]\s*/g, ' '); // remove (text) or [text]
          s = s.split(/[|\-:]/)[0]; // stop at dash, pipe or colon
          s = s.replace(/\b(remix|karaoke|full|video|audio|lyrical|lyrics|slowed|reverb|official|music|hd|hq)\b/g, ' ');
          return s.trim();
        };

        const existingTitles = new Set(
          get().queue.map(t => sanitizeTitle(t.title)).filter(Boolean)
        );

        newTracks = upNext.filter(t => {
          if (existingIds.has(String(t.id))) return false;
          
          const cleanTitle = sanitizeTitle(t.title);
          if (cleanTitle && existingTitles.has(cleanTitle)) return false;
          
          // Add to set to prevent duplicates within the new array itself
          if (cleanTitle) existingTitles.add(cleanTitle);
          return true;
        }).slice(0, 20);
      } catch { /* continue */ }

    // 2. High fidelity ytify similar content fallback (matching n-ce/ytify getSimilar)
    if (newTracks.length < 5) {
      try {
        const artistName = typeof currentTrack.artist === 'string' ? currentTrack.artist : currentTrack.artist?.name || '';
        const similar = await ytifyClient.getSimilar(currentTrack.title, artistName, 10);
        const additional = similar.filter(t => !existingIds.has(String(t.id)) && !newTracks.some(n => String(n.id) === String(t.id)));
        newTracks.push(...additional.slice(0, 10));
      } catch { /* continue */ }
    }

    // 3. Fallback: musicAPI.getTrackRecommendations (Deezer → Spotify chain)
    if (newTracks.length < 3) {
      try {
        const related = await musicAPI.getTrackRecommendations(currentTrack);
        const additional = related.filter(t => !existingIds.has(String(t.id)) && !newTracks.some(n => String(n.id) === String(t.id)));
        newTracks.push(...additional.slice(0, 5));
      } catch { /* continue */ }
    }

    if (newTracks.length > 0) {
      // Just append to queue, do NOT force play. The .next() method handles transitions.
      const currentQueue = get().queue;
      const newQueue = [...currentQueue, ...newTracks];
      set({ queue: newQueue });
      saveQueueState({ ...get() });
    }
  } catch (e) {
    console.error('Failed to load recommendations (Automix):', e);
  } finally {
    loadingRecommendations = false;
  }
}

// Radio recommendations (monochrome-style)
async function fetchRadioRecommendations(
  get: () => PlayerState,
  set: (partial: Partial<PlayerState>) => void
): Promise<void> {
  const state = get();
  if (state.isFetchingRadio) return radioFetchPromise || Promise.resolve();

  set({ isFetchingRadio: true });

  radioFetchPromise = (async () => {
    try {
      let seeds = state.radioSeeds;

      // If no seeds, pick from current track + recent history
      if (seeds.length === 0) {
        const { useLibraryStore } = await import('./libraryStore');
        const libState = useLibraryStore.getState();
        const potentialSeeds: Track[] = [];

        if (state.currentTrack) potentialSeeds.push(state.currentTrack);
        if (libState.recentlyPlayed.length > 0) {
          potentialSeeds.push(...libState.recentlyPlayed.slice(0, 20));
        }
        if (libState.favorites.length > 0) {
          potentialSeeds.push(...libState.favorites.slice(0, 10));
        }

        // Deduplicate
        const unique = Array.from(new Map(potentialSeeds.map(t => [String(t.id), t])).values());
        seeds = unique.sort(() => Math.random() - 0.5).slice(0, 50);
        set({ radioSeeds: seeds });
      }

      if (seeds.length === 0) return;

      // Pick a subset for this fetch
      const shuffledSeeds = [...seeds].sort(() => Math.random() - 0.5).slice(0, 5);

      const recommendations = await musicAPI.getRecommendedTracksForPlaylist(shuffledSeeds, 20);

      if (recommendations.length > 0) {
        const currentQueueIds = new Set(get().queue.map(t => String(t.id)));
        const newTracks = recommendations
          .filter(t => !currentQueueIds.has(String(t.id)))
          .sort(() => Math.random() - 0.5)
          .slice(0, 5);

        if (newTracks.length > 0) {
          const { queue } = get();
          const newQueue = [...queue, ...newTracks];
          set({ queue: newQueue });
          saveQueueState({ ...get() });
        }
      }
    } catch (error) {
      console.error('Failed to fetch radio recommendations:', error);
    } finally {
      set({ isFetchingRadio: false });
      radioFetchPromise = null;
    }
  })();

  return radioFetchPromise;
}

// Keyboard shortcuts
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;

    const store = usePlayerStore.getState();
    if (!store.currentTrack) return;

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        store.togglePlayPause();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        store.seek(Math.max(0, store.currentTime - 5));
        break;
      case 'ArrowRight':
        e.preventDefault();
        store.seek(Math.min(store.duration, store.currentTime + 5));
        break;
      case 'ArrowUp':
        e.preventDefault();
        store.setVolume(Math.min(1, store.volume + 0.05));
        break;
      case 'ArrowDown':
        e.preventDefault();
        store.setVolume(Math.max(0, store.volume - 0.05));
        break;
      case 'KeyM':
        store.toggleMute();
        break;
    }
  });
}

if ('mediaSession' in navigator) {
  navigator.mediaSession.setActionHandler('play', () => usePlayerStore.getState().resume());
  navigator.mediaSession.setActionHandler('pause', () => usePlayerStore.getState().pause());
  navigator.mediaSession.setActionHandler('previoustrack', () => usePlayerStore.getState().previous());
  navigator.mediaSession.setActionHandler('nexttrack', () => usePlayerStore.getState().next());
  navigator.mediaSession.setActionHandler('seekto', (details) => {
    if (details.seekTime !== undefined) usePlayerStore.getState().seek(details.seekTime);
  });
}

if (typeof window !== 'undefined') {
  (window as any).usePlayerStore = usePlayerStore;
}
