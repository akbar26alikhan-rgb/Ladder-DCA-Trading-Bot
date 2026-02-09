
import React from 'react';
import { TradeLog } from '../types';

interface LogFeedProps {
  logs: TradeLog[];
}

export const LogFeed: React.FC<LogFeedProps> = ({ logs }) => {
  const getActionColor = (action: TradeLog['action']) => {
    switch (action) {
      case 'BUY': return 'text-emerald-400';
      case 'SELL': return 'text-amber-400';
      case 'ERROR': return 'text-red-400';
      case 'SYSTEM': return 'text-blue-400';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="bg-slate-800/40 border border-slate-700 rounded-2xl overflow-hidden flex flex-col h-full">
      <div className="p-4 bg-slate-800/60 border-b border-slate-700 flex justify-between items-center">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Operational Logs</h3>
        <span className="text-[10px] text-slate-500">{logs.length} entries</span>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1 font-mono text-[10px]">
        {logs.map((log) => (
          <div key={log.id} className="p-2 bg-slate-900/50 rounded border border-slate-800 hover:border-slate-700 transition-colors">
            <div className="flex justify-between items-center mb-1">
              <span className={`font-black ${getActionColor(log.action)}`}>{log.action}</span>
              <span className="text-slate-600">{new Date(log.timestamp).toLocaleTimeString()}</span>
            </div>
            <div className="text-slate-300 leading-relaxed">{log.message}</div>
            {log.amount > 0 && (
              <div className="mt-1 text-slate-500 flex gap-3">
                <span>Price: ${log.price.toLocaleString()}</span>
                <span>Amount: ${log.amount.toFixed(2)}</span>
              </div>
            )}
          </div>
        ))}
        {logs.length === 0 && (
          <div className="text-center text-slate-600 mt-10 italic">Waiting for market events...</div>
        )}
      </div>
    </div>
  );
};
