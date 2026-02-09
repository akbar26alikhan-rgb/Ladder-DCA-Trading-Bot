
import React, { useState, useEffect, useRef } from 'react';
import { TradingEngine } from './services/tradingEngine';
import { DEFAULT_CONFIG } from './constants';
import { BotState, MarketTick, TradingConfig, ExchangeProvider } from './types';
import { StatCard } from './components/StatCard';
import { BotControls } from './components/BotControls';
import { LogFeed } from './components/LogFeed';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const App: React.FC = () => {
  const [config, setConfig] = useState<TradingConfig>(DEFAULT_CONFIG);
  const engineRef = useRef<TradingEngine | null>(null);
  const [botState, setBotState] = useState<BotState | null>(null);
  const [marketHistory, setMarketHistory] = useState<MarketTick[]>([]);
  const [equityHistory, setEquityHistory] = useState<{ time: number; equity: number }[]>([]);
  const [price, setPrice] = useState(50000);

  useEffect(() => {
    if (!engineRef.current) {
      engineRef.current = new TradingEngine(config);
      setBotState(engineRef.current.getState());
    }
  }, []);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.updateConfig(config);
      setBotState(engineRef.current.getState());
    }
  }, [config]);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (botState?.isPaused) return;

      setPrice(prev => {
        const volatility = 0.003;
        const change = prev * (volatility * (Math.random() - 0.5));
        const newPrice = prev + change;
        
        setMarketHistory(h => [...h.slice(-49), { timestamp: Date.now(), price: newPrice }]);
        
        if (engineRef.current) {
          engineRef.current.tick(newPrice).then(newState => {
            setBotState({ ...newState });
            const openValue = newState.positions.reduce((sum, p) => sum + (p.quantity * newPrice), 0);
            const currentEquity = newState.balance + openValue;
            setEquityHistory(eh => [...eh.slice(-99), { time: Date.now(), equity: currentEquity }]);
          });
        }
        return newPrice;
      });
    }, config.pollingIntervalMs);

    return () => clearInterval(interval);
  }, [botState?.isPaused, config.pollingIntervalMs]);

  const togglePause = () => {
    if (engineRef.current) {
      const currentPaused = engineRef.current.getState().isPaused;
      engineRef.current.setPaused(!currentPaused);
      setBotState(prev => prev ? { ...prev, isPaused: !currentPaused } : null);
    }
  };

  const emergencyStop = async () => {
    if (window.confirm("CRITICAL: Close all positions immediately at market price?")) {
      if (engineRef.current) {
        await engineRef.current.closeAllPositions("MANUAL_EMERGENCY_STOP");
        engineRef.current.setPaused(true);
        setBotState(engineRef.current.getState());
      }
    }
  };

  const resetData = () => {
    if (window.confirm("Wipe all local session data and reset bot?")) {
      localStorage.removeItem(`bot_state_${config.symbol}`);
      engineRef.current = new TradingEngine(config);
      setBotState(engineRef.current.getState());
      setMarketHistory([]);
      setEquityHistory([]);
      setPrice(50000);
    }
  };

  const currentEquity = botState ? (botState.balance + botState.positions.reduce((sum, p) => sum + (p.quantity * price), 0)) : 0;
  const unrealizedPnl = botState ? botState.positions.reduce((sum, p) => sum + (p.quantity * price - p.usdInvested), 0) : 0;

  return (
    <div className={`min-h-screen ${config.isLiveMode ? 'bg-[#1a0505]' : 'bg-[#0f172a]'} text-slate-200 flex flex-col md:flex-row transition-colors duration-500`}>
      <aside className={`w-full md:w-80 border-r p-6 flex-shrink-0 md:h-screen overflow-y-auto custom-scrollbar ${config.isLiveMode ? 'bg-[#2a0a0a] border-red-900/40' : 'bg-[#1e293b] border-slate-700'}`}>
        <BotControls 
          config={config} 
          onConfigChange={setConfig} 
          isPaused={botState?.isPaused ?? true}
          onTogglePause={togglePause}
          onReset={resetData}
          onEmergencyStop={emergencyStop}
          isConnected={botState?.isConnected ?? false}
        />
      </aside>

      <main className="flex-1 p-4 md:p-8 h-screen overflow-y-auto flex flex-col gap-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
          <div>
            <h1 className="text-3xl font-black text-white mb-1 flex items-center gap-3 italic">
              LADDERCORE.IO
              {config.isLiveMode && <span className="text-[10px] bg-red-600 px-2 py-1 rounded-sm animate-pulse tracking-widest font-black">LIVE</span>}
            </h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
              {config.isLiveMode ? `Executing via ${config.exchange} Spot API` : 'Paper Trading Simulator - No risk'}
            </p>
          </div>
          <div className={`flex items-center gap-4 p-4 rounded-2xl border shadow-2xl ${config.isLiveMode ? 'bg-red-950/40 border-red-700/50' : 'bg-slate-800 border-slate-700'}`}>
             <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Market Index</span>
                <span className={`text-2xl font-mono font-black ${config.isLiveMode ? 'text-red-400' : 'text-emerald-400'}`}>${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
             </div>
             <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${botState?.isPaused ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]'}`}>
                {botState?.isPaused ? 'Halted' : 'Active'}
             </div>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0">
          <StatCard label="Total Equity" value={`$${currentEquity.toFixed(2)}`} subValue={`${config.exchange} Network`} color="text-white" />
          <StatCard label="Portfolio Balance" value={`$${botState?.balance.toFixed(2) ?? '0.00'}`} color={config.isLiveMode ? 'text-red-400' : 'text-blue-400'} />
          <StatCard label="Realized PnL" value={`$${botState?.realizedPnl.toFixed(2) ?? '0.00'}`} color={botState?.realizedPnl && botState.realizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'} />
          <StatCard label="Session Float" value={`$${unrealizedPnl.toFixed(2)}`} color={unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
          <div className="lg:col-span-2 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
            <div className="bg-slate-800/40 border border-slate-700 p-6 rounded-2xl h-80 shadow-inner flex-shrink-0">
              <h3 className="text-[10px] font-bold text-slate-500 mb-4 uppercase tracking-[0.2em]">Growth Projection</h3>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={equityHistory}>
                  <defs>
                    <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={config.isLiveMode ? "#ef4444" : "#10b981"} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={config.isLiveMode ? "#ef4444" : "#10b981"} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                  <XAxis dataKey="time" hide />
                  <YAxis domain={['auto', 'auto']} stroke="#475569" fontSize={10} tickFormatter={(val) => `$${val.toFixed(0)}`} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px' }} labelStyle={{ display: 'none' }} formatter={(val: number) => [`$${val.toFixed(2)}`, 'Equity']} />
                  <Area type="monotone" dataKey="equity" stroke={config.isLiveMode ? "#ef4444" : "#10b981"} fillOpacity={1} fill="url(#colorEquity)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-slate-800/40 border border-slate-700 rounded-2xl overflow-hidden shadow-sm flex-1 flex flex-col min-h-[300px]">
              <div className="p-4 bg-slate-800/60 border-b border-slate-700 flex justify-between items-center">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Open Positions (FIFO Queue)</h3>
                <span className="text-[10px] text-slate-500 font-bold bg-slate-900 px-2 py-1 rounded">Active Levels: {botState?.positions.length}/{botState?.effectiveMaxLevels}</span>
              </div>
              <div className="overflow-x-auto flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left text-[11px]">
                  <thead className="sticky top-0 bg-slate-800 z-10">
                    <tr className="text-slate-500 border-b border-slate-700">
                      <th className="px-4 py-3 font-black uppercase tracking-tighter">Lot ID</th>
                      <th className="px-4 py-3 font-black uppercase tracking-tighter">Entry</th>
                      <th className="px-4 py-3 font-black uppercase tracking-tighter">Quantity</th>
                      <th className="px-4 py-3 font-black uppercase tracking-tighter">Target TP</th>
                      <th className="px-4 py-3 font-black uppercase tracking-tighter">PnL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {botState?.positions.map((pos) => {
                      const currentPnL = (price - pos.entryPrice) * pos.quantity;
                      return (
                        <tr key={pos.id} className="hover:bg-slate-700/20 transition-colors">
                          <td className="px-4 py-3 font-mono text-slate-500">{pos.id.slice(0, 8)}</td>
                          <td className="px-4 py-3 font-mono text-slate-300">${pos.entryPrice.toLocaleString()}</td>
                          <td className="px-4 py-3 font-mono text-slate-400">{pos.quantity.toFixed(6)}</td>
                          <td className="px-4 py-3 font-mono text-emerald-500">${pos.tpPrice.toLocaleString()}</td>
                          <td className={`px-4 py-3 font-mono font-black ${currentPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            ${currentPnL.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                    {botState?.positions.length === 0 && (
                      <tr><td colSpan={5} className="py-12 text-center text-slate-600 font-bold uppercase tracking-widest text-xs">Accumulation Pending</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1 h-full min-h-[400px]">
            <LogFeed logs={botState?.logs ?? []} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
