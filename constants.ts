export const TICK_RATE = 200; // ms

export const PROGRAMS = {
  SSH: 'SSH-Crack.exe',
  FTP: 'FTP-Bypass.exe',
  SMTP: 'SMTP-Breaker.exe',
  HTTP: 'HTTP-Worm.exe',
  SQL: 'SQL-Injector.exe',
  NUKE: 'NUKE.exe',
  AUTO_LINK: 'AutoLink.exe',
  DEEP_SCAN: 'DeepScanV1.exe'
};

export const PROGRAM_COSTS = {
  [PROGRAMS.SSH]: 50000,
  [PROGRAMS.FTP]: 150000,
  [PROGRAMS.SMTP]: 350000,
  [PROGRAMS.HTTP]: 1000000,
  [PROGRAMS.SQL]: 5000000,
  [PROGRAMS.AUTO_LINK]: 25000,
  [PROGRAMS.DEEP_SCAN]: 500000
};

export const BASE_HACKING_EXP = 5;
export const EXP_TO_LEVEL_FACTOR = 1.5;

export const SERVER_TYPES = ['Workstation', 'Database', 'Relay', 'Mainframe', 'Gateway'];

// Procedural Cities
export const CITIES = [
  'Sector-12', 'Aevum', 'Volhaven', 'Chongqing', 'New Tokyo', 'Ishima', 
  'Neo-London', 'Arcadia', 'Sorpigal', 'Raven Rock'
];

// Factions
export const FACTIONS = [
  'CyberSec', 'NiteSec', 'The Black Hand', 'BitRunners', 'Daedalus', 'Tian Di Hui', 'Netburners'
];

export const ORGANIZATIONS = [
  'OmniCorp', 'CyberDyne', 'MassiveDynamic', 'Hooli', 'E-Corp', 
  'Tyrell', 'BlueSun', 'Weyland', 'Yutani', 'Arasaka', 'Militech', 
  'KuaiGong', 'Four Sigma', 'Bachman & Associates'
];

export const INITIAL_FILES = [
  { name: 'readme.txt', content: 'NetExpanse v2.1\n\nBased on Bitburner.\n\nOBJECTIVE: Infiltrate the global network.\nCOMMANDS:\n- scan: Find targets\n- analyze: View target stats\n- breach: Gain root access\n- run [script]: Execute automation\n- join [faction]: Align with hacker groups.' },
  { name: 'hack.js', content: 'target = args[0];\nwhile(true) {\n  weaken(target);\n  grow(target);\n  siphon(target);\n}' } 
];

export const RAM_BASE_COST = 1.0;
export const RAM_OP_COST = 0.5;

export const MAX_LOGS = 100;
