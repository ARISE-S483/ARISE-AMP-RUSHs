import { useState, useEffect } from 'react';
import { useAccountStore } from '@/stores/accountStore';
import { User, LogIn, LogOut, Key, Check, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export function AccountMenu() {
  const { account, cookie, isLoading, setCookie, logout, loadAccount } = useAccountStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [cookieInput, setCookieInput] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    loadAccount();
  }, [loadAccount]);

  const handleSaveCookie = async () => {
    if (!cookieInput.trim()) {
      toast.error('Please enter a cookie');
      return;
    }
    const success = await setCookie(cookieInput.trim());
    if (success) {
      toast.success('Connected to YouTube Music!');
      setModalOpen(false);
      setCookieInput('');
    } else {
      toast.error('Failed to verify cookie with YouTube Music');
    }
  };

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    toast.info('Signed out of YouTube Music');
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={() => {
            if (account?.signedIn) {
              setMenuOpen(!menuOpen);
            } else {
              setModalOpen(true);
            }
          }}
          className="flex items-center gap-2 h-7 px-2.5 rounded-full glass-subtle text-xs font-medium text-foreground hover:bg-accent/40 border border-border/30 transition-colors"
          title={account?.signedIn ? `${account.name} (${account.handle || 'Connected'})` : 'Sign in with YouTube Music'}
        >
          {account?.signedIn && account.thumbnail ? (
            <img src={account.thumbnail} alt="" className="w-4 h-4 rounded-full object-cover" />
          ) : (
            <User size={13} className={account?.signedIn ? 'text-primary' : 'text-muted-foreground'} />
          )}
          <span className="hidden sm:inline truncate max-w-[110px]">
            {account?.signedIn ? account.name : 'Sign In'}
          </span>
        </button>

        {/* Signed In Dropdown */}
        <AnimatePresence>
          {menuOpen && account?.signedIn && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 6 }}
              className="absolute right-0 top-full mt-2 w-56 rounded-2xl glass-card shadow-2xl p-2 z-50 border border-white/10 text-xs"
            >
              <div className="px-3 py-2 border-b border-border/50 mb-1">
                <p className="font-semibold text-foreground truncate">{account.name}</p>
                <p className="text-muted-foreground text-[11px] truncate">{account.handle || account.email || 'YouTube Music'}</p>
              </div>

              <button
                onClick={() => {
                  setMenuOpen(false);
                  setCookieInput(cookie);
                  setModalOpen(true);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-foreground hover:bg-accent/40 transition-colors text-left"
              >
                <Key size={13} className="text-muted-foreground" />
                <span>Update Cookie</span>
              </button>

              <button
                onClick={() => {
                  loadAccount();
                  toast.success('Refreshing account info...');
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-foreground hover:bg-accent/40 transition-colors text-left"
              >
                <RefreshCw size={13} className="text-muted-foreground" />
                <span>Sync Account</span>
              </button>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-destructive hover:bg-destructive/10 transition-colors text-left"
              >
                <LogOut size={13} />
                <span>Sign Out</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sign In / Cookie Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="w-full max-w-md rounded-3xl glass-card border border-white/15 p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center">
                    <LogIn size={16} />
                  </div>
                  <h3 className="font-display font-bold text-base">YouTube Music Sign-In</h3>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="w-7 h-7 rounded-full glass-subtle flex items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Connect your YouTube Music account to access your full library, liked music, personal playlists, and write actions like liking songs and creating playlists.
              </p>

              <div className="bg-secondary/40 rounded-2xl p-3 border border-border/50 text-[11px] text-muted-foreground space-y-1.5">
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  <Key size={12} className="text-primary" /> Cookie-Paste Method (Recommended)
                </p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Open <a href="https://music.youtube.com" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-0.5">music.youtube.com <ExternalLink size={10} /></a> in your browser</li>
                  <li>Press <kbd className="bg-accent px-1 rounded text-[10px]">F12</kbd> &gt; <strong>Application</strong> &gt; <strong>Cookies</strong> &gt; <strong>https://music.youtube.com</strong></li>
                  <li>Copy either the whole Cookie header from Network, or copy <code className="bg-accent px-1 rounded text-[10px]">SAPISID</code> &amp; <code className="bg-accent px-1 rounded text-[10px]">__Secure-3PAPISID</code></li>
                </ol>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Paste YouTube Cookie:</label>
                <textarea
                  rows={3}
                  value={cookieInput}
                  onChange={(e) => setCookieInput(e.target.value)}
                  placeholder="SAPISID=...; __Secure-3PAPISID=...; SID=..."
                  className="w-full bg-secondary/80 text-foreground text-xs rounded-xl p-3 border border-border outline-none focus:ring-1 focus:ring-primary/40 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl glass-subtle text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCookie}
                  disabled={isLoading}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity flex items-center gap-1.5"
                >
                  {isLoading ? 'Verifying...' : 'Connect Account'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
