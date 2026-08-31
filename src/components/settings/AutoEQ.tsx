import { useState, useEffect } from 'react';
import { useEqualizerStore } from '../../stores/equalizerStore';
import { fetchAutoEqIndex, POPULAR_HEADPHONES, fetchHeadphoneData } from '../../api/autoeq-importer';
import { TARGETS } from '../../api/autoeq-data';
import { runAutoEqAlgorithm } from '../../api/autoeq-engine';

export function AutoEQ() {
  const { setBandCount, setGains, setBandTypes, setBandQs, setCustomFrequencies, setPreamp, setPreset } = useEqualizerStore();
  const [headphones, setHeadphones] = useState(POPULAR_HEADPHONES);
  const [selectedHp, setSelectedHp] = useState(POPULAR_HEADPHONES[0].path);
  const [selectedTarget, setSelectedTarget] = useState('HARMAN_OE_2018');
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    fetchAutoEqIndex().then(data => {
      if (data && data.length > 0) {
        setHeadphones(data);
      }
    });
  }, []);

  const handleApply = async () => {
    setIsCalculating(true);
    try {
      const hp = headphones.find(h => h.path === selectedHp);
      if (!hp) throw new Error('Headphone not found');
      
      const measurement = await fetchHeadphoneData(hp);
      const target = TARGETS[selectedTarget];
      
      // Calculate 10 parametric bands (Standard AutoEQ)
      const filters = runAutoEqAlgorithm(measurement, target, 10);
      
      setBandCount(filters.length);
      setGains(filters.map(f => f.gain));
      setBandQs(filters.map(f => f.q));
      setCustomFrequencies(filters.map(f => f.freq));
      setBandTypes(filters.map(f => f.type.toLowerCase().includes('shelf') ? f.type : 'peaking'));
      
      // Reduce preamp to avoid clipping
      const maxGain = Math.max(...filters.map(f => f.gain));
      if (maxGain > 0) setPreamp(-maxGain - 0.5);
      
      setPreset('custom');
      alert('AutoEQ applied to Parametric EQ successfully!');
    } catch (e) {
      console.error(e);
      alert('Failed to apply AutoEQ');
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className="pt-2">
      <h3 className="text-sm font-semibold mb-4 text-cyan-300">AutoEQ (Headphone Correction)</h3>
      <p className="text-xs text-muted-foreground mb-4">Automatically generate parametric EQ filters to correct your headphone's frequency response to a target curve.</p>
      
      <div className="space-y-4">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Headphone Model</label>
          <select 
            value={selectedHp}
            onChange={e => setSelectedHp(e.target.value)}
            className="w-full bg-background border rounded px-2 py-1.5 text-sm"
          >
            {headphones.map((hp, i) => (
              <option key={i} value={hp.path}>{hp.name}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Target Curve</label>
          <select 
            value={selectedTarget}
            onChange={e => setSelectedTarget(e.target.value)}
            className="w-full bg-background border rounded px-2 py-1.5 text-sm"
          >
            {Object.entries(TARGETS).map(([key, target]: [string, any]) => ( // eslint-disable-line @typescript-eslint/no-explicit-any
              <option key={key} value={key}>{target.name}</option>
            ))}
          </select>
        </div>
        
        <button 
          onClick={handleApply}
          disabled={isCalculating}
          className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-sm font-medium transition-colors disabled:opacity-50"
        >
          {isCalculating ? 'Calculating...' : 'Calculate & Apply to Parametric EQ'}
        </button>
      </div>
    </div>
  );
}
