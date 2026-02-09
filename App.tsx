
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TradingEngine } from './services/tradingEngine';
import { DEFAULT_CONFIG } from './constants';
import { BotState, MarketTick, TradingConfig, PositionStatus } from './types';
import { StatCard } from './components/StatCard';
import { BotControls } from './components/BotControls';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const App: React.FC = () => {
  const [config, setConfig] = useState<TradingConfig>(DEFAULT_CONFIG);
  const engineRef = useRef<TradingEngine | null>(null);
  const [botState, setBotState] = useState<BotState | null>(null);
  const [marketHistory, setMarketHistory] = useState<MarketTick[]>([]);
  const [equityHistory, setEquityHistory] = useState<{ time: number; equity: number }[]>([]);
  
  // Simulation params
  const [price, setPrice] = useState(50000);
  const [tickCount, setTickCount] = useState(0);

  // Initialize engine
  useEffect(() => {
    if (!engineRef.current) {
      engineRef.current = new TradingEngine(config);
      setBotState(engineRef.current.getState());
    }
  }, []);

  // Sync config
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.updateConfig(config);
    }
  }, [config]);

  // Main Simulation Loop
  useEffect(() => {
    const interval = setInterval(() => {
      if (botState?.isPaused) return;

      // Simple Price Simulation (Random Walk)
      setPrice(prev => {
        const volatility = 0.002; // 0.2% per tick
        const change = prev * (volatility * (Math.random() - 0.5));
        const newPrice = prev + change;
        
        // Push price to history
        setMarketHistory(h => [...h.slice(-49), { timestamp: Date.now(), price: newPrice }]);
        
        // Update Trading Engine
        if (engineRef.current) {
          const newState = engineRef.current.tick(newPrice);
          setBotState({ ...newState });
          
          // Calculate Equity for history
          const openValue = newState.positions.reduce((sum, p) => sum + (p.quantity * newPrice), 0);
          const currentEquity = newState.balance + openValue;
          setEquityHistory(eh => [...eh.slice(-99), { time: Date.now(), equity: currentEquity }]);
        }

        return newPrice;
      });

      setTickCount(t => t + 1);
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

  const resetData = () => {
    if (window.confirm("Reset all trading data and start over?")) {
      engineRef.current = new TradingEngine(config);
      setBotState(engineRef.current.getState());
      setMarketHistory([]);
      setEquityHistory([]);
      setPrice(50000);
    }
  };

  const calculateUnrealizedPnl = () => {
    if (!botState) return 0;
    return botState.positions.reduce((sum, p) => sum + (p.quantity * price - p.usdInvested), 0);
  };

  const currentEquity = botState ? (botState.balance + botState.positions.reduce((sum, p) => sum + (p.quantity * price), 0)) : 0;
  const unrealizedPnl = calculateUnrealizedPnl();

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 flex flex-col md:flex-row">
      {/* Sidebar Controls - Now naturally scrollable with the page if content exceeds height */}
      <aside className="w-full md:w-80 bg-[#1e293b] border-r border-slate-700 p-6 flex-shrink-0 md:min-h-screen">
        <BotControls 
          config={config} 
          onConfigChange={setConfig} 
          isPaused={botState?.isPaused ?? true}
          onTogglePause={togglePause}
          onReset={resetData}
        />
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Trading Dashboard</h1>
            <p className="text-slate-400 text-sm">Automated Ladder DCA & FIFO Exit System</p>
          </div>
          <div className="flex items-center gap-3 bg-slate-800 p-3 rounded-xl border border-slate-700 shadow-lg shadow-black/20">
             <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Current Price</span>
                <span className="text-xl font-mono text-blue-400">${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
             </div>
             <div className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter ${botState?.isPaused ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                {botState?.isPaused ? 'STOPPED' : 'LIVE'}
             </div>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard 
            label="Total Equity" 
            value={`$${currentEquity.toFixed(2)}`} 
            subValue={`Base: $${config.initialCapital}`}
            color="text-white"
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
          />
          <StatCard 
            label="Available Balance" 
            value={`$${botState?.balance.toFixed(2) ?? '0.00'}`} 
            color="text-blue-400"
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>}
          />
          <StatCard 
            label="Realized PnL" 
            value={`$${botState?.realizedPnl.toFixed(2) ?? '0.00'}`} 
            color={botState?.realizedPnl && botState.realizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>}
          />
          <StatCard 
            label="Unrealized PnL" 
            value={`$${unrealizedPnl.toFixed(2)}`} 
            color={unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>}
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-slate-800/40 border border-slate-700 p-6 rounded-2xl h-80 shadow-inner">
            <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-wider">Equity Curve</h3>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityHistory}>
                <defs>
                  <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis dataKey="time" hide />
                <YAxis domain={['auto', 'auto']} stroke="#94a3b8" fontSize={10} tickFormatter={(val) => `$${val.toFixed(0)}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}
                  labelStyle={{ display: 'none' }}
                  formatter={(val: number) => [`$${val.toFixed(2)}`, 'Equity']}
                />
                <Area type="monotone" dataKey="equity" stroke="#3b82f6" fillOpacity={1} fill="url(#colorEquity)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-slate-800/40 border border-slate-700 p-6 rounded-2xl h-80 shadow-inner">
            <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-wider">Market Price</h3>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={marketHistory}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis dataKey="timestamp" hide />
                <YAxis domain={['auto', 'auto']} stroke="#94a3b8" fontSize={10} tickFormatter={(val) => `$${val.toFixed(0)}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}
                  labelStyle={{ display: 'none' }}
                  formatter={(val: number) => [`$${val.toLocaleString()}`, 'Price']}
                />
                <Line type="stepAfter" dataKey="price" stroke="#fbbf24" strokeWidth={2} dot={false} animationDuration={300} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Position Tables */}
        <div className="grid grid-cols-1 gap-6">
          <div className="bg-slate-800/40 border border-slate-700 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-800/60 border-b border-slate-700 flex justify-between items-center">
              <div className="flex flex-col">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Open Positions ({botState?.positions.length ?? 0})</h3>
                <span className="text-[10px] text-slate-400">Limit: {botState?.effectiveMaxLevels} Levels</span>
              </div>
              <div className="text-xs text-slate-400 bg-slate-700/50 px-2 py-1 rounded-md border border-slate-600">
                Mode: {config.useDynamicDcaLevels ? `Dynamic (${config.dcaLevelsEquityPercent}%)` : 'Fixed'}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-700">
                    <th className="px-4 py-3 font-medium">Entry Price</th>
                    <th className="px-4 py-3 font-medium">Quantity</th>
                    <th className="px-4 py-3 font-medium">Invested</th>
                    <th className="px-4 py-3 font-medium">Target TP</th>
                    <th className="px-4 py-3 font-medium">Current PnL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {botState?.positions.map((pos) => {
                    const currentPnL = (price - pos.entryPrice) * pos.quantity;
                    return (
                      <tr key={pos.id} className="hover:bg-slate-700/30 transition-colors">
                        <td className="px-4 py-3 font-mono">${pos.entryPrice.toLocaleString()}</td>
                        <td className="px-4 py-3 font-mono">{pos.quantity.toFixed(6)}</td>
                        <td className="px-4 py-3 font-mono">${pos.usdInvested.toFixed(2)}</td>
                        <td className="px-4 py-3 font-mono text-emerald-500 font-semibold">${pos.tpPrice.toLocaleString()}</td>
                        <td className={`px-4 py-3 font-mono font-bold ${currentPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          ${currentPnL.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                  {!botState?.positions.length && (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-slate-500 italic">No open positions currently active</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-slate-800/40 border border-slate-700 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-800/60 border-b border-slate-700">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Trade History (FIFO)</h3>
            </div>
            <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-800 z-10 shadow-sm">
                  <tr className="text-slate-500 border-b border-slate-700">
                    <th className="px-4 py-3 font-medium">Entry</th>
                    <th className="px-4 py-3 font-medium">Exit</th>
                    <th className="px-4 py-3 font-medium">Lot Size</th>
                    <th className="px-4 py-3 font-medium">Time</th>
                    <th className="px-4 py-3 font-medium">Profit/Loss</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {botState?.history.map((pos) => (
                    <tr key={pos.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3 font-mono">${pos.entryPrice.toLocaleString()}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-slate-300">${pos.exitPrice?.toLocaleString()}</td>
                      <td className="px-4 py-3 font-mono text-slate-400">${pos.usdInvested.toFixed(2)}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {pos.exitTime ? new Date(pos.exitTime).toLocaleTimeString() : '-'}
                      </td>
                      <td className={`px-4 py-3 font-mono font-bold ${pos.pnlUsd && pos.pnlUsd >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        ${pos.pnlUsd?.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {!botState?.history.length && (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-slate-500 italic">No closed trades yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
