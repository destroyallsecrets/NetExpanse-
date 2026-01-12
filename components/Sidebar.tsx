import React from 'react';
import { Player, Process, Server } from '../types';
import { formatMoney } from '../services/utils';

interface SidebarProps {
  player: Player;
  processes: Process[];
  homeServer: Server;
  currentView: string;
  onChangeView: (view: 'TERMINAL' | 'LEADERBOARD' | 'WORLD') => void;
  killProcess: (pid: number) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  player, 
  processes, 
  homeServer, 
  currentView, 
  onChangeView,
  killProcess
}) => {
  return (
    <div className="w-64 bg-slate-900 border-r border-slate-700 flex flex-col h-full shrink-0">
      <div className="p-4 border-b border-slate-700">
        <h1 className="text-xl font-bold text-emerald-400 tracking-wider glow-text">NET_EXPANSE</h1>
        <div className="text-xs text-slate-500 mt-1">v2.0.0-BETA</div>
      </div>

      <div className="p-4 space-y-4 border-b border-slate-700">
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Credits</div>
          <div className="text-lg text-yellow-400 font-mono">{formatMoney(player.credits)}</div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Hacking</div>
            <div className="text-emerald-400 font-mono text-lg">{player.hackingSkill}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">EXP</div>
            <div className="text-cyan-400 font-mono text-lg">{player.exp.toLocaleString()}</div>
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Home RAM</div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-fuchsia-500 h-full transition-all duration-300"
              style={{ width: `${(homeServer.ramUsed / homeServer.maxRam) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-1 font-mono">
            <span>{homeServer.ramUsed.toFixed(1)} GB</span>
            <span>{homeServer.maxRam} GB</span>
          </div>
        </div>
      </div>

      <nav className="p-2 space-y-1">
        {['TERMINAL', 'LEADERBOARD', 'WORLD'].map((view) => (
          <button
            key={view}
            onClick={() => onChangeView(view as any)}
            className={`w-full text-left px-3 py-2 rounded text-sm font-mono transition-colors ${
              currentView === view 
                ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-900/50' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            {view}
          </button>
        ))}
      </nav>

      <div className="flex-1 overflow-hidden flex flex-col p-4">
        <div className="text-xs text-slate-500 uppercase tracking-widest mb-2 flex justify-between items-center">
          <span>Active Processes</span>
          <span className="bg-slate-800 text-slate-300 px-1.5 rounded">{processes.length}</span>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {processes.map((proc) => (
            <div key={proc.pid} className="bg-slate-800/50 p-2 rounded border border-slate-700/50 text-xs">
              <div className="flex justify-between text-slate-300 mb-1">
                <span className="font-bold">{proc.filename}</span>
                <button 
                  onClick={() => killProcess(proc.pid)}
                  className="text-red-500 hover:text-red-400"
                >
                  [KILL]
                </button>
              </div>
              <div className="flex justify-between text-slate-500 mb-1">
                <span>{proc.target}</span>
                <span className={
                  proc.operation === 'GROW' ? 'text-green-400' :
                  proc.operation === 'WEAKEN' ? 'text-yellow-400' :
                  'text-red-400'
                }>{proc.operation}</span>
              </div>
              <div className="w-full bg-slate-700 h-1 rounded-full overflow-hidden">
                <div 
                  className="bg-cyan-500 h-full transition-all duration-200 ease-linear"
                  style={{ width: `${proc.progress}%` }}
                />
              </div>
            </div>
          ))}
          {processes.length === 0 && (
             <div className="text-slate-600 text-center py-4 italic">No active scripts</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
