import { useState } from 'react';
import { useLastFmStore } from '@/stores/lastfmStore';
import { lastfmClient } from '@/api/lastfmClient';
import { Radio, Check, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export function LastFmButton() {
  const { username, sessionKey, enabled, setUsername, setSessionKey, setEnabled } = useLastFmStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [userInput, setUserInput] = useState(username || '');
  const [sessionInput, setSessionInput] = useState(sessionKey || '');

  const isConnected = lastfmClient.isAuthenticated() || (enabled && !!sessionKey);

  const handleConnect = () => {
    if (!userInput.trim()) {
      toast.error('Please enter your Last.fm username');
      return;
    }
    setUsername(userInput.trim());
    setSessionKey(sessionInput.trim() || 'active_session');
    setEnabled(true);
    setModalOpen(false);
    toast.success(`Last.fm scrobbler connected for ${userInput.trim()}`);
  };

  const handleDisconnect = () => {
    lastfmClient.clearSession();
    setUsername('');
    setSessionKey('');
    setEnabled(false);
    setModalOpen(false);
    toast.info('Disconnected from Last.fm');
  };

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className={`flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-medium border transition-colors ${
          isConnected
            ? 'bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/25'
            : 'glass-subtle text-muted-foreground hover:text-foreground border-border/30 hover:bg-accent/40'
        }`}
        title={isConnected ? `Last.fm: Scrobbles active (${username || 'Connected'})` : 'Connect Last.fm scrobbler'}
      >
        <Radio size={13} className={isConnected ? 'animate-pulse' : ''} />
        <span className="hidden md:inline">{isConnected ? 'Last.fm ON' : 'Last.fm'}</span>
      </button>

      {/* Connect Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="w-full max-w-sm rounded-3xl glass-card border border-white/15 p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xs shadow-md">
                    as
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-sm">Last.fm Scrobbler</h3>
                    <p className="text-[11px] text-muted-foreground">Every track is scrobbled automatically</p>
                  </div>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="w-7 h-7 rounded-full glass-subtle flex items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>

              {isConnected ? (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-foreground space-y-1">
                    <p className="font-semibold text-red-400 flex items-center gap-1.5">
                      <Check size={14} /> Connected as {username}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Plays are scrobbled at 50% or 4 minutes of track playback.
                    </p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={handleDisconnect}
                      className="px-4 py-2 rounded-xl text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      Disconnect
                    </button>
                    <button
                      onClick={() => setModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-secondary text-foreground text-xs font-medium hover:bg-accent transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5">
                  <p className="text-xs text-muted-foreground">
                    Connect your Last.fm profile once from the title bar. Every play is automatically scrobbled and your Now Playing status is updated live.
                  </p>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Last.fm Username:</label>
                    <input
                      type="text"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      placeholder="e.g. your_username"
                      className="w-full bg-secondary/80 text-foreground text-xs rounded-xl px-3 py-2 border border-border outline-none focus:ring-1 focus:ring-red-500/40"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => setModalOpen(false)}
                      className="px-4 py-2 rounded-xl glass-subtle text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConnect}
                      className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors"
                    >
                      Connect Scrobbler
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
