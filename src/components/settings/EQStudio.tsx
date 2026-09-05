import { useState } from 'react';
import { GraphicEQ } from './GraphicEQ';
import { ParametricEQ } from './ParametricEQ';
import { AutoEQ } from './AutoEQ';
import { useEqualizerStore } from '@/stores/equalizerStore';
import { Power } from 'lucide-react';
// import { SpeakerEQ } from './SpeakerEQ';

export function EQStudio() {
  const [activeTab, setActiveTab] = useState<'legacy' | 'parametric' | 'autoeq' | 'speaker'>('legacy');
  const { enabled, setEnabled, preset } = useEqualizerStore();

  return (
    <div className="mt-4 border rounded-xl bg-card/30 overflow-hidden border-white/10">
      {/* Studio Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-background/80 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase font-bold tracking-wider text-white/70">Audio DSP Studio</span>
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-400/30">
            {preset}
          </span>
        </div>

        <button
          onClick={() => setEnabled(!enabled)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
            enabled
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
              : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10'
          }`}
        >
          <Power size={13} className={enabled ? 'text-cyan-400' : 'text-white/40'} />
          <span>{enabled ? 'DSP Active' : 'DSP Bypassed'}</span>
        </button>
      </div>
      {/* Tabs */}
      <div className="flex border-b bg-background/50 text-sm">
        <button
          className={`flex-1 py-2 font-medium transition-colors ${activeTab === 'legacy' ? 'text-cyan-300 border-b-2 border-cyan-400' : 'text-muted-foreground hover:text-foreground'}`}
          onClick={() => setActiveTab('legacy')}
        >
          Legacy
        </button>
        <button
          className={`flex-1 py-2 font-medium transition-colors ${activeTab === 'parametric' ? 'text-cyan-300 border-b-2 border-cyan-400' : 'text-muted-foreground hover:text-foreground'}`}
          onClick={() => setActiveTab('parametric')}
        >
          Parametric
        </button>
        <button
          className={`flex-1 py-2 font-medium transition-colors ${activeTab === 'autoeq' ? 'text-cyan-300 border-b-2 border-cyan-400' : 'text-muted-foreground hover:text-foreground'}`}
          onClick={() => setActiveTab('autoeq')}
        >
          AutoEQ
        </button>
        <button
          className={`flex-1 py-2 font-medium transition-colors ${activeTab === 'speaker' ? 'text-cyan-300 border-b-2 border-cyan-400' : 'text-muted-foreground hover:text-foreground'}`}
          onClick={() => setActiveTab('speaker')}
        >
          Speaker
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'legacy' && <GraphicEQ />}
        {activeTab === 'parametric' && <ParametricEQ />}
        {activeTab === 'autoeq' && <AutoEQ />}
        {activeTab === 'speaker' && <div className="text-center py-10 text-muted-foreground">Speaker Room Correction - Coming Soon</div>}
      </div>
    </div>
  );
}
