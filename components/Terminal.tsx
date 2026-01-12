import React, { useRef, useEffect, useState } from 'react';
import { LogEntry, TerminalSession } from '../types';

interface TerminalProps {
  sessions: TerminalSession[];
  activeSessionId: string;
  onSwitchSession: (id: string) => void;
  onAddSession: () => void;
  onCloseSession: (id: string) => void;
  onCommand: (cmd: string) => void;
}

type FilterType = 'ALL' | 'TERM' | 'SYSTEM' | 'CHAT';

const Terminal: React.FC<TerminalProps> = ({ 
  sessions, 
  activeSessionId, 
  onSwitchSession, 
  onAddSession,
  onCloseSession,
  onCommand 
}) => {
  const [input, setInput] = useState('');
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const logs = activeSession ? activeSession.logs : [];
  const history = activeSession ? activeSession.history : [];

  // Reset input state when switching sessions
  useEffect(() => {
    setInput('');
    setHistoryIndex(-1);
    inputRef.current?.focus();
  }, [activeSessionId]);

  // Filter logs logic
  const filteredLogs = logs.filter(log => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'CHAT') return log.type === 'chat';
    if (activeFilter === 'SYSTEM') return log.type === 'system';
    if (activeFilter === 'TERM') return ['info', 'success', 'error', 'warn'].includes(log.type);
    return true;
  });

  // Auto-scroll to bottom on new logs or filter change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredLogs, activeSessionId, activeFilter]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    onCommand(input);
    setHistoryIndex(-1);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setInput(history[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(history[newIndex]);
      } else {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  };

  return (
    <div 
      className="flex flex-col h-full bg-slate-900/80 border border-slate-700 rounded-lg overflow-hidden font-mono text-sm relative shadow-2xl backdrop-blur-sm"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Session Tab Bar */}
      <div className="bg-slate-950 flex items-center border-b border-slate-800 overflow-x-auto no-scrollbar shrink-0">
        {sessions.map((session) => (
          <div 
            key={session.id}
            onClick={(e) => {
              e.stopPropagation();
              onSwitchSession(session.id);
            }}
            className={`group flex items-center gap-2 px-4 py-2 text-xs cursor-pointer border-r border-slate-800 transition-colors select-none min-w-[120px] justify-between ${
              session.id === activeSessionId 
                ? 'bg-slate-800 text-emerald-400 font-bold' 
                : 'text-slate-500 hover:bg-slate-900 hover:text-slate-300'
            }`}
          >
            <span className="truncate">
              {session.hostname}
            </span>
            {sessions.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseSession(session.id);
                }}
                className="opacity-0 group-hover:opacity-100 hover:text-red-400 px-1 rounded transition-all"
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button
          onClick={(e) => {
             e.stopPropagation();
             onAddSession();
          }}
          className="px-4 py-2 text-slate-500 hover:text-emerald-400 hover:bg-slate-900 transition-colors text-lg leading-none border-r border-slate-800"
        >
          +
        </button>
        <div className="flex-1"></div>
        
        {/* Decorative Lights */}
        <div className="flex gap-1.5 px-4">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
        </div>
      </div>

      {/* Message Filter Bar */}
      <div className="flex bg-slate-900 border-b border-slate-800 px-2 shrink-0">
        {(['ALL', 'TERM', 'SYSTEM', 'CHAT'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-3 py-1.5 text-[10px] font-bold tracking-wider transition-colors border-b-2 ${
              activeFilter === filter 
                ? 'border-emerald-500 text-emerald-400 bg-slate-800' 
                : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Logs Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1">
        {filteredLogs.map((log) => (
          <div key={log.id} className={`${
            log.type === 'error' ? 'text-red-400' :
            log.type === 'success' ? 'text-emerald-400' :
            log.type === 'warn' ? 'text-yellow-400' :
            log.type === 'chat' ? 'text-cyan-400' :
            log.type === 'system' ? 'text-fuchsia-400' :
            'text-slate-300'
          } break-words`}>
            <span className="opacity-50 mr-2 text-xs">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
            {log.type === 'chat' && <span className="font-bold mr-1">&lt;{log.sender}&gt;</span>}
            {log.type === 'system' && <span className="font-bold mr-1">[SYS]</span>}
            {log.message}
          </div>
        ))}
        
        {/* Input Line */}
        <form onSubmit={handleSubmit} className="flex items-center mt-2 group">
          <span className="text-emerald-500 mr-2 font-bold">➜</span>
          <span className="text-cyan-500 mr-2">~</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none border-none text-slate-100 caret-emerald-500"
            autoFocus
            autoComplete="off"
            spellCheck="false"
          />
        </form>
      </div>
    </div>
  );
};

export default Terminal;