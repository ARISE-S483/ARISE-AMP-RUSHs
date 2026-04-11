import { create } from 'zustand';
import type { DataConnection, Peer } from 'peerjs';
import { toast } from '@/hooks/use-toast';

export interface SyncMessage {
  type: 'SYNC_STATE';
  payload: {
    favorites?: any[];
    playlists?: any[];
    // Add other syncable fields here
  };
}

interface SyncState {
  peer: Peer | null;
  connection: DataConnection | null;
  peerId: string | null;
  status: 'disconnected' | 'connecting' | 'connected';
  isHost: boolean;
  
  initHost: () => Promise<string>;
  joinHost: (hostId: string) => Promise<void>;
  broadcastState: (message: SyncMessage) => void;
  disconnect: () => void;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  peer: null,
  connection: null,
  peerId: null,
  status: 'disconnected',
  isHost: false,

  initHost: async () => {
    get().disconnect();
    set({ status: 'connecting', isHost: true });
    
    // Dynamically import PeerJS so we don't block server rendering or initial load
    const { Peer } = await import('peerjs');
    
    return new Promise((resolve, reject) => {
      // Create a random Peer ID
      const peer = new Peer();
      
      peer.on('open', (id) => {
        set({ peer, peerId: id, status: 'connected' });
        resolve(id);
      });
      
      peer.on('connection', (conn) => {
        // When someone joins, we accept the connection and setup listeners
        set({ connection: conn });
        
        conn.on('open', () => {
          toast({ title: 'Device connected', description: 'A remote device joined the sync session.' });
          
          // Broadcast full current state to the newly connected peer instantly
          import('./libraryStore').then(({ useLibraryStore }) => {
            const lib = useLibraryStore.getState();
            conn.send({
              type: 'SYNC_STATE',
              payload: {
                favorites: lib.favorites,
                playlists: lib.playlists,
              }
            } as SyncMessage);
          });
        });
        
        conn.on('data', (data: unknown) => {
          handleIncomingSync(data as SyncMessage);
        });
        
        conn.on('close', () => {
          toast({ title: 'Device disconnected', description: 'Remote device left the session.' });
          set({ connection: null });
        });
      });
      
      peer.on('error', (err) => {
        toast({ title: 'Sync Error', description: err.message, variant: 'destructive' });
        set({ status: 'disconnected' });
        reject(err);
      });
    });
  },

  joinHost: async (hostId: string) => {
    get().disconnect();
    set({ status: 'connecting', isHost: false });
    
    const { Peer } = await import('peerjs');
    
    return new Promise<void>((resolve, reject) => {
      const peer = new Peer();
      
      peer.on('open', () => {
        const conn = peer.connect(hostId);
        
        conn.on('open', () => {
          set({ peer, peerId: peer.id, connection: conn, status: 'connected' });
          toast({ title: 'Connected', description: 'Successfully joined sync session.' });
          resolve();
        });
        
        conn.on('data', (data: unknown) => {
          handleIncomingSync(data as SyncMessage);
        });
        
        conn.on('close', () => {
          toast({ title: 'Disconnected', description: 'Lost connection to host.' });
          get().disconnect();
        });
        
        conn.on('error', (err) => {
          reject(err);
        });
      });
      
      peer.on('error', (err) => {
        toast({ title: 'Sync Error', description: err.message, variant: 'destructive' });
        set({ status: 'disconnected' });
        reject(err);
      });
    });
  },

  broadcastState: (message: SyncMessage) => {
    const { connection, status } = get();
    if (status === 'connected' && connection) {
      connection.send(message);
    }
  },

  disconnect: () => {
    const { peer, connection } = get();
    if (connection) connection.close();
    if (peer) peer.destroy();
    set({ peer: null, connection: null, peerId: null, status: 'disconnected', isHost: false });
  }
}));

// Helper to apply incoming data stream
async function handleIncomingSync(msg: SyncMessage) {
  if (msg.type !== 'SYNC_STATE') return;
  
  const { useLibraryStore } = await import('./libraryStore');
  const { set: idbSet } = await import('idb-keyval');
  
  if (msg.payload.favorites) {
    useLibraryStore.setState({ favorites: msg.payload.favorites });
    idbSet('melodies_favorites', msg.payload.favorites).catch(console.error);
    toast({ title: 'Sync', description: 'Favorites synced from host.' });
  }
  if (msg.payload.playlists) {
    useLibraryStore.setState({ playlists: msg.payload.playlists });
    idbSet('melodies_playlists', msg.payload.playlists).catch(console.error);
    toast({ title: 'Sync', description: 'Playlists synced from host.' });
  }
}
