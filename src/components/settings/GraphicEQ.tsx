import { useEqualizerStore } from '../../stores/equalizerStore';

export function GraphicEQ() {
  const {
    enabled,
    bandCount,
    freqMin,
    freqMax,
    gains,
    preamp,
    preset,
    setEnabled,
    setBandCount,
    setFreqRange,
    setGains,
    setPreamp,
    setPreset,
  } = useEqualizerStore();

  const handleGainChange = (index: number, value: number) => {
    const newGains = [...gains];
    newGains[index] = value;
    setGains(newGains);
    // Custom preset triggers when modified manually
    if (preset !== 'custom') setPreset('custom');
  };

  const handleReset = () => {
    setGains(new Array(bandCount).fill(0));
    setPreamp(0);
    setPreset('flat');
  };

  // Generate frequencies just like equalizer.ts for UI display
  const frequencies = [];
  const safeMin = Math.max(10, freqMin);
  const safeMax = Math.min(96000, freqMax);
  for (let i = 0; i < bandCount; i++) {
    const t = i / (bandCount - 1);
    const freq = safeMin * Math.pow(safeMax / safeMin, t);
    frequencies.push(Math.round(freq));
  }

  const formatFreq = (f: number) => {
    if (f < 1000) return f.toString();
    if (f < 10000) return (f / 1000).toFixed(f % 1000 === 0 ? 0 : 1) + 'K';
    return (f / 1000).toFixed(0) + 'K';
  };

  if (!enabled) return null;

  return (
    <div className="pt-2">
      <h3 className="text-sm font-semibold mb-4 text-cyan-300">Graphic Equalizer (Legacy)</h3>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Band Count</label>
          <select
            value={String(bandCount)}
            onChange={(e) => setBandCount(Number(e.target.value))}
            className="w-full bg-background border rounded px-2 py-1.5 text-sm"
          >
            <option value="3">3 Bands (Simple)</option>
            <option value="5">5 Bands</option>
            <option value="10">10 Bands (Standard)</option>
            <option value="16">16 Bands</option>
            <option value="32">32 Bands (Detailed)</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Preset</label>
          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value)}
            className="w-full bg-background border rounded px-2 py-1.5 text-sm"
          >
            <option value="flat">Flat</option>
            <option value="bass_boost">Bass Boost</option>
            <option value="bass_reducer">Bass Reducer</option>
            <option value="treble_boost">Treble Boost</option>
            <option value="vocal_boost">Vocal Boost</option>
            <option value="rock">Rock</option>
            <option value="pop">Pop</option>
            <option value="electronic">Electronic</option>
            <option value="custom">Custom</option>
          </select>
        </div>
      </div>

      <div className="flex gap-4 mb-6 items-center">
        <div className="flex-1">
          <label className="text-xs text-muted-foreground block mb-1">Freq Min (Hz)</label>
          <input 
            type="number" 
            value={freqMin} 
            onChange={(e) => setFreqRange(Number(e.target.value), freqMax)}
            className="w-full bg-background border rounded px-2 py-1 text-sm" 
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-muted-foreground block mb-1">Freq Max (Hz)</label>
          <input 
            type="number" 
            value={freqMax} 
            onChange={(e) => setFreqRange(freqMin, Number(e.target.value))}
            className="w-full bg-background border rounded px-2 py-1 text-sm" 
          />
        </div>
        <button 
          onClick={handleReset}
          className="mt-5 px-4 py-1 text-sm border rounded bg-background hover:bg-card transition-colors"
        >
          Reset
        </button>
      </div>

      <div className="flex items-end h-48 gap-1 mb-8 overflow-x-auto pb-4 custom-scrollbar">
        {gains.map((gain, i) => (
          <div key={i} className="flex flex-col items-center flex-1 min-w-[30px]">
            <span className="text-[10px] text-muted-foreground mb-2">{gain > 0 ? `+${gain.toFixed(1)}` : gain.toFixed(1)}</span>
            <input
              type="range"
              min="-30"
              max="30"
              step="0.1"
              value={gain}
              onChange={(e) => handleGainChange(i, Number(e.target.value))}
              className="w-2 h-32 appearance-none bg-border rounded-full outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 cursor-pointer"
              style={{ writingMode: 'bt-lr', WebkitAppearance: 'slider-vertical' } as unknown as React.CSSProperties}
            />
            <span className="text-[10px] text-muted-foreground mt-2 w-full text-center truncate" title={formatFreq(frequencies[i])}>
              {formatFreq(frequencies[i])}
            </span>
          </div>
        ))}
      </div>

      <div className="border-t pt-4">
        <label className="text-xs text-muted-foreground block mb-2">Preamp ({preamp > 0 ? `+${preamp}` : preamp} dB)</label>
        <input
          type="range"
          min="-20"
          max="20"
          step="0.1"
          value={preamp}
          onChange={(e) => setPreamp(Number(e.target.value))}
          className="w-full h-1 bg-border rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400"
        />
      </div>
    </div>
  );
}
