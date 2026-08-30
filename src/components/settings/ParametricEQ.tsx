import { useEqualizerStore } from '../../stores/equalizerStore';
import { useEffect, useState } from 'react';

export function ParametricEQ() {
  const {
    bandCount,
    gains,
    setGains,
    bandTypes,
    setBandTypes,
    bandQs,
    setBandQs,
    customFrequencies,
    setCustomFrequencies,
    freqMin,
    freqMax,
    setBandCount
  } = useEqualizerStore();

  const [localBands, setLocalBands] = useState<{type: string, freq: number, gain: number, q: number}[]>([]);

  useEffect(() => {
    // Generate default frequencies if customFrequencies is empty
    let freqs = customFrequencies || [];
    if (freqs.length === 0 || freqs.length !== bandCount) {
      const newFreqs = [];
      const safeMin = Math.max(10, freqMin);
      const safeMax = Math.min(96000, freqMax);
      for (let i = 0; i < bandCount; i++) {
        const t = i / (bandCount - 1);
        const freq = safeMin * Math.pow(safeMax / safeMin, t);
        newFreqs.push(Math.round(freq));
      }
      freqs = newFreqs;
      // Don't auto-set customFrequencies to avoid recursive render loops, just use locally until saved
    }

    const types = bandTypes && bandTypes.length === bandCount ? bandTypes : new Array(bandCount).fill('peaking');
    const qs = bandQs && bandQs.length === bandCount ? bandQs : new Array(bandCount).fill(1.41);
    
    setLocalBands(
      Array.from({ length: bandCount }).map((_, i) => ({
        type: types[i],
        freq: freqs[i],
        gain: gains[i] || 0,
        q: qs[i]
      }))
    );
  }, [bandCount, gains, bandTypes, bandQs, customFrequencies, freqMin, freqMax]);

  const updateBand = (index: number, field: string, value: any) => {
    const newBands = [...localBands];
    newBands[index] = { ...newBands[index], [field]: value };
    setLocalBands(newBands);
    
    // Sync to store
    if (field === 'gain') setGains(newBands.map(b => b.gain));
    if (field === 'type') setBandTypes(newBands.map(b => b.type));
    if (field === 'q') setBandQs(newBands.map(b => b.q));
    if (field === 'freq') setCustomFrequencies(newBands.map(b => b.freq));
  };

  const addBand = () => setBandCount(Math.min(32, bandCount + 1));
  const removeBand = () => setBandCount(Math.max(3, bandCount - 1));

  return (
    <div className="pt-2">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-cyan-300">Parametric Filters</h3>
        <div className="flex gap-2">
          <button onClick={addBand} className="text-xs px-2 py-1 bg-secondary rounded hover:bg-secondary/80">+ Add Band</button>
          <button onClick={removeBand} className="text-xs px-2 py-1 bg-secondary rounded hover:bg-secondary/80">- Remove Band</button>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="grid grid-cols-12 gap-2 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold px-2">
          <div className="col-span-1">#</div>
          <div className="col-span-3">Type</div>
          <div className="col-span-3">Freq (Hz)</div>
          <div className="col-span-3">Gain (dB)</div>
          <div className="col-span-2">Q</div>
        </div>
        
        {localBands.map((band, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-center bg-background/50 p-2 rounded border text-sm">
            <div className="col-span-1 text-muted-foreground text-xs">{i + 1}</div>
            <div className="col-span-3">
              <select 
                value={band.type} 
                onChange={e => updateBand(i, 'type', e.target.value)}
                className="w-full bg-transparent border-b border-border/50 focus:border-cyan-400 outline-none pb-1"
              >
                <option value="peaking">PK</option>
                <option value="lowshelf">LS</option>
                <option value="highshelf">HS</option>
              </select>
            </div>
            <div className="col-span-3">
              <input 
                type="number" 
                value={band.freq} 
                onChange={e => updateBand(i, 'freq', Number(e.target.value))}
                className="w-full bg-transparent border-b border-border/50 focus:border-cyan-400 outline-none pb-1"
              />
            </div>
            <div className="col-span-3">
              <input 
                type="number" 
                step="0.1"
                value={band.gain} 
                onChange={e => updateBand(i, 'gain', Number(e.target.value))}
                className="w-full bg-transparent border-b border-border/50 focus:border-cyan-400 outline-none pb-1"
              />
            </div>
            <div className="col-span-2">
              <input 
                type="number" 
                step="0.1"
                value={band.q} 
                onChange={e => updateBand(i, 'q', Number(e.target.value))}
                className="w-full bg-transparent border-b border-border/50 focus:border-cyan-400 outline-none pb-1"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
