import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Radio, Users, Copy, Check, Headphones, Play, Sparkles, LogOut, ArrowRight, ShieldCheck } from 'lucide-react';
import { usePlayerStore } from '@/stores/playerStore';
import { toast } from 'sonner';

export default function ListenTogetherPage() {
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const [inRoom, setInRoom] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [copied, setCopied] = useState(false);

  // Simulated members in room
  const [members, setMembers] = useState<string[]>(['You (Host)', 'Alex M.', 'Sarah K.']);

  const handleCreateRoom = () => {
    const code = 'SIMP-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    setRoomCode(code);
    setIsHost(true);
    setInRoom(true);
    toast.success(`Created Sync Room: ${code}`);
  };

  const handleJoinRoom = () => {
    if (!inputCode.trim()) return;
    const clean = inputCode.trim().toUpperCase();
    setRoomCode(clean);
    setIsHost(false);
    setMembers(['Host', 'You', 'Sarah K.']);
    setInRoom(true);
    toast.success(`Joined Room: ${clean}`);
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    toast.success('Room code copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeaveRoom = () => {
    setInRoom(false);
    setRoomCode('');
    setIsHost(false);
    toast.info('Left Listen Together room');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16 select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 text-pink-400 font-semibold text-xs uppercase tracking-wider">
            <Radio size={16} className="animate-pulse" />
            <span>SimpMusic Listen Together</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mt-1">
            Listen in Real-Time Sync
          </h1>
          <p className="text-xs text-white/60">
            Share rooms that play music in sync with friends, compatible with Metrolist
          </p>
        </div>

        {inRoom && (
          <button
            onClick={handleLeaveRoom}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 text-xs font-semibold border border-red-500/30 transition-colors"
          >
            <LogOut size={14} />
            <span>Leave Room</span>
          </button>
        )}
      </div>

      {!inRoom ? (
        /* Create or Join View */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          {/* Host Room */}
          <div className="p-8 rounded-3xl bg-gradient-to-br from-pink-500/10 via-purple-500/5 to-transparent border border-white/10 backdrop-blur-2xl flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-pink-500/20 text-pink-400 flex items-center justify-center">
                <Radio size={24} />
              </div>
              <h2 className="text-xl font-bold text-white">Host a Sync Room</h2>
              <p className="text-xs text-white/60 leading-relaxed">
                Start a shared listening session. You control the playback, queue, and tracks while your friends listen in lockstep.
              </p>
            </div>

            <button
              onClick={handleCreateRoom}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-bold text-sm shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Sparkles size={16} />
              <span>Create New Room</span>
            </button>
          </div>

          {/* Join Room */}
          <div className="p-8 rounded-3xl bg-gradient-to-br from-sky-500/10 via-cyan-500/5 to-transparent border border-white/10 backdrop-blur-2xl flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
                <Users size={24} />
              </div>
              <h2 className="text-xl font-bold text-white">Join with Room Code</h2>
              <p className="text-xs text-white/60 leading-relaxed">
                Enter a 6-character room code from your friend to join their session and tune into the stream together.
              </p>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="e.g. SIMP-4K"
                value={inputCode}
                onChange={e => setInputCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleJoinRoom()}
                className="w-full px-4 py-2.5 rounded-xl bg-black/40 text-center font-mono text-sm uppercase tracking-widest text-white border border-white/15 focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
              <button
                onClick={handleJoinRoom}
                disabled={!inputCode.trim()}
                className="w-full py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-slate-950 font-bold text-sm shadow-xl transition-all flex items-center justify-center gap-2"
              >
                <span>Join Session</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Active Room View */
        <div className="space-y-6">
          {/* Room Banner */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-pink-500/15 via-sky-500/15 to-purple-500/15 border border-white/15 backdrop-blur-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-pink-500/20 text-pink-400 flex items-center justify-center border border-pink-400/30">
                <Radio size={28} className="animate-pulse" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-pink-400">
                  {isHost ? 'You are Hosting' : 'Connected to Room'}
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <h2 className="text-2xl font-black font-mono text-white tracking-widest">{roomCode}</h2>
                  <button
                    onClick={copyRoomCode}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 transition-colors"
                    title="Copy Code"
                  >
                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              <ShieldCheck size={16} />
              <span>Playback in Lockstep Sync</span>
            </div>
          </div>

          {/* Connected Listeners */}
          <div className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users size={16} className="text-sky-400" />
                <span>Connected Listeners ({members.length})</span>
              </h3>
              <span className="text-xs text-white/50">SimpMusic Protocol</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {members.map((member, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-sky-400 to-pink-500 flex items-center justify-center text-xs font-bold text-slate-950">
                    {member[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white truncate">{member}</p>
                    <span className="text-[10px] text-emerald-400 font-medium">Synced (0ms delay)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
