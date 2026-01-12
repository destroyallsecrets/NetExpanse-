import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Terminal from './components/Terminal';
import Leaderboard from './components/Leaderboard';
import WorldStatus from './components/WorldStatus';
import Editor from './components/Editor';

import { 
  GameState, LogEntry, Server, Process, Player, TerminalSession 
} from './types';
import { 
  TICK_RATE, INITIAL_FILES, PROGRAMS, PROGRAM_COSTS, 
  MAX_LOGS, BASE_HACKING_EXP, FACTIONS, CITIES 
} from './constants';
import { 
  generateId, calculateProcessDuration, calculateRamCost, formatMoney 
} from './services/utils';
import { 
  initializeWorld, expandWorld 
} from './services/worldGen';
import { 
  initializeRivals, processRivalAI 
} from './services/multiplayer';

const INITIAL_SESSION_ID = 'init-session';
const INITIAL_WORLD = initializeWorld();

const INITIAL_STATE: GameState = {
  player: {
    credits: 0,
    hackingSkill: 1,
    exp: 0,
    programs: [],
    factions: [],
    reputation: {},
    homeCity: CITIES[0]
  },
  servers: INITIAL_WORLD,
  processes: [],
  sessions: [
    {
      id: INITIAL_SESSION_ID,
      hostname: 'home',
      logs: [
        { id: 'init', type: 'system', message: 'NetExpanse OS v2.1 booting...', timestamp: Date.now() },
        { id: 'init2', type: 'info', message: 'Connected to local gateway [Sector-12].', timestamp: Date.now() + 100 },
        { id: 'init3', type: 'system', message: 'Bitburner compatibility layer active.', timestamp: Date.now() + 200 }
      ],
      history: []
    }
  ],
  activeSessionId: INITIAL_SESSION_ID,
  rivals: initializeRivals(INITIAL_WORLD),
  view: 'TERMINAL',
  isEditing: false,
  editingFile: null,
  fileContentBuffer: ''
};

// Add initial files to home
INITIAL_STATE.servers['home'].files = [...INITIAL_FILES];

function App() {
  const [state, setState] = useState<GameState>(() => {
    const saved = localStorage.getItem('netexpanse_save_v2'); // New save key for major version
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        
        // Deep merge / Validation to prevent crashes from old saves
        if (!parsed.player) parsed.player = { ...INITIAL_STATE.player };
        if (!parsed.player.factions) parsed.player.factions = [];
        
        if (!parsed.servers) parsed.servers = { ...INITIAL_STATE.servers };
        
        // Validate Sessions and History
        if (!Array.isArray(parsed.sessions) || parsed.sessions.length === 0) {
          parsed.sessions = [...INITIAL_STATE.sessions];
          parsed.activeSessionId = INITIAL_STATE.activeSessionId;
        } else {
           // Ensure every session has a history array and logs array
           parsed.sessions = parsed.sessions.map((s: any) => ({
             ...s,
             logs: Array.isArray(s.logs) ? s.logs : [],
             history: Array.isArray(s.history) ? s.history : []
           }));

           // Validate active session ID exists
           const activeExists = parsed.sessions.find((s: TerminalSession) => s.id === parsed.activeSessionId);
           if (!activeExists) {
             parsed.activeSessionId = parsed.sessions[0].id;
           }
        }
        
        // Re-init rivals if they are old format (missing strategies or visitedNodes)
        if (!parsed.rivals || parsed.rivals.length === 0 || !parsed.rivals[0].strategy || !parsed.rivals[0].visitedNodes) {
          console.log("Upgrading Rival Agents to new AI System...");
          parsed.rivals = initializeRivals(parsed.servers);
        }
        
        return parsed;
      } catch (e) {
        console.error("Save file corrupted, resetting.", e);
      }
    }
    return INITIAL_STATE;
  });

  const stateRef = useRef(state);
  
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Game Loop & Auto-Save
  useEffect(() => {
    const tick = setInterval(() => {
      const current = stateRef.current;
      const now = Date.now();
      let updatedProcesses: Process[] = [];
      let serverUpdates: Record<string, Server> = { ...current.servers };
      let globalLogUpdates: LogEntry[] = [];
      let playerUpdates = { ...current.player };

      // 1. Process Scripts
      current.processes.forEach(proc => {
        let newProgress = proc.progress + (100 / (proc.duration / TICK_RATE));
        
        if (newProgress >= 100) {
          // Process Complete
          const targetServer = serverUpdates[proc.target];
          
          if (targetServer) {
            let moneyGain = 0;
            let expGain = BASE_HACKING_EXP;

            if (proc.operation === 'WEAKEN') {
              targetServer.securityLevel = Math.max(targetServer.minSecurity, targetServer.securityLevel - 2);
              expGain *= 1.5;
            } else if (proc.operation === 'GROW') {
              targetServer.moneyAvailable = Math.min(targetServer.maxMoney, targetServer.moneyAvailable * 1.05);
              targetServer.securityLevel += 0.5;
            } else if (proc.operation === 'SIPHON') {
              const stealPercent = (100 - targetServer.securityLevel) / 200; 
              const stolen = Math.floor(targetServer.moneyAvailable * Math.max(0, stealPercent));
              targetServer.moneyAvailable -= stolen;
              moneyGain = stolen;
              targetServer.securityLevel += 1;
              expGain *= 2;
            }

            // Apply rewards
            playerUpdates.credits += moneyGain;
            playerUpdates.exp += expGain;
            
            // Faction Rep Gain (Passive)
            if (playerUpdates.factions.length > 0) {
               playerUpdates.factions.forEach(f => {
                 playerUpdates.reputation[f] = (playerUpdates.reputation[f] || 0) + (expGain * 0.1);
               });
            }

            // Level up check
            const newLevel = Math.floor(Math.sqrt(playerUpdates.exp / 100)) + 1;
            if (newLevel > playerUpdates.hackingSkill) {
               playerUpdates.hackingSkill = newLevel;
               globalLogUpdates.push({
                 id: generateId(), type: 'success', message: `Level Up! Hacking Skill: ${newLevel}`, timestamp: now
               });
               
               // Check for Faction Invites
               FACTIONS.forEach(faction => {
                 if (!playerUpdates.factions.includes(faction) && Math.random() > 0.9) {
                    globalLogUpdates.push({
                      id: generateId(), 
                      type: 'chat', 
                      sender: faction, 
                      message: `We have noticed your skills. Type 'join ${faction}' to align with us.`, 
                      timestamp: now
                    });
                 }
               });
            }

            // Loop process (Bitburner style - scripts run until killed)
             updatedProcesses.push({
              ...proc,
              progress: 0,
            });
          }
        } else {
          updatedProcesses.push({ ...proc, progress: newProgress });
        }
      });

      // 2. AI Agents (Rivals)
      // Pass the current world state so agents can 'see' servers.
      // Capture updatedServers from the AI which might include stolen money/security changes.
      const { updatedRivals, updatedServers, log } = processRivalAI(current.rivals, serverUpdates, now);
      
      // Merge AI updates into serverUpdates.
      // Since processRivalAI returns a new map of servers containing updates, we can use it.
      // NOTE: Because processRivalAI receives the *already modified* serverUpdates from step 1 (scripts),
      // it is safe to overwrite serverUpdates with the result from AI, as AI builds upon that state.
      serverUpdates = updatedServers;

      if (log) globalLogUpdates.push(log);

      // Update State
      setState(prev => {
        const newSessions = prev.sessions.map(s => {
          if (globalLogUpdates.length > 0) {
            return { ...s, logs: [...s.logs, ...globalLogUpdates].slice(-MAX_LOGS) };
          }
          return s;
        });

        return {
          ...prev,
          player: playerUpdates,
          servers: serverUpdates,
          processes: updatedProcesses,
          rivals: updatedRivals,
          sessions: newSessions
        };
      });

    }, TICK_RATE);

    const saver = setInterval(() => {
       localStorage.setItem('netexpanse_save_v2', JSON.stringify(stateRef.current));
    }, 5000);

    // Save on tab close/refresh to ensure history isn't lost
    const handleBeforeUnload = () => {
       localStorage.setItem('netexpanse_save_v2', JSON.stringify(stateRef.current));
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(tick);
      clearInterval(saver);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const addLog = (type: LogEntry['type'], message: string, sessionId: string | null = null) => {
    setState(prev => {
      const newEntry = { id: generateId(), type, message, timestamp: Date.now() };
      const newSessions = prev.sessions.map(s => {
         if (sessionId === null || s.id === sessionId) {
            return { ...s, logs: [...s.logs, newEntry].slice(-MAX_LOGS) };
         }
         return s;
      });
      return { ...prev, sessions: newSessions };
    });
  };

  const handleCommand = (cmdStr: string) => {
    const activeSession = state.sessions.find(s => s.id === state.activeSessionId);
    if (!activeSession) return;

    // History Update - Saved to state, which is then persisted to localStorage
    setState(prev => {
      const sessions = prev.sessions.map(s => {
        if (s.id === prev.activeSessionId) {
          // Remove duplicate consecutive command if needed, but simple prepend is fine for now
          // Limit history to 50 items to keep save file size manageable
          return { ...s, history: [cmdStr, ...s.history].slice(0, 50) };
        }
        return s;
      });
      return { ...prev, sessions };
    });

    const parts = cmdStr.trim().split(' ');
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    addLog('info', `> ${cmdStr}`, activeSession.id);

    const currentServer = state.servers[activeSession.hostname];
    const player = state.player;

    switch (cmd) {
      case 'help':
        addLog('system', 'CMDS: scan, connect [host], analyze, ls, cat, nano, rm, run, ps, kill, market, buy, breach, join, chat.', activeSession.id);
        break;

      case 'scan':
      case 'probe':
        addLog('info', `Scanning local cluster in ${currentServer.city}...`, activeSession.id);
        currentServer.connections.forEach(conn => {
          const s = state.servers[conn];
          const lock = s.hasRoot ? 'ROOT' : 'LOCKED';
          const typeLabel = s.type === 'Gateway' ? '[GATEWAY]' : s.type === 'RivalNode' ? '[RIVAL]' : `[${s.type}]`;
          const cityDiff = s.city !== currentServer.city ? ` -> ${s.city}` : '';
          addLog('system', `- ${conn} (${s.ip}) ${typeLabel} <${lock}>${cityDiff}`, activeSession.id);
        });
        break;

      case 'connect':
      case 'link':
        if (!args[0]) {
          addLog('error', 'Usage: connect [hostname]', activeSession.id);
          return;
        }
        const target = args[0];
        if (currentServer.connections.includes(target) || target === 'home') {
           const targetNode = state.servers[target];
           
           setState(prev => ({
             ...prev,
             sessions: prev.sessions.map(s => s.id === activeSession.id ? { ...s, hostname: target } : s)
           }));
           
           addLog('success', `Connected to ${target}`, activeSession.id);
           if (targetNode.city !== currentServer.city) {
              addLog('warn', `WARNING: ENTERING NEW JURISDICTION: ${targetNode.city}`, activeSession.id);
           }
        } else {
          addLog('error', `Host ${target} unreachable from current node.`, activeSession.id);
        }
        break;

      case 'home':
        setState(prev => ({
             ...prev,
             sessions: prev.sessions.map(s => s.id === activeSession.id ? { ...s, hostname: 'home' } : s)
        }));
        addLog('success', 'Returned to home.', activeSession.id);
        break;

      case 'analyze':
        addLog('system', `--- ANALYSIS: ${currentServer.hostname} ---`, activeSession.id);
        addLog('info', `Location: ${currentServer.city} // ${currentServer.organization}`, activeSession.id);
        addLog('info', `Security: ${currentServer.securityLevel.toFixed(2)} (Min: ${currentServer.minSecurity})`, activeSession.id);
        addLog('info', `Money: ${formatMoney(currentServer.moneyAvailable)} / ${formatMoney(currentServer.maxMoney)}`, activeSession.id);
        addLog('info', `RAM: ${currentServer.ramUsed}/${currentServer.maxRam} GB`, activeSession.id);
        addLog('info', `Root Access: ${currentServer.hasRoot ? 'YES' : 'NO'}`, activeSession.id);
        break;

      case 'ls':
        if (currentServer.files.length === 0) {
          addLog('info', 'No files found.', activeSession.id);
        } else {
          currentServer.files.forEach(f => addLog('system', `${f.name}`, activeSession.id));
        }
        break;

      case 'cat':
        const fileToRead = currentServer.files.find(f => f.name === args[0]);
        if (fileToRead) {
          addLog('info', `--- ${fileToRead.name} ---`, activeSession.id);
          addLog('system', fileToRead.content, activeSession.id);
        } else {
          addLog('error', 'File not found.', activeSession.id);
        }
        break;

      case 'rm':
        if (activeSession.hostname !== 'home' && !currentServer.hasRoot) {
           addLog('error', 'Root access required to delete files.', activeSession.id);
           return;
        }
        const fileIdx = currentServer.files.findIndex(f => f.name === args[0]);
        if (fileIdx > -1) {
          setState(prev => {
            const newFiles = [...prev.servers[activeSession.hostname].files];
            newFiles.splice(fileIdx, 1);
            return {
              ...prev,
              servers: {
                ...prev.servers,
                [activeSession.hostname]: {
                  ...prev.servers[activeSession.hostname],
                  files: newFiles
                }
              }
            };
          });
          addLog('success', `Deleted ${args[0]}`, activeSession.id);
        } else {
          addLog('error', 'File not found.', activeSession.id);
        }
        break;

      case 'nano':
        if (!args[0]) {
           addLog('error', 'Usage: nano [filename]', activeSession.id);
           return;
        }
        const existingFile = currentServer.files.find(f => f.name === args[0]);
        setState(prev => ({
          ...prev,
          isEditing: true,
          editingFile: args[0],
          fileContentBuffer: existingFile ? existingFile.content : ''
        }));
        break;

      case 'ps':
        if (state.processes.length === 0) {
          addLog('info', 'No active processes.', activeSession.id);
        } else {
          addLog('system', 'PID | TARGET | OP | RAM | PROGRESS', activeSession.id);
          state.processes.forEach(p => {
             addLog('system', `${p.pid} | ${p.target} | ${p.operation} | ${p.ramCost}GB | ${Math.floor(p.progress)}%`, activeSession.id);
          });
        }
        break;

      case 'kill': {
        const pid = parseInt(args[0]);
        if (isNaN(pid)) {
          addLog('error', 'Usage: kill [pid]', activeSession.id);
          return;
        }
        killProcess(pid);
        break;
      }

      case 'market':
        addLog('system', '--- DARK WEB MARKETS ---', activeSession.id);
        Object.entries(PROGRAM_COSTS).forEach(([prog, cost]) => {
          const owned = player.programs.includes(prog);
          addLog('info', `${prog} - ${formatMoney(cost)} [${owned ? 'OWNED' : 'AVAILABLE'}]`, activeSession.id);
        });
        break;

      case 'buy': {
        const item = args[0];
        const cost = PROGRAM_COSTS[item];
        if (!cost) {
          addLog('error', 'Item not available.', activeSession.id);
          return;
        }
        if (player.programs.includes(item)) {
          addLog('warn', 'Already owned.', activeSession.id);
          return;
        }
        if (player.credits < cost) {
          addLog('error', 'Insufficient funds.', activeSession.id);
          return;
        }
        setState(prev => ({
          ...prev,
          player: {
            ...prev.player,
            credits: prev.player.credits - cost,
            programs: [...prev.player.programs, item]
          }
        }));
        addLog('success', `Purchased ${item}`, activeSession.id);
        break;
      }
      
      // Port Openers
      case 'openssh':
      case 'openftp':
      case 'opensmtp':
      case 'openhttp':
      case 'opensql':
        const typeMap: Record<string, keyof typeof PROGRAMS> = {
          'openssh': 'SSH', 'openftp': 'FTP', 'opensmtp': 'SMTP', 'openhttp': 'HTTP', 'opensql': 'SQL'
        };
        const progName = PROGRAMS[typeMap[cmd]];
        const fieldMap: Record<string, keyof Server> = {
          'openssh': 'sshOpen', 'openftp': 'ftpOpen', 'opensmtp': 'smtpOpen', 'openhttp': 'httpOpen', 'opensql': 'sqlOpen'
        };
        
        if (!player.programs.includes(progName)) {
          addLog('error', `Program ${progName} missing.`, activeSession.id);
          return;
        }
        if ((currentServer[fieldMap[cmd]] as boolean)) {
          addLog('warn', 'Port already open.', activeSession.id);
          return;
        }
        
        setState(prev => {
          const s = prev.servers[activeSession.hostname];
          return {
            ...prev,
            servers: {
              ...prev.servers,
              [activeSession.hostname]: {
                ...s,
                [fieldMap[cmd]]: true,
                openPorts: s.openPorts + 1
              }
            }
          };
        });
        addLog('success', `${cmd} executed successfully.`, activeSession.id);
        break;

      case 'breach':
      case 'nuke':
        if (currentServer.hasRoot) {
          addLog('warn', 'Root access already obtained.', activeSession.id);
          return;
        }
        if (currentServer.openPorts < currentServer.portsRequired) {
          addLog('error', `Breach failed. Open ports: ${currentServer.openPorts}/${currentServer.portsRequired}`, activeSession.id);
          return;
        }
        if (player.hackingSkill < currentServer.securityLevel / 3) {
           addLog('error', `Skill too low. Need approx level ${Math.floor(currentServer.securityLevel/3)}.`, activeSession.id);
           return;
        }

        // Success
        let newServers = { ...state.servers };
        newServers[currentServer.hostname] = { ...currentServer, hasRoot: true };
        
        // Infinite Generation Trigger
        if (currentServer.type === 'Gateway') {
           newServers = expandWorld(newServers, currentServer.hostname);
           addLog('system', `GATEWAY BREACH SUCCESSFUL. ROUTE TO [${currentServer.city}] UNLOCKED.`, null);
        } else {
           // Small chance to find a hidden local node when breaching normal server
           if (Math.random() > 0.8) {
              newServers = expandWorld(newServers, currentServer.hostname);
              addLog('info', 'Local hidden node discovered.', activeSession.id);
           }
        }

        setState(prev => ({ ...prev, servers: newServers }));
        addLog('success', 'ACCESS GRANTED. ROOT PRIVILEGES ASSIGNED.', activeSession.id);
        break;

      case 'run': {
        const scriptName = args[0];
        const targetHost = args[1];

        if (!scriptName || !targetHost) {
          addLog('error', 'Usage: run [script] [target]', activeSession.id);
          return;
        }

        const hostServer = state.servers[activeSession.hostname];
        const scriptFile = hostServer.files.find(f => f.name === scriptName);
        
        if (!scriptFile) {
          addLog('error', 'Script not found on current server.', activeSession.id);
          return;
        }

        if (!state.servers[targetHost]) {
          addLog('error', 'Invalid target.', activeSession.id);
          return;
        }
        if (!state.servers[targetHost].hasRoot && targetHost !== 'home') {
          addLog('error', 'Root access required on target.', activeSession.id);
          return;
        }

        const content = scriptFile.content.toLowerCase();
        let op: Process['operation'] = 'IDLE';
        if (content.includes('grow')) op = 'GROW';
        else if (content.includes('weaken')) op = 'WEAKEN';
        else if (content.includes('siphon')) op = 'SIPHON';

        if (op === 'IDLE') {
          addLog('warn', 'Script contains no valid operations.', activeSession.id);
          return;
        }

        const cost = calculateRamCost(content);
        const homeServer = state.servers['home'];
        
        if (homeServer.ramUsed + cost > homeServer.maxRam) {
          addLog('error', `Insufficient Home RAM. Need ${cost}GB.`, activeSession.id);
          return;
        }

        const pid = Math.floor(Math.random() * 100000);
        const duration = calculateProcessDuration(op, player.hackingSkill, state.servers[targetHost].securityLevel);

        setState(prev => ({
          ...prev,
          servers: {
            ...prev.servers,
            home: { ...prev.servers.home, ramUsed: prev.servers.home.ramUsed + cost }
          },
          processes: [...prev.processes, {
            pid,
            filename: scriptName,
            target: targetHost,
            operation: op,
            startTime: Date.now(),
            duration,
            ramCost: cost,
            progress: 0
          }]
        }));
        addLog('success', `Process ${pid} started against ${targetHost}.`, activeSession.id);
        break;
      }

      case 'join':
        const factionName = args.join(' ');
        if (state.player.factions.includes(factionName)) {
           addLog('warn', `Already a member of ${factionName}.`, activeSession.id);
           return;
        }
        if (FACTIONS.includes(factionName)) {
           setState(prev => ({
             ...prev,
             player: {
               ...prev.player,
               factions: [...prev.player.factions, factionName],
               reputation: { ...prev.player.reputation, [factionName]: 0 }
             }
           }));
           addLog('success', `Joined ${factionName}. Welcome to the fold.`, null);
        } else {
           addLog('error', `Faction ${factionName} not found or not recruiting.`, activeSession.id);
        }
        break;

      case 'chat':
        const msg = args.join(' ');
        addLog('chat', msg, null); // Broadcast to all
        break;

      default:
        addLog('error', `Unknown command: ${cmd}`, activeSession.id);
    }
  };

  const killProcess = (pid: number) => {
    setState(prev => {
      const proc = prev.processes.find(p => p.pid === pid);
      if (!proc) return prev;
      return {
        ...prev,
        servers: {
           ...prev.servers,
           home: { ...prev.servers.home, ramUsed: prev.servers.home.ramUsed - proc.ramCost }
        },
        processes: prev.processes.filter(p => p.pid !== pid)
      };
    });
    addLog('info', `Process ${pid} killed.`, null); 
  };

  const handleSaveEditor = (content: string) => {
    const activeSession = state.sessions.find(s => s.id === state.activeSessionId)!;
    
    setState(prev => {
      const server = prev.servers[activeSession.hostname];
      const existingIdx = server.files.findIndex(f => f.name === prev.editingFile);
      let newFiles = [...server.files];
      
      if (existingIdx > -1) {
        newFiles[existingIdx] = { name: prev.editingFile!, content };
      } else {
        newFiles.push({ name: prev.editingFile!, content });
      }

      return {
        ...prev,
        isEditing: false,
        editingFile: null,
        servers: {
          ...prev.servers,
          [activeSession.hostname]: { ...server, files: newFiles }
        }
      };
    });
    addLog('success', `File ${state.editingFile} saved.`, activeSession.id);
  };

  const handleAddSession = () => {
    setState(prev => {
      const newId = generateId();
      return {
        ...prev,
        sessions: [
          ...prev.sessions, 
          { 
            id: newId, 
            hostname: 'home', 
            logs: [{ id: generateId(), type: 'system', message: 'New terminal session initialized.', timestamp: Date.now() }], 
            history: [] 
          }
        ],
        activeSessionId: newId
      };
    });
  };

  const handleSwitchSession = (id: string) => {
    setState(prev => ({ ...prev, activeSessionId: id }));
  };

  const handleCloseSession = (id: string) => {
    setState(prev => {
      if (prev.sessions.length <= 1) return prev; // Keep at least one
      const newSessions = prev.sessions.filter(s => s.id !== id);
      const newActive = prev.activeSessionId === id ? newSessions[0].id : prev.activeSessionId;
      return {
        ...prev,
        sessions: newSessions,
        activeSessionId: newActive
      };
    });
  };

  const activeSession = state.sessions.find(s => s.id === state.activeSessionId) || state.sessions[0];

  return (
    <div className="flex h-screen bg-black text-white font-mono selection:bg-emerald-500/30">
      {state.isEditing && state.editingFile && (
        <Editor 
          filename={state.editingFile}
          initialContent={state.fileContentBuffer}
          onSave={handleSaveEditor}
          onCancel={() => setState(prev => ({ ...prev, isEditing: false, editingFile: null }))}
        />
      )}

      <Sidebar 
        player={state.player}
        processes={state.processes}
        homeServer={state.servers['home']}
        currentView={state.view}
        onChangeView={(v) => setState(prev => ({ ...prev, view: v }))}
        killProcess={killProcess}
      />

      <main className="flex-1 p-4 relative overflow-hidden flex flex-col">
        {state.view === 'TERMINAL' && (
          <Terminal 
            sessions={state.sessions}
            activeSessionId={state.activeSessionId}
            onSwitchSession={handleSwitchSession}
            onAddSession={handleAddSession}
            onCloseSession={handleCloseSession}
            onCommand={handleCommand}
          />
        )}
        {state.view === 'LEADERBOARD' && (
          <Leaderboard player={state.player} rivals={state.rivals} />
        )}
        {state.view === 'WORLD' && (
          <WorldStatus 
            servers={state.servers} 
            currentHostname={activeSession.hostname} 
            onNavigate={(host) => handleCommand(`connect ${host}`)}
            lastLog={activeSession.logs[activeSession.logs.length - 1]}
          />
        )}
        
        {/* Credits Overlay (Bottom Right) */}
        <div className="absolute bottom-1 right-1 pointer-events-none opacity-30 text-[10px] text-slate-500 z-50">
           Based on Bitburner by Daniel Xie
        </div>
      </main>
      
      {/* HUD Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 px-4 py-1 text-xs text-slate-500 flex justify-between z-40">
        <div className="flex gap-4">
           <span className={state.servers[activeSession.hostname].hasRoot ? 'text-blue-500' : 'text-slate-500'}>
              ROOT: {state.servers[activeSession.hostname].hasRoot ? 'YES' : 'NO'}
           </span>
           <span className="text-slate-400">IP: {state.servers[activeSession.hostname].ip}</span>
           <span className="text-emerald-600 font-bold uppercase">{state.servers[activeSession.hostname].city}</span>
        </div>
        <div>SEC_LEVEL: {state.servers[activeSession.hostname].securityLevel.toFixed(1)}</div>
      </div>
    </div>
  );
}

export default App;