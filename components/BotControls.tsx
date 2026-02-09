
import React, { useState, useRef, useEffect } from 'react';
import { TradingConfig } from '../types';
import { SYMBOLS } from '../constants';

interface BotControlsProps {
  config: TradingConfig;
  onConfigChange: (config: TradingConfig) => void;
  isPaused: boolean;
  onTogglePause: () => void;
  onReset: () => void;
}

export const BotControls: React.FC<BotControlsProps> = ({ 
  config, 
  onConfigChange, 
  isPaused, 
  onTogglePause,
  onReset 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredSymbols = SYMBOLS.filter(s => 
    s.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : (type === 'number' ? parseFloat(value) : value);
    
    onConfigChange({
      ...config,
      [name]: val,
    });
  };

  const selectSymbol = (symbol: string) => {
    onConfigChange({ ...config, symbol });
    setSearchTerm('');
    setIsDropdownOpen(false);
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="space-y-6">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
          Bot Configuration
        </h2>

        <div className="space-y-5">
          {/* Searchable Pair Selector */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-xs text-slate-400 mb-1.5 font-semibold uppercase tracking-wider">Search & Select Pair</label>
            <div className="relative">
              <input 
                type="text" 
                placeholder={config.symbol}
                value={searchTerm}
                onFocus={() => setIsDropdownOpen(true)}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchTerm) {
                    selectSymbol(searchTerm.toUpperCase());
                  }
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              />
              <div className="absolute left-3 top-3 text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {isDropdownOpen && (
              <div className="absolute z-50 mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-2xl max-h-64 overflow-y-auto custom-scrollbar">
                {filteredSymbols.length > 0 ? (
                  filteredSymbols.map(s => (
                    <button
                      key={s}
                      onClick={() => selectSymbol(s)}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-blue-600/20 hover:text-blue-400 transition-colors ${config.symbol === s ? 'bg-blue-600/10 text-blue-400' : 'text-slate-300'}`}
                    >
                      {s}
                    </button>
                  ))
                ) : (
                  <button
                    onClick={() => selectSymbol(searchTerm.toUpperCase())}
                    className="w-full text-left px-4 py-3 text-xs text-slate-400 italic hover:bg-slate-700 transition-colors"
                  >
                    No matches. Press Enter to use "{searchTerm.toUpperCase()}"
                  </button>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-semibold uppercase tracking-wider">Allocation Rate (%)</label>
            <input 
              type="number" 
              name="allocationRate" 
              value={config.allocationRate} 
              step="0.01"
              onChange={(e) => onConfigChange({ ...config, allocationRate: parseFloat(e.target.value) })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-semibold uppercase tracking-wider">Dip Trigger (%)</label>
              <input 
                type="number" 
                name="dipTriggerPercent" 
                value={config.dipTriggerPercent} 
                onChange={handleChange}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-semibold uppercase tracking-wider">Take Profit (%)</label>
              <input 
                type="number" 
                name="takeProfitPercent" 
                value={config.takeProfitPercent} 
                onChange={handleChange}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
          </div>

          <div className="space-y-3 py-2">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
              <span className="text-sm font-medium">Dynamic DCA Levels</span>
              <input 
                type="checkbox" 
                name="useDynamicDcaLevels" 
                checked={config.useDynamicDcaLevels} 
                onChange={handleChange}
                className="w-5 h-5 rounded text-blue-600 bg-slate-700 border-slate-600 focus:ring-blue-500"
              />
            </div>

            {config.useDynamicDcaLevels ? (
              <div className="px-1">
                <label className="block text-xs text-slate-400 mb-2 font-semibold uppercase tracking-wider">Equity % for Levels</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="range" 
                    name="dcaLevelsEquityPercent" 
                    min="1" 
                    max="100" 
                    value={config.dcaLevelsEquityPercent} 
                    onChange={handleChange}
                    className="flex-1 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <span className="text-sm font-mono font-bold text-blue-400 min-w-[3ch]">{config.dcaLevelsEquityPercent}%</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-2 italic">Max Levels = floor(Equity * {config.dcaLevelsEquityPercent}%)</p>
              </div>
            ) : (
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-semibold uppercase tracking-wider">Max DCA Levels (Fixed)</label>
                <input 
                  type="number" 
                  name="maxDcaLevels" 
                  value={config.maxDcaLevels} 
                  onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
            )}

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
              <span className="text-sm font-medium">Enable FIFO Exit</span>
              <input 
                type="checkbox" 
                name="enableFifoExit" 
                checked={config.enableFifoExit} 
                onChange={handleChange}
                className="w-5 h-5 rounded text-blue-600 bg-slate-700 border-slate-600 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
              <span className="text-sm font-medium">Enable Stop Loss</span>
              <input 
                type="checkbox" 
                name="enableStopLoss" 
                checked={config.enableStopLoss} 
                onChange={handleChange}
                className="w-5 h-5 rounded text-blue-600 bg-slate-700 border-slate-600 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
              <span className="text-sm font-medium">Drawdown Protection</span>
              <input 
                type="checkbox" 
                name="enableGlobalDrawdown" 
                checked={config.enableGlobalDrawdown} 
                onChange={handleChange}
                className="w-5 h-5 rounded text-blue-600 bg-slate-700 border-slate-600 focus:ring-blue-500"
              />
            </div>
          </div>

          {(config.enableStopLoss || config.enableGlobalDrawdown) && (
             <div className="grid grid-cols-1 gap-4">
                {config.enableStopLoss && (
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5 font-semibold uppercase tracking-wider">Stop Loss (%)</label>
                    <input 
                      type="number" 
                      name="stopLossPercent" 
                      value={config.stopLossPercent} 
                      onChange={handleChange}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                )}
                {config.enableGlobalDrawdown && (
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5 font-semibold uppercase tracking-wider">Max Drawdown (%)</label>
                    <input 
                      type="number" 
                      name="maxDrawdownPercent" 
                      value={config.maxDrawdownPercent} 
                      onChange={handleChange}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                )}
             </div>
          )}
        </div>
      </div>

      <div className="pt-8 border-t border-slate-700/50 space-y-4">
        <button 
          onClick={onTogglePause}
          className={`w-full py-4 rounded-xl font-bold text-sm tracking-widest transition-all shadow-lg hover:shadow-xl active:scale-95 ${
            isPaused 
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20' 
              : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/20'
          }`}
        >
          {isPaused ? 'RESUME TRADING' : 'PAUSE TRADING'}
        </button>
        <button 
          onClick={onReset}
          className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 rounded-xl text-xs font-bold tracking-widest transition-all active:scale-95"
        >
          RESET ALL DATA
        </button>
      </div>
    </div>
  );
};
