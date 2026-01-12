import React from 'react';
import { Player, RivalOperative } from '../types';

interface LeaderboardProps {
  player: Player;
  rivals: RivalOperative[];
}

const Leaderboard: React.FC<LeaderboardProps> = ({ player, rivals }) => {
  const allHackers = [
    { 
        name: 'YOU', 
        faction: 'Freelance', 
        reputation: player.exp, 
        isOnline: true, 
        color: 'text-emerald-400', 
        isPlayer: true,
        currentHost: 'home',
        skill: player.hackingSkill,
        strategy: 'PLAYER'
    },
    ...rivals.map(r => ({ 
        ...r, 
        isPlayer: false,
        skill: r.hackingSkill 
    }))
  ].sort((a, b) => b.reputation - a.reputation);

  const getStrategyIcon = (strategy: string) => {
      if (strategy === 'AGGRESSIVE') return '⚔️'; // Swords
      if (strategy === 'STEALTH') return '👻'; // Ghost
      if (strategy === 'EXPLORER') return '🧭'; // Compass
      if (strategy === 'PLAYER') return '👤';
      return '🤖';
  };

  const getStrategyLabel = (strategy: string) => {
      if (strategy === 'AGGRESSIVE') return 'Hunter';
      if (strategy === 'STEALTH') return 'Ghost';
      if (strategy === 'EXPLORER') return 'Scout';
      if (strategy === 'PLAYER') return 'Operator';
      return 'Bot';
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 h-full overflow-y-auto shadow-2xl relative">
       <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none"></div>
       
       <h2 className="text-2xl font-bold text-slate-100 mb-6 flex items-center">
         <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-3"></span>
         GLOBAL THREAT LIST
       </h2>

       <table className="w-full text-left border-collapse">
         <thead>
           <tr className="text-slate-500 text-xs uppercase tracking-widest border-b border-slate-700">
             <th className="py-3 pl-4">Rank</th>
             <th className="py-3">Operative</th>
             <th className="py-3">Role</th>
             <th className="py-3">Loc / Status</th>
             <th className="py-3">Skill</th>
             <th className="py-3 pr-4 text-right">Reputation</th>
           </tr>
         </thead>
         <tbody className="font-mono text-sm">
           {allHackers.map((hacker, index) => (
             <tr 
              key={hacker.name} 
              className={`border-b border-slate-800 hover:bg-slate-800/50 transition-colors ${hacker.isPlayer ? 'bg-emerald-900/10' : ''}`}
             >
               <td className="py-3 pl-4 text-slate-400">#{index + 1}</td>
               <td className={`py-3 font-bold ${hacker.color}`}>
                 {hacker.name}
                 {hacker.isPlayer && <span className="ml-2 text-[10px] bg-emerald-900 text-emerald-300 px-1 rounded">ME</span>}
               </td>
               <td className="py-3 text-slate-300 flex items-center gap-2">
                 <span title={hacker.strategy as string}>{getStrategyIcon(hacker.strategy as string)}</span>
                 <span className="text-xs">{getStrategyLabel(hacker.strategy as string)}</span>
               </td>
               <td className="py-3">
                 <div className="flex flex-col">
                    <span className={`text-xs ${hacker.isOnline ? 'text-green-400' : 'text-slate-600'}`}>
                        {hacker.isOnline ? `[${hacker.currentHost}]` : 'OFFLINE'}
                    </span>
                 </div>
               </td>
               <td className="py-3 text-slate-400">{hacker.skill}</td>
               <td className="py-3 pr-4 text-right text-cyan-400 font-mono">
                 {hacker.reputation.toLocaleString()}
               </td>
             </tr>
           ))}
         </tbody>
       </table>
    </div>
  );
};

export default Leaderboard;