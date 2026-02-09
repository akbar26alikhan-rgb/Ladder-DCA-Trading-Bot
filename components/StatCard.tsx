
import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  color?: string;
  icon?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, subValue, color = 'text-white', icon }) => {
  return (
    <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl shadow-sm backdrop-blur-md">
      <div className="flex justify-between items-start mb-2">
        <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">{label}</span>
        <div className="p-1.5 bg-slate-700/50 rounded-lg text-slate-300">
          {icon}
        </div>
      </div>
      <div className={`text-2xl font-bold font-mono ${color}`}>{value}</div>
      {subValue && (
        <div className="text-xs text-slate-500 mt-1">{subValue}</div>
      )}
    </div>
  );
};
