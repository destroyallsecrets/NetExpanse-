export interface File {
  name: string;
  content: string;
}

export interface Server {
  hostname: string;
  ip: string;
  depth: number;
  city: string; // New: Geographic cluster
  organization: string;
  type: 'Workstation' | 'Database' | 'Relay' | 'Mainframe' | 'Gateway' | 'RivalNode';
  
  // Security
  hasRoot: boolean;
  backdoorInstalled: boolean;
  securityLevel: number;
  minSecurity: number;
  
  // Money
  moneyAvailable: number;
  maxMoney: number;
  
  // RAM
  ramUsed: number;
  maxRam: number;
  
  // Ports
  portsRequired: number;
  openPorts: number;
  sshOpen: boolean;
  ftpOpen: boolean;
  smtpOpen: boolean;
  httpOpen: boolean;
  sqlOpen: boolean;
  
  files: File[];
  connections: string[]; // Hostnames of connected neighbors
  
  // Visuals
  x?: number;
  y?: number;
}

export interface Player {
  credits: number;
  hackingSkill: number;
  exp: number;
  programs: string[];
  factions: string[]; // Names of joined factions
  reputation: Record<string, number>; // Faction reputation
  homeCity: string;
}

export interface Process {
  pid: number;
  filename: string;
  target: string;
  operation: 'GROW' | 'WEAKEN' | 'SIPHON' | 'IDLE';
  startTime: number;
  duration: number;
  ramCost: number;
  progress: number; // 0 to 100
}

export interface LogEntry {
  id: string;
  type: 'info' | 'error' | 'success' | 'warn' | 'system' | 'chat';
  message: string;
  timestamp: number;
  sender?: string;
}

export type AIActionState = 'IDLE' | 'MOVING' | 'HACKING' | 'ANALYZING';
export type AIStrategy = 'AGGRESSIVE' | 'STEALTH' | 'EXPLORER';

export interface RivalOperative {
  name: string;
  faction: string;
  reputation: number;
  hackingSkill: number; // New: Competence level
  isOnline: boolean;
  color: string;
  
  // AI State
  strategy: AIStrategy; // Personality
  currentHost: string; // Physical location in network
  targetHost: string | null;
  actionState: AIActionState;
  actionTimer: number; // Ticks remaining for current action
  knowledgeBase: string[]; // List of hostnames discovered
  visitedNodes: string[]; // Nodes actually traversed
}

export interface TerminalSession {
  id: string;
  hostname: string;
  logs: LogEntry[];
  history: string[]; // Recent first [newest, ..., oldest]
}

export interface GameState {
  player: Player;
  servers: Record<string, Server>;
  
  // Terminal State
  sessions: TerminalSession[];
  activeSessionId: string;
  
  processes: Process[];
  rivals: RivalOperative[];
  view: 'TERMINAL' | 'LEADERBOARD' | 'WORLD';
  isEditing: boolean;
  editingFile: string | null;
  fileContentBuffer: string;
}