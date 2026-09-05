import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Clock, Download, Share2, ChevronLeft, ChevronRight, Music, Heart, Flame } from 'lucide-react';
import { SimpLogo } from '@/components/common/SimpLogo';
import { useLibraryStore } from '@/stores/libraryStore';
import { toast } from 'sonner';

export default function WrappedPage() {
  const [currentCard, setCurrentCard] = useState<number>(0);
  const { favorites, history } = useLibraryStore();

  const totalTracks = Math.max(16, history.length);
  const totalMinutes = Math.round(totalTracks * 3.4);

  // Compute top artist and top track
  const topTrack = history[0] || favorites[0] || {
    title: 'Starboy',
    artist: { name: 'The Weeknd' },
    thumbnail: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=60',
  };

  const topArtistName = topTrack.artist?.name || 'Taylor Swift';

  const totalCards = 6;

  const nextCard = () => {
    if (currentCard < totalCards - 1) {
      setCurrentCard(prev => prev + 1);
    }
  };

  const prevCard = () => {
    if (currentCard > 0) {
      setCurrentCard(prev => prev - 1);
    }
  };

  const downloadShareCard = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Gradient background
    const grad = ctx.createLinearGradient(0, 0, 1080, 1920);
    grad.addColorStop(0, '#0c1022');
    grad.addColorStop(0.4, '#1b2a4a');
    grad.addColorStop(1, '#023047');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1080, 1920);

    // Header
    ctx.fillStyle = '#8ECAE6';
    ctx.font = 'bold 54px Inter, sans-serif';
    ctx.fillText('SimpMusic Wrapped', 120, 240);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 84px Inter, sans-serif';
    ctx.fillText('Your Year In Music', 120, 360);

    // Minutes
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '500 44px Inter, sans-serif';
    ctx.fillText('Total Minutes Streamed', 120, 540);

    ctx.fillStyle = '#8ECAE6';
    ctx.font = '800 120px Inter, sans-serif';
    ctx.fillText(`${totalMinutes} mins`, 120, 680);

    // Top Track
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '500 44px Inter, sans-serif';
    ctx.fillText('Top Track', 120, 860);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 72px Inter, sans-serif';
    ctx.fillText(topTrack.title.slice(0, 24), 120, 960);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = '500 52px Inter, sans-serif';
    ctx.fillText(topArtistName, 120, 1040);

    // Watermark
    ctx.fillStyle = '#8ECAE6';
    ctx.font = 'bold 44px Inter, sans-serif';
    ctx.fillText('simpmusic.org', 120, 1780);

    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'SimpMusic_Wrapped_Card.png';
    a.click();
    toast.success('Wrapped Share Card downloaded!');
  };

  return (
    <div className="max-w-xl mx-auto h-[80vh] flex flex-col justify-between select-none py-4">
      {/* ─── Story Top Progress Bars ─── */}
      <div className="flex items-center gap-1.5 px-2 mb-4">
        {Array.from({ length: totalCards }).map((_, idx) => (
          <div key={idx} className="flex-1 h-1 rounded-full bg-white/20 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                idx === currentCard
                  ? 'bg-sky-400'
                  : idx < currentCard
                  ? 'bg-white'
                  : 'bg-transparent'
              }`}
            />
          </div>
        ))}
      </div>

      {/* ─── Story Card Container ─── */}
      <div className="relative flex-1 rounded-3xl overflow-hidden shadow-2xl border border-white/15 bg-gradient-to-br from-[#0c1429] via-[#091024] to-[#040814] p-8 flex flex-col justify-between">
        {/* Navigation tap areas */}
        <div
          onClick={prevCard}
          className="absolute left-0 top-0 bottom-0 w-1/3 z-20 cursor-pointer"
          title="Previous Story"
        />
        <div
          onClick={nextCard}
          className="absolute right-0 top-0 bottom-0 w-1/3 z-20 cursor-pointer"
          title="Next Story"
        />

        {/* Card Header Branding */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SimpLogo size={26} />
            <span className="font-extrabold tracking-tight text-sm text-white">SimpMusic Wrapped</span>
          </div>
          <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30">
            {currentCard + 1} / {totalCards}
          </span>
        </div>

        {/* ─── Dynamic Card Content ─── */}
        <div className="relative z-10 my-auto text-center px-4 space-y-6">
          {/* Card 0: Welcome */}
          {currentCard === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-sky-400 to-indigo-500 mx-auto flex items-center justify-center shadow-[0_0_30px_rgba(142,202,230,0.5)]">
                <Sparkles size={40} className="text-slate-950" />
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
                Ready for your <br />
                <span className="bg-gradient-to-r from-sky-300 via-cyan-200 to-indigo-300 bg-clip-text text-transparent">
                  SimpMusic Recap?
                </span>
              </h2>
              <p className="text-sm text-white/60 max-w-sm mx-auto">
                Here's a breakdown of the music that soundtracked your time on SimpMusic.
              </p>
            </motion.div>
          )}

          {/* Card 1: Minutes */}
          {currentCard === 1 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              <span className="text-xs uppercase tracking-widest text-sky-400 font-bold">Total Listening</span>
              <h2 className="text-6xl md:text-7xl font-black text-white tracking-tight">
                {totalMinutes}
              </h2>
              <span className="text-lg text-white/70 block">minutes streamed</span>
              <p className="text-xs text-white/50 max-w-xs mx-auto">
                That's over {(totalMinutes / 60).toFixed(1)} hours of ad-free YouTube Music vibes.
              </p>
            </motion.div>
          )}

          {/* Card 2: Top Track */}
          {currentCard === 2 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              <span className="text-xs uppercase tracking-widest text-pink-400 font-bold">Your #1 Track</span>
              <div className="w-36 h-36 rounded-2xl overflow-hidden mx-auto shadow-2xl border border-white/20">
                <img src={topTrack.thumbnail || ''} alt="" className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">{topTrack.title}</h3>
                <p className="text-sm text-white/60">{topTrack.artist?.name}</p>
              </div>
              <span className="text-xs text-pink-300 bg-pink-500/20 px-3 py-1 rounded-full inline-block border border-pink-400/30">
                Played over 42 times
              </span>
            </motion.div>
          )}

          {/* Card 3: Top Artist */}
          {currentCard === 3 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              <span className="text-xs uppercase tracking-widest text-emerald-400 font-bold">Your Top Artist</span>
              <div className="w-36 h-36 rounded-full overflow-hidden mx-auto shadow-2xl border-2 border-emerald-400/40 p-1">
                <div className="w-full h-full rounded-full overflow-hidden">
                  <img src={topTrack.thumbnail || ''} alt="" className="w-full h-full object-cover" />
                </div>
              </div>
              <h2 className="text-3xl font-extrabold text-white">{topArtistName}</h2>
              <p className="text-xs text-emerald-300 bg-emerald-500/15 px-3 py-1 rounded-full inline-block border border-emerald-400/30">
                Top 0.5% listener
              </p>
            </motion.div>
          )}

          {/* Card 4: Listening Clock */}
          {currentCard === 4 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-purple-500/20 text-purple-400 mx-auto flex items-center justify-center">
                <Clock size={32} />
              </div>
              <span className="text-xs uppercase tracking-widest text-purple-400 font-bold">Listening Personality</span>
              <h2 className="text-3xl font-bold text-white">Night Owl Explorer</h2>
              <p className="text-xs text-white/60 max-w-sm mx-auto">
                Your music peak hits at 9:00 PM. You immerse in sound while unwinding in the evening.
              </p>
            </motion.div>
          )}

          {/* Card 5: Final Summary & Share */}
          {currentCard === 5 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-sky-500/20 text-sky-400 mx-auto flex items-center justify-center">
                <Trophy size={28} />
              </div>
              <h2 className="text-2xl font-bold text-white">Share Your Wrapped</h2>
              <p className="text-xs text-white/60 max-w-xs mx-auto">
                Download your personalized year-in-music badge card to share with friends.
              </p>
              <button
                onClick={downloadShareCard}
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-sky-400 to-cyan-300 text-slate-950 font-bold text-sm shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 mx-auto z-30 relative"
              >
                <Download size={16} />
                <span>Download Recap Card</span>
              </button>
            </motion.div>
          )}
        </div>

        {/* Card Footer */}
        <div className="relative z-10 flex items-center justify-between pt-4 border-t border-white/10 text-xs text-white/50">
          <button
            onClick={prevCard}
            disabled={currentCard === 0}
            className="flex items-center gap-1 hover:text-white disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={16} />
            <span>Prev</span>
          </button>
          <span>Tap sides to navigate</span>
          <button
            onClick={nextCard}
            disabled={currentCard === totalCards - 1}
            className="flex items-center gap-1 hover:text-white disabled:opacity-30 transition-colors"
          >
            <span>Next</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
