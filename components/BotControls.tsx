
import React, { useState, useRef, useEffect } from 'react';
import { TradingConfig, ExchangeProvider } from '../types';
import { SYMBOLS } from '../constants';

interface BotControlsProps {
  config: TradingConfig;
  onConfigChange: (config: TradingConfig) => void;
  isPaused: boolean;
  onTogglePause: () => void;
  onReset: () => void;
  onEmergencyStop: () => void;
  isConnected: boolean;
}

export const BotControls: React.FC<BotControlsProps> = ({ 
  config, 
  onConfigChange, 
  isPaused, 
  onTogglePause,
  onReset,
  onEmergencyStop,
  isConnected
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredSymbols = SYMBOLS.filter(s => s.toLowerCase().includes(searchTerm.toLowerCase()));

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
    onConfigChange({ ...config, [name]: val });
  };

  const handleCredentialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onConfigChange({ ...config, credentials: { ...config.credentials, [name]: value } });
  };

  const selectSymbol = (symbol: string) => {
    onConfigChange({ ...config, symbol });
    setSearchTerm('');
    setIsDropdownOpen(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-6">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
          Exchange Adapter
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] text-slate-500 mb-1.5 font-bold uppercase tracking-widest">Select Platform</label>
            <select name="exchange" value={config.exchange} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm">
              {Object.values(ExchangeProvider).map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {config.exchange !== ExchangeProvider.SIMULATED && (
            <div className="space-y-3 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Secure API Access</span>
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`}></div>
              </div>
              <input type="password" name="apiKey" placeholder="API Key" value={config.credentials.apiKey} onChange={handleCredentialChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs" />
              <input type="password" name="apiSecret" placeholder="API Secret" value={config.credentials.apiSecret} onChange={handleCredentialChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs" />
              {(config.exchange === ExchangeProvider.KUCOIN || config.exchange === ExchangeProvider.OKX) && (
                <input type="password" name="passphrase" placeholder="API Passphrase" value={config.credentials.passphrase || ''} onChange={(e) => onConfigChange({...config, credentials: {...config.credentials, passphrase: e.target.value}})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs" />
              )}
              <div className="flex items-center justify-between pt-2">
                <span className="text-[10px] text-red-500 font-bold uppercase tracking-widest">Live Trading</span>
                <input type="checkbox" name="isLiveMode" checked={config.isLiveMode} onChange={handleChange} className="w-4 h-4 rounded text-red-600 bg-slate-700" />
              </div>
            </div>
          )}
        </div>

        <h2 className="text-lg font-bold flex items-center gap-2 pt-4 border-t border-slate-700/50">
          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
          DCA Strategy
        </h2>

        <div className="space-y-4">
          <div className="relative" ref={dropdownRef}>
            <label className="block text-[10px] text-slate-500 mb-1.5 font-bold uppercase tracking-widest">Trading Pair</label>
            <div className="relative">
              <input type="text" placeholder={config.symbol} value={searchTerm} onFocus={() => setIsDropdownOpen(true)} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2.5 text-sm" />
              <div className="absolute left-3 top-3 text-slate-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></div>
            </div>
            {isDropdownOpen && (
              <div className="absolute z-50 mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-2xl max-h-48 overflow-y-auto">
                {filteredSymbols.map(s => <button key={s} onClick={() => selectSymbol(s)} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-blue-600/20 ${config.symbol === s ? 'text-blue-400' : 'text-slate-300'}`}>{s}</button>)}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-slate-500 mb-1.5 font-bold">Buy %</label>
              <input type="number" name="allocationRate" value={config.allocationRate} step="0.01" onChange={(e) => onConfigChange({...config, allocationRate: parseFloat(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-1.5 font-bold">Dip %</label>
              <input type="number" name="dipTriggerPercent" value={config.dipTriggerPercent} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-slate-500 mb-1.5 font-bold">TP %</label>
              <input type="number" name="takeProfitPercent" value={config.takeProfitPercent} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-1.5 font-bold">SL %</label>
              <input type="number" name="stopLossPercent" value={config.stopLossPercent} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
        </div>

        <h2 className="text-lg font-bold flex items-center gap-2 pt-4 border-t border-slate-700/50">
          <span className="w-2 h-2 bg-red-500 rounded-full"></span>
          Safety controls
        </h2>

        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">Daily Loss Limit ($)</span>
              <input type="number" name="maxDailyLossLimit" value={config.maxDailyLossLimit || 0} onChange={handleChange} className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-right" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">Global Drawdown %</span>
              <input type="number" name="maxDrawdownPercent" value={config.maxDrawdownPercent} onChange={handleChange} className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-right" />
            </div>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-slate-700/50 space-y-3">
        <button 
          onClick={onTogglePause}
          disabled={config.isLiveMode && !isConnected}
          className={`w-full py-4 rounded-xl font-bold text-xs tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50 ${isPaused ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20' : 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/20'}`}
        >
          {isPaused ? 'ACTIVATE BOT' : 'HALT BOT'}
        </button>
        <button 
          onClick={onEmergencyStop}
          className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold tracking-widest transition-all shadow-lg shadow-red-900/40 active:scale-95"
        >
          EMERGENCY SELL ALL
        </button>
        <button onClick={onReset} className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-500 rounded-xl text-[10px] font-bold tracking-widest">
          FLUSH CACHE & RESET
        </button>
      </div>
    </div>
  );
};
