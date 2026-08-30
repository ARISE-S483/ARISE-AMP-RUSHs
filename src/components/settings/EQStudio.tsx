import { useState } from 'react';
import { GraphicEQ } from './GraphicEQ';
import { ParametricEQ } from './ParametricEQ';
import { AutoEQ } from './AutoEQ';
// import { SpeakerEQ } from './SpeakerEQ';

export function EQStudio() {
  const [activeTab, setActiveTab] = useState<'legacy' | 'parametric' | 'autoeq' | 'speaker'>('legacy');

  return (
    <div className="mt-4 border rounded-lg bg-card/30 overflow-hidden">
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
