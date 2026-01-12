import { RivalOperative, LogEntry, Server, AIStrategy } from '../types';
import { generateId } from './utils';
import { FACTIONS, CITIES } from '../constants';

const NAMES = ['Ghost', 'Viper', 'Null', 'ZeroCool', 'AcidBurn', 'Cereal', 'Morpheus', 'Trinity', 'Neo', 'Case', 'Molly'];
const COLORS = ['text-red-500', 'text-yellow-500', 'text-blue-500', 'text-purple-500', 'text-orange-500', 'text-pink-500'];

// Helper to pick random server key
const getRandomServer = (servers: Record<string, Server>): string => {
  const keys = Object.keys(servers);
  return keys[Math.floor(Math.random() * keys.length)];
};

export const initializeRivals = (servers?: Record<string, Server>): RivalOperative[] => {
  const startHost = servers ? getRandomServer(servers) : 'home';

  return NAMES.map((name, i) => ({
    name,
    faction: FACTIONS[i % FACTIONS.length],
    reputation: Math.floor(Math.random() * 2000) + 500,
    hackingSkill: Math.floor(Math.random() * 50) + 10,
    isOnline: Math.random() > 0.3,
    color: COLORS[i % COLORS.length],
    
    strategy: (i % 3 === 0 ? 'AGGRESSIVE' : i % 3 === 1 ? 'STEALTH' : 'EXPLORER') as AIStrategy,
    currentHost: startHost,
    targetHost: null,
    actionState: 'IDLE',
    actionTimer: 0,
    knowledgeBase: ['home', 'public-relay'],
    visitedNodes: [startHost]
  }));
};

// BFS Pathfinding
const findNextHop = (start: string, target: string, servers: Record<string, Server>): string | null => {
  if (start === target) return null;
  
  const queue: string[][] = [[start]];
  const visited = new Set<string>([start]);
  
  while (queue.length > 0) {
    const path = queue.shift()!;
    const node = path[path.length - 1];
    
    if (node === target) {
      return path.length > 1 ? path[1] : null;
    }
    
    const connections = servers[node]?.connections || [];
    for (const conn of connections) {
      if (!visited.has(conn)) {
        visited.add(conn);
        queue.push([...path, conn]);
      }
    }
  }
  return null;
};

// BFS Distance Calculation (for utility score)
const getDistance = (start: string, target: string, servers: Record<string, Server>): number => {
    if (start === target) return 0;
    const queue: { id: string, dist: number }[] = [{ id: start, dist: 0 }];
    const visited = new Set<string>([start]);

    while(queue.length > 0) {
        const { id, dist } = queue.shift()!;
        if (id === target) return dist;
        if (dist > 10) continue; // Optimization: Don't look too far

        const neighbors = servers[id]?.connections || [];
        for (const n of neighbors) {
            if (!visited.has(n)) {
                visited.add(n);
                queue.push({ id: n, dist: dist + 1 });
            }
        }
    }
    return 999; // Unreachable or too far
};

// Advanced Utility Function
const calculateServerUtility = (
    server: Server, 
    agent: RivalOperative, 
    distance: number
): number => {
    // 1. Skill Check: If too hard, score is 0
    if (agent.hackingSkill < (server.securityLevel / 3)) return 0;
    if (server.moneyAvailable <= 0) return 0;

    // 2. Base Value
    const potentialMoney = server.moneyAvailable;
    const security = Math.max(1, server.securityLevel);
    
    // 3. Strategy Weights
    let score = 0;
    
    if (agent.strategy === 'AGGRESSIVE') {
        // High risk, high reward. Cares less about security/time.
        // Money^1.5 / Security^0.8
        score = Math.pow(potentialMoney, 1.2) / Math.pow(security, 0.8);
    } else if (agent.strategy === 'STEALTH') {
        // Efficient. High penalty for security.
        score = potentialMoney / Math.pow(security, 1.5);
    } else { // EXPLORER
        // Balanced, but penalized heavily by distance? 
        // Actually Explorer usually prioritizes unknowns, handled outside this function.
        // For hacking targets, Explorer acts like a balanced agent.
        score = potentialMoney / security;
    }

    // 4. Distance Penalty (Time is money)
    // Reduce score by 10% per hop
    const distancePenalty = Math.pow(0.9, distance);
    
    return score * distancePenalty;
};


// THE AI AGENT
export const processRivalAI = (
  rivals: RivalOperative[], 
  servers: Record<string, Server>,
  tick: number
): { updatedRivals: RivalOperative[], updatedServers: Record<string, Server>, log?: LogEntry } => {
  
  let globalLog: LogEntry | undefined;
  
  // Shallow copy of map to track updates. Objects are shared until cloned.
  const serverUpdates = { ...servers };

  const updatedRivals = rivals.map(rival => {
    // 1. Connection Toggle
    if (Math.random() > 0.998) { // Slower toggle
      return { ...rival, isOnline: !rival.isOnline, actionState: 'IDLE' as const, actionTimer: 0 };
    }

    if (!rival.isOnline) return rival;

    // Clone agent
    const agent = { ...rival };
    
    // Safety check
    if (!servers[agent.currentHost]) {
      agent.currentHost = 'home';
      agent.actionState = 'IDLE';
    }
    
    const currentServerNode = servers[agent.currentHost];

    // 2. Knowledge & Exploration
    if (!agent.knowledgeBase.includes(agent.currentHost)) {
      agent.knowledgeBase.push(agent.currentHost);
    }
    if (!agent.visitedNodes.includes(agent.currentHost)) {
        agent.visitedNodes.push(agent.currentHost);
    }
    
    currentServerNode.connections.forEach(conn => {
      if (!agent.knowledgeBase.includes(conn)) {
        agent.knowledgeBase.push(conn);
      }
    });

    // 3. Finite State Machine
    if (agent.actionTimer > 0) {
      agent.actionTimer--;
      
      if (agent.actionTimer <= 0) {
        // Action Finished
        if (agent.actionState === 'HACKING') {
           // --- HACK EXECUTION ---
           const targetNode = serverUpdates[agent.currentHost]; // Get latest state
           
           // Check if still hackable
           if (targetNode && targetNode.moneyAvailable > 0) {
              // Calculate impact
              const stealPercent = Math.min(0.2, (agent.hackingSkill * 0.5) / 100);
              const stolen = Math.floor(targetNode.moneyAvailable * stealPercent);
              
              if (stolen > 0) {
                  // Mutate Server State
                  serverUpdates[agent.currentHost] = {
                      ...targetNode,
                      moneyAvailable: targetNode.moneyAvailable - stolen,
                      securityLevel: Math.min(100, targetNode.securityLevel + 0.2)
                  };
                  
                  // Agent Reward
                  agent.reputation += Math.max(1, Math.floor(targetNode.securityLevel / 2));
                  agent.hackingSkill += 0.1;
                  
                  // Flavor Log for big heists
                  if (stolen > 500000 && Math.random() > 0.95) {
                      globalLog = {
                          id: generateId(),
                          type: 'warn',
                          message: `Network Alert: Large data exfiltration detected on ${agent.currentHost} by ${agent.name} (${agent.strategy}).`,
                          timestamp: Date.now()
                      };
                  }
              }
           }
        } else if (agent.actionState === 'MOVING') {
            // Arrive
            if (agent.targetHost && servers[agent.targetHost]) {
                agent.currentHost = agent.targetHost;
            }
        }
        
        agent.actionState = 'IDLE';
        agent.targetHost = null;
      }
    } else {
      // --- DECISION MAKING ---
      
      // Filter known servers
      const knownServers = agent.knowledgeBase
        .map(hostname => servers[hostname])
        .filter(s => s !== undefined);

      let bestTarget: string | null = null;
      let highestScore = -1;

      // Decision Branch based on Strategy
      
      // EXPLORER BIAS: If Explorer, first check if there are nearby unvisited nodes
      if (agent.strategy === 'EXPLORER') {
          const unvisited = knownServers.filter(s => !agent.visitedNodes.includes(s.hostname));
          if (unvisited.length > 0) {
              // Find closest unvisited
              let minDist = 999;
              for (const u of unvisited) {
                  const dist = getDistance(agent.currentHost, u.hostname, servers);
                  if (dist < minDist) {
                      minDist = dist;
                      bestTarget = u.hostname;
                  }
              }
              // If found nearby unvisited, go there
              if (bestTarget && minDist <= 3) {
                  // Set move
                  if (agent.currentHost !== bestTarget) {
                       const nextHop = findNextHop(agent.currentHost, bestTarget, servers);
                       if (nextHop) {
                            agent.actionState = 'MOVING';
                            agent.targetHost = nextHop;
                            agent.actionTimer = 5;
                            return agent; // Exit early
                       }
                  }
              }
          }
      }

      // STANDARD UTILITY EVALUATION (Greedy / Stealth / Explorer Fallback)
      for (const s of knownServers) {
          const dist = getDistance(agent.currentHost, s.hostname, servers);
          const score = calculateServerUtility(s, agent, dist);
          if (score > highestScore) {
              highestScore = score;
              bestTarget = s.hostname;
          }
      }
      
      // ACTION EXECUTION
      if (highestScore > 0 && bestTarget) {
          if (agent.currentHost === bestTarget) {
              // We are there. HACK.
              agent.actionState = 'HACKING';
              agent.actionTimer = agent.strategy === 'AGGRESSIVE' ? 15 : 25; // Aggressive hacks faster/riskier? Just flavor for now.
          } else {
              // Move towards it
              const nextHop = findNextHop(agent.currentHost, bestTarget, servers);
              if (nextHop) {
                  agent.actionState = 'MOVING';
                  agent.targetHost = nextHop;
                  agent.actionTimer = 5; 
              } else {
                 // No path?
                 agent.actionState = 'ANALYZING';
                 agent.actionTimer = 5;
              }
          }
      } else {
          // No good targets. Explore unvisited or random walk.
          const unvisited = knownServers.filter(s => !agent.visitedNodes.includes(s.hostname));
          
          if (unvisited.length > 0) {
              // Target random unvisited
              const target = unvisited[Math.floor(Math.random() * unvisited.length)];
              const nextHop = findNextHop(agent.currentHost, target.hostname, servers);
               if (nextHop) {
                  agent.actionState = 'MOVING';
                  agent.targetHost = nextHop;
                  agent.actionTimer = 5;
              } else {
                  // Random neighbor
                  const neighbors = currentServerNode.connections;
                  agent.actionState = 'MOVING';
                  agent.targetHost = neighbors[Math.floor(Math.random() * neighbors.length)];
                  agent.actionTimer = 5;
              }
          } else {
              // Random walk
              const neighbors = currentServerNode.connections;
              agent.actionState = 'MOVING';
              agent.targetHost = neighbors[Math.floor(Math.random() * neighbors.length)];
              agent.actionTimer = 5;
          }
      }
    }

    return agent;
  });

  // Fallback chat if no system event
  if (!globalLog) {
     const { log } = generateRivalEvent(updatedRivals, tick);
     globalLog = log;
  }

  return { updatedRivals, updatedServers: serverUpdates, log: globalLog };
};

export const generateRivalEvent = (rivals: RivalOperative[], tick: number): { updatedRivals: RivalOperative[], log?: LogEntry } => {
  if (Math.random() > 0.02) return { updatedRivals: rivals };

  const activeRivals = rivals.filter(r => r.isOnline);
  if (activeRivals.length === 0) return { updatedRivals: rivals };

  const actor = activeRivals[Math.floor(Math.random() * activeRivals.length)];
  
  return {
    updatedRivals: rivals,
    log: {
      id: generateId(),
      type: 'chat',
      sender: actor.name,
      message: getRandomChatMessage(actor.faction, actor.strategy),
      timestamp: Date.now()
    }
  };
};

const getRandomChatMessage = (faction: string, strategy?: AIStrategy) => {
  const generic = [
    `Any ${faction} members nearby?`,
    "Who is scanning me?",
    "Lag is terrible.",
    "Target acquired.",
    "Decrypting...",
    "Selling exploit keys.",
    "Did you see the new update?",
    "Compiling payload..."
  ];
  
  const strategic = strategy === 'AGGRESSIVE' ? [
      "Smashing through firewalls. Try to keep up.",
      "Security levels are a suggestion.",
      "Draining accounts. Chaos reigns."
  ] : strategy === 'STEALTH' ? [
      "In and out. No traces.",
      "Your logs are clean. You're welcome.",
      "Silence is golden."
  ] : [ // Explorer
      "Mapping new clusters...",
      "Found a new gateway in Sector-12.",
      "The network is infinite."
  ];

  const pool = [...generic, ...strategic];
  return pool[Math.floor(Math.random() * pool.length)];
};