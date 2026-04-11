import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCcw, Copy, Check, Info, AlertCircle, Loader2 } from 'lucide-react';
import { useSyncStore } from '@/stores/syncStore';
import { useToast } from '@/hooks/use-toast';

export default function SyncManagement() {
  const { status, peerId, isHost, initHost, joinHost, disconnect } = useSyncStore();
  const [copied, setCopied] = useState(false);
  const [joinId, setJoinId] = useState('');
  const { toast } = useToast();

  const handleCopy = () => {
    if (peerId) {
      navigator.clipboard.writeText(peerId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: 'Peer ID Copied', description: 'Share this ID with other devices to sync.' });
    }
  };

  return (
    <div>
      <h2 className="font-display font-semibold text-base mb-3">Peer-to-Peer Sync</h2>
      <p className="text-xs text-muted-foreground mb-4">
        Synchronize your library (Favorites & Playlists) across devices securely and directly using WebRTC. No central server is used for storage. The host device acts as the source of truth.
      </p>

      <div className="space-y-4 shadow-sm border border-border/50 rounded-xl p-4 bg-secondary/20">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <RefreshCcw size={16} className={`text-primary ${status === 'connected' ? 'animate-spin-slow' : ''}`} />
            Sync Status: <span className="capitalize font-normal text-muted-foreground">{status}</span>
          </h3>
          {status !== 'disconnected' && (
            <button
              onClick={disconnect}
              className="px-3 py-1 bg-destructive/10 text-destructive text-xs rounded-lg hover:bg-destructive/20 transition-colors"
            >
              Disconnect
            </button>
          )}
        </div>

        {status === 'disconnected' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {/* Host Section */}
            <div className="p-4 border border-border rounded-lg bg-background/50">
              <h4 className="font-medium text-sm mb-2">Host Session</h4>
              <p className="text-xs text-muted-foreground mb-4">
                Make this device the sync host. Other devices will connect to you and receive your library data.
              </p>
              <button
                onClick={initHost}
                className="w-full py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Start Hosting
              </button>
            </div>

            {/* Join Section */}
            <div className="p-4 border border-border rounded-lg bg-background/50">
              <h4 className="font-medium text-sm mb-2">Join Session</h4>
              <p className="text-xs text-muted-foreground mb-4">
                Connect to an existing host to receive their library data.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter Host ID"
                  value={joinId}
                  onChange={(e) => setJoinId(e.target.value)}
                  className="flex-1 bg-secondary text-foreground text-xs rounded-lg px-3 py-2 outline-none border border-border focus:ring-1 focus:ring-primary/20"
                />
                <button
                  onClick={() => {
                    if (!joinId.trim()) return toast({title: "Error", description: "Please enter a Host ID", variant: "destructive"});
                    joinHost(joinId.trim());
                  }}
                  className="px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/80 transition-colors"
                >
                  Join
                </button>
              </div>
            </div>
          </div>
        )}

        {status === 'connecting' && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="animate-spin text-primary mb-4" size={32} />
            <p className="text-sm font-medium">Connecting to Peer-to-Peer network...</p>
          </div>
        )}

        {status === 'connected' && (
          <div className="mt-4 p-4 border border-primary/30 bg-primary/5 rounded-lg">
            <div className="flex items-start gap-3">
               <Info className="text-primary mt-0.5" size={18} />
               <div>
                  <h4 className="font-medium text-sm mb-1">
                    {!isHost ? 'Connected to Host' : 'Hosting Sync Session'}
                  </h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    {!isHost 
                      ? 'Your library is currently being synchronized from the host device.'
                      : 'You are broadcasting your library. Other devices can connect using the ID below.'}
                  </p>

                  {isHost && peerId && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 font-mono text-xs bg-black/20 dark:bg-black/40 px-3 py-2 rounded border border-border overflow-x-auto select-all">
                        {peerId}
                      </div>
                      <button
                        onClick={handleCopy}
                        className="p-2 bg-secondary text-foreground rounded hover:bg-secondary/80 transition-colors shrink-0"
                        title="Copy Peer ID"
                      >
                        {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                      </button>
                    </div>
                  )}
               </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 p-3 bg-secondary/30 rounded-lg flex gap-3 items-start border border-border/50">
        <AlertCircle size={16} className="text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          P2P sync requires an active connection between the devices. Closing the host application stops synchronization.
          Changes made on the host are automatically pushed to all connected clients.
        </p>
      </div>
    </div>
  );
}
