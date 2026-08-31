import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  Server, RefreshCw, Zap, Clock, AlertCircle,
  CheckCircle2, XCircle, GripVertical, Trash2, Plus, Youtube, Music2, Key,
  Eye, EyeOff
} from 'lucide-react';
import { useRapidApiStore } from '@/stores/rapidapiStore';
import { useSettingsStore } from '@/stores/settingsStore';

// ========== Types & Storage ==========

type InstanceType = 'api' | 'streaming' | 'jiosaavn';

interface InstanceEntry {
  url: string;
  type: InstanceType;
  enabled: boolean;
  latency?: number;
  status?: 'online' | 'offline' | 'checking';
  version?: string;
  lastChecked?: number;
}

const STORAGE_KEY = 'melodies_instances_v3';

const DEFAULT_INSTANCES: InstanceEntry[] = [
  // From user's JSON - API
  { url: 'https://eu-central.monochrome.tf', type: 'api', enabled: true },
  { url: 'https://us-west.monochrome.tf', type: 'api', enabled: true },
  { url: 'https://arran.monochrome.tf', type: 'api', enabled: true },
  { url: 'https://api.monochrome.tf', type: 'api', enabled: true },
  { url: 'https://monochrome-api.samidy.com', type: 'api', enabled: true },
  { url: 'https://triton.squid.wtf', type: 'api', enabled: true },
  { url: 'https://wolf.qqdl.site', type: 'api', enabled: true },
  { url: 'https://maus.qqdl.site', type: 'api', enabled: true },
  { url: 'https://vogel.qqdl.site', type: 'api', enabled: true },
  { url: 'https://hund.qqdl.site', type: 'api', enabled: true },
  { url: 'https://tidal.kinoplus.online', type: 'api', enabled: true },
  
  // From user's JSON - Streaming
  { url: 'https://arran.monochrome.tf', type: 'streaming', enabled: true },
  { url: 'https://triton.squid.wtf', type: 'streaming', enabled: true },
  { url: 'https://wolf.qqdl.site', type: 'streaming', enabled: true },
  { url: 'https://maus.qqdl.site', type: 'streaming', enabled: true },
  { url: 'https://vogel.qqdl.site', type: 'streaming', enabled: true },
  { url: 'https://katze.qqdl.site', type: 'streaming', enabled: true },
  { url: 'https://hund.qqdl.site', type: 'streaming', enabled: true },
  { url: 'https://hifi.p1nkhamster.xyz', type: 'streaming', enabled: true },

  // From INSTANCES.md
  { url: 'https://monochrome.tf', type: 'api', enabled: true },
  { url: 'https://monochrome.samidy.com', type: 'api', enabled: true },
  { url: 'https://lossless.wtf', type: 'api', enabled: true },
  { url: 'https://if-it-runs-ship-it.lol', type: 'api', enabled: true },
  { url: 'https://monochrome.tf', type: 'streaming', enabled: true },
  { url: 'https://monochrome.samidy.com', type: 'streaming', enabled: true },
  { url: 'https://lossless.wtf', type: 'streaming', enabled: true },
  { url: 'https://if-it-runs-ship-it.lol', type: 'streaming', enabled: true },
];

function loadInstances(): InstanceEntry[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as InstanceEntry[];
      const validTypes: InstanceType[] = ['api', 'streaming', 'jiosaavn'];
      // Migrate old separate types into streaming
      const migrated = parsed.map(i => {
        if (['deezer', 'freeyourmusic', 'shazam', 'spotify23', 'ytmusic', 'piped'].includes(i.type)) {
          return { ...i, type: 'streaming' as InstanceType };
        }
        return i;
      });
      const valid = migrated.filter(i => validTypes.includes(i.type as InstanceType));
      
      // Merge in any new DEFAULT_INSTANCES that user doesn't have yet
      const merged = [...valid];
      for (const def of DEFAULT_INSTANCES) {
        if (!merged.some(m => m.url === def.url && m.type === def.type)) {
          merged.push({ ...def });
        }
      }
      return merged;
    }
  } catch { /* */ }
  return DEFAULT_INSTANCES.map(i => ({ ...i }));
}

function saveInstances(instances: InstanceEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(instances));
  } catch { /* */ }
}

// ========== Sub-components ==========

const typeTabs: { id: InstanceType; label: string; icon: React.ElementType }[] = [
  { id: 'api', label: 'API (TIDAL)', icon: Server },
  { id: 'streaming', label: 'Streaming & Video', icon: Zap },
  { id: 'jiosaavn', label: 'JioSaavn', icon: Music2 },
];

function StatusBadge({ status, latency }: { status?: string; latency?: number }) {
  if (status === 'checking') {
    return (
      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <RefreshCw size={10} className="animate-spin" /> Checking…
      </span>
    );
  }
  if (status === 'online') {
    return (
      <span className="flex items-center gap-1 text-[10px] text-primary">
        <CheckCircle2 size={10} />
        {latency ? `${latency}ms` : 'Online'}
      </span>
    );
  }
  if (status === 'offline') {
    return (
      <span className="flex items-center gap-1 text-[10px] text-destructive">
        <XCircle size={10} /> Offline
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
      <Clock size={10} /> Not checked
    </span>
  );
}

function InstanceRow({
  instance, onToggle, onRemove,
}: {
  instance: InstanceEntry; onToggle: () => void; onRemove: () => void;
}) {
  const hostname = (() => {
    try { return new URL(instance.url).hostname; } catch { return instance.url; }
  })();

  return (
    <Reorder.Item
      value={instance}
      className={`flex items-center gap-3 px-3 py-3 rounded-lg border transition-all duration-200 ${
        instance.enabled
          ? 'border-border/50 bg-secondary/20'
          : 'border-border/30 bg-secondary/5 opacity-60'
      }`}
      whileDrag={{ scale: 1.02, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}
    >
      <GripVertical size={14} className="text-muted-foreground/50 cursor-grab active:cursor-grabbing flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{hostname}</p>
        <p className="text-[10px] text-muted-foreground truncate">{instance.url}</p>
      </div>
      <StatusBadge status={instance.status} latency={instance.latency} />
      {instance.version && (
        <span className="text-[10px] text-muted-foreground bg-secondary/60 px-1.5 py-0.5 rounded font-mono">
          v{instance.version}
        </span>
      )}
      <button
        onClick={onToggle}
        className={`w-9 h-5 rounded-full transition-colors duration-200 relative flex-shrink-0 ${
          instance.enabled ? 'bg-foreground' : 'bg-secondary'
        }`}
      >
        <motion.div
          className={`absolute top-0.5 w-4 h-4 rounded-full ${
            instance.enabled ? 'bg-background' : 'bg-muted-foreground'
          }`}
          animate={{ left: instance.enabled ? 20 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </button>
      <button
        onClick={onRemove}
        className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded hover:bg-destructive/10 flex-shrink-0"
        title="Remove instance"
      >
        <Trash2 size={13} />
      </button>
    </Reorder.Item>
  );
}

// ========== Main Component ==========

export default function InstancesManager() {
  const [instances, setInstances] = useState<InstanceEntry[]>(loadInstances);
  const [activeType, setActiveType] = useState<InstanceType>('api');
  const [addingUrl, setAddingUrl] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [checking, setChecking] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const rapidapiKey = useRapidApiStore(state => state.rapidapiKey);
  const autoRefreshInstances = useSettingsStore(state => state.autoRefreshInstances);
  const setSetting = useSettingsStore(state => state.setSetting);

  const filtered = instances.filter(i => i.type === activeType);

  const persist = useCallback((next: InstanceEntry[]) => {
    setInstances(next);
    saveInstances(next);
  }, []);

  const handleReorder = (reordered: InstanceEntry[]) => {
    const others = instances.filter(i => i.type !== activeType);
    persist([...others, ...reordered]);
  };

  const handleToggle = (url: string) => {
    persist(instances.map(i => i.url === url && i.type === activeType ? { ...i, enabled: !i.enabled } : i));
  };

  const handleRemove = (url: string) => {
    persist(instances.filter(i => !(i.url === url && i.type === activeType)));
  };

  const handleAdd = () => {
    if (!addingUrl.trim()) return;
    let url = addingUrl.trim();
    if (!url.startsWith('http')) url = 'https://' + url;
    url = url.replace(/\/+$/, '');
    if (instances.some(i => i.url === url && i.type === activeType)) {
      setAddingUrl(''); setIsAdding(false); return;
    }
    persist([...instances, { url, type: activeType, enabled: true }]);
    setAddingUrl(''); setIsAdding(false);
  };

  const handleReset = () => {
    persist(DEFAULT_INSTANCES.map(i => ({ ...i })));
  };

   const handleCheckAll = async () => {
    setChecking(true);
    const updated = instances.map(i =>
      i.type === activeType ? { ...i, status: 'checking' as const } : i
    );
    setInstances(updated);

    const results = await Promise.allSettled(
      filtered.map(async (inst) => {
        const start = Date.now();
        try {
          // Determine test path based on URL pattern
          let testPath = '';
          const headers: Record<string, string> = {};
          const isRapidApiUrl = inst.url.includes('.p.rapidapi.com');

          if (activeType === 'api') {
            testPath = '/search/?s=test';
          } else if (activeType === 'jiosaavn') {
            testPath = '/api/search/songs?query=test&limit=1';
          } else if (activeType === 'streaming') {
            // Smart path detection for streaming URLs
            if (isRapidApiUrl) {
              // RapidAPI endpoints — use their specific search paths
              if (inst.url.includes('deezer')) testPath = '/search?q=test';
              else if (inst.url.includes('musicapi13')) testPath = '/public/search';
              else if (inst.url.includes('shazam')) testPath = '/search?term=test&locale=en-US&offset=0&limit=1';
              else if (inst.url.includes('spotify23')) testPath = '/search/?q=test&type=tracks&offset=0&limit=1';
              else testPath = '/search?q=test';

              if (rapidapiKey) {
                try {
                  const host = new URL(inst.url).hostname;
                  headers['X-Rapidapi-Key'] = rapidapiKey;
                  headers['X-Rapidapi-Host'] = host;
                } catch { /* */ }
              }
            } else if (
              inst.url.includes('bhindi1.ddns.net') ||
              inst.url.includes('music.youtube.com') ||
              inst.url.includes('googleapis.com') ||
              inst.url.includes('youtube.com/o/oauth2') ||
              inst.url.includes('inv.nadeko.net') ||
              inst.url.includes('invidious.snopyta.org') ||
              inst.url.includes('beatbump.io') ||
              inst.url.includes('hyperpipeapi.onrender.com') ||
              inst.url.includes('piped')
            ) {
              // External YT Music & Piped endpoints — use server-side CORS proxy
              let targetUrl = inst.url;
              try { 
                 const urlObj = new URL(inst.url);
                 targetUrl = urlObj.origin; // Just check if the host is up and responding
              } catch { /* ignore */ }
              
              const proxyUrl = `/api/cors-proxy?url=${encodeURIComponent(targetUrl)}`;
              const authController = new AbortController();
              const authTimeout = setTimeout(() => authController.abort(), 10000);
              const proxyRes = await fetch(proxyUrl, { signal: authController.signal });
              clearTimeout(authTimeout);
              const proxyData = await proxyRes.json();
              const latency = Date.now() - start;
              
              // If status is greater than 0, the server is reachable (even if it returns 404/403 for the bare origin)
              const isOnline = proxyData.ok || (proxyData.status && proxyData.status > 0 && proxyData.status < 500);
              
              return {
                url: inst.url,
                status: isOnline ? 'online' as const : 'offline' as const,
                latency,
                version: undefined,
              };
            } else if (inst.url.startsWith('/api/')) {
              // Local server API
              testPath = '/search?q=test&type=songs';
            } else if (
              inst.url.includes('monochrome.tf') ||
              inst.url.includes('squid.wtf') ||
              inst.url.includes('qqdl.site') ||
              inst.url.includes('kinoplus.online')
            ) {
              // TIDAL sources
              testPath = '/search/?s=test';
            } else {
              // Standard Piped instances
              testPath = '/trending?region=US';
            }
          }

          const fetchController = new AbortController();
          const fetchTimeout = setTimeout(() => fetchController.abort(), 8000);
          const fetchOpts: RequestInit = { signal: fetchController.signal };
          if (Object.keys(headers).length > 0) fetchOpts.headers = headers;
          const res = await fetch(`${inst.url}${testPath}`, fetchOpts);
          clearTimeout(fetchTimeout);
          const latency = Date.now() - start;
          let version: string | undefined;
          if (res.ok) {
            try { const data = await res.json(); version = data.version || undefined; } catch { /* */ }
          }
          return { url: inst.url, status: res.ok ? 'online' as const : 'offline' as const, latency, version };
        } catch {
          return { url: inst.url, status: 'offline' as const, latency: undefined, version: undefined };
        }
      })
    );

    setInstances(prev => {
      const next = prev.map(inst => {
        if (inst.type !== activeType) return inst;
        const result = results.find((r, idx) => r.status === 'fulfilled' && filtered[idx]?.url === inst.url);
        if (result && result.status === 'fulfilled') {
          return { ...inst, status: result.value.status, latency: result.value.latency, version: result.value.version || inst.version, lastChecked: Date.now() };
        }
        return { ...inst, status: 'offline' as const };
      });
      saveInstances(next);
      return next;
    });
    setChecking(false);
  };

  useEffect(() => {
    handleCheckAll();
    let interval: NodeJS.Timeout;
    if (autoRefreshInstances) {
      interval = setInterval(() => {
        if (!checking) handleCheckAll();
      }, 60000); // Check every 60 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeType, autoRefreshInstances]);

  const enabledCount = filtered.filter(i => i.enabled).length;
  const onlineCount = filtered.filter(i => i.status === 'online').length;

  // Check if current tab has RapidAPI-based instances
  const hasRapidApiInstances = activeType === 'streaming' && filtered.some(i => i.url.includes('.p.rapidapi.com'));
  const needsRapidApi = hasRapidApiInstances;

  return (
    <div>
      <h2 className="font-display font-semibold text-base mb-3">Instances</h2>
      <p className="text-xs text-muted-foreground mb-4">
        Manage API instances priority, enable/disable, and check health. Drag to reorder.
      </p>



      {/* Auto Refresh Toggle for all tabs */}
      <div className="mb-6 p-4 rounded-xl border border-border/50 bg-secondary/10">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <RefreshCw size={14} className="text-primary" /> Auto-Refresh Server Status
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Automatically check the health of all instances every 60 seconds. Ensures the app instantly knows which servers are offline.
            </p>
          </div>
          <button
            onClick={() => setSetting('autoRefreshInstances', !autoRefreshInstances)}
            className={`w-10 h-5 rounded-full transition-colors duration-200 relative shrink-0 ${
              autoRefreshInstances ? 'bg-primary' : 'bg-secondary'
            }`}
          >
            <motion.div
              className={`absolute top-0.5 w-4 h-4 rounded-full ${
                autoRefreshInstances ? 'bg-primary-foreground' : 'bg-muted-foreground'
              }`}
              animate={{ left: autoRefreshInstances ? 22 : 2 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
        </div>
      </div>

      {/* Type tabs */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        {typeTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveType(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all duration-200 ${
              activeType === tab.id
                ? 'bg-foreground text-background font-medium'
                : 'bg-secondary/60 text-secondary-foreground hover:bg-accent'
            }`}
          >
            <tab.icon size={12} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stats + actions */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span>{filtered.length} instances</span>
          <span>{enabledCount} enabled</span>
          {filtered.some(i => i.status) && <span className="text-primary">{onlineCount} online</span>}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button onClick={handleCheckAll} disabled={checking} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] bg-secondary/60 hover:bg-accent transition-colors disabled:opacity-50">
            <RefreshCw size={10} className={checking ? 'animate-spin' : ''} /> Check All
          </button>
          <button onClick={() => setIsAdding(true)} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] bg-secondary/60 hover:bg-accent transition-colors">
            <Plus size={10} /> Add
          </button>
          <button onClick={handleReset} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-destructive hover:bg-destructive/10 transition-colors">
            Reset
          </button>
        </div>
      </div>

      {/* Add input */}
      <AnimatePresence>
        {isAdding && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-3 overflow-hidden">
            <div className="flex gap-2">
              <input
                type="text" value={addingUrl}
                onChange={(e) => setAddingUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setIsAdding(false); }}
                placeholder="https://instance.example.com"
                className="flex-1 bg-secondary text-foreground text-xs rounded-lg px-3 py-1.5 outline-none border border-border focus:ring-1 focus:ring-foreground/20"
                autoFocus
              />
              <button onClick={handleAdd} className="px-3 py-1.5 rounded-lg text-xs bg-foreground text-background font-medium hover:opacity-90">Add</button>
              <button onClick={() => { setIsAdding(false); setAddingUrl(''); }} className="px-2 py-1.5 rounded-lg text-xs bg-secondary/60 hover:bg-accent">Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instance list */}
      <div className="rounded-lg border border-border/30 p-2">
        {filtered.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle size={24} className="text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-muted-foreground text-xs">No instances configured</p>
          </div>
        ) : (
          <Reorder.Group axis="y" values={filtered} onReorder={handleReorder} className="space-y-1.5">
            {filtered.map((instance) => (
              <InstanceRow
                key={`${instance.type}-${instance.url}`}
                instance={instance}
                onToggle={() => handleToggle(instance.url)}
                onRemove={() => handleRemove(instance.url)}
              />
            ))}
          </Reorder.Group>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground/60 mt-3 text-center">
        Top instances have higher priority. The app automatically fails over if one is unavailable.
      </p>
    </div>
  );
}
