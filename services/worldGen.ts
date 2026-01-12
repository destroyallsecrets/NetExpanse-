import { Server, File } from '../types';
import { ORGANIZATIONS, CITIES } from '../constants';

const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const generateIP = () => {
  return `${getRandomInt(1, 255)}.${getRandomInt(0, 255)}.${getRandomInt(0, 255)}.${getRandomInt(1, 254)}`;
};

const generateHostname = (org: string, type: string, city: string) => {
  const shortOrg = org.substring(0, 3).toLowerCase();
  const shortCity = city.substring(0, 3).toUpperCase();
  const shortType = type === 'Mainframe' ? 'core' : type === 'Database' ? 'db' : type === 'Gateway' ? 'gw' : 'node';
  return `${shortCity}-${shortOrg}-${shortType}-${getRandomInt(10, 99)}`;
};

export const generateServer = (depth: number, parentHost: string, city: string, isGateway: boolean = false): Server => {
  const org = ORGANIZATIONS[getRandomInt(0, ORGANIZATIONS.length - 1)];
  const type = isGateway ? 'Gateway' : (depth === 0 ? 'Workstation' : (Math.random() > 0.8 ? 'RivalNode' : (Math.random() > 0.6 ? 'Database' : 'Workstation')));
  const hostname = depth === 0 ? 'home' : (depth === 1 && !parentHost ? 'public-relay' : generateHostname(org, type, city));
  
  const difficultyMult = 1 + (depth * 0.8); // Steeper difficulty curve for infinite scaling

  const server: Server = {
    hostname,
    ip: generateIP(),
    depth,
    city,
    organization: depth === 0 ? 'Player' : org,
    type: depth === 0 ? 'Mainframe' : (type as any),
    
    hasRoot: depth === 0,
    backdoorInstalled: false,
    securityLevel: depth === 0 ? 0 : Math.min(100, Math.floor(getRandomInt(5, 15) * difficultyMult)),
    minSecurity: Math.max(1, Math.floor(5 * difficultyMult)),
    
    moneyAvailable: depth === 0 ? 0 : Math.floor(getRandomInt(20000, 1000000) * difficultyMult),
    maxMoney: depth === 0 ? 0 : Math.floor(getRandomInt(1000000, 5000000) * difficultyMult),
    
    ramUsed: 0,
    maxRam: depth === 0 ? 8 : Math.pow(2, Math.min(12, Math.floor(getRandomInt(2, 6) + (depth * 0.4)))),
    
    portsRequired: depth === 0 ? 0 : Math.min(5, Math.floor(depth / 1.5)),
    openPorts: 0,
    sshOpen: false,
    ftpOpen: false,
    smtpOpen: false,
    httpOpen: false,
    sqlOpen: false,
    
    files: [],
    connections: parentHost ? [parentHost] : [],
    
    // Random position for visualizer
    x: Math.random() * 800,
    y: Math.random() * 600,
  };

  // Generate flavor files
  if (depth > 0 && Math.random() > 0.6) {
    server.files.push({
      name: `log_${getRandomInt(1000,9999)}.log`,
      content: `SERVER: ${hostname}\nLOC: ${city}\nSTATUS: OK\nTraffic Normal.`
    });
  }
  
  // Rival nodes have special data
  if (type === 'RivalNode') {
    server.files.push({
      name: 'operative_manifest.enc',
      content: 'ENCRYPTED RIVAL DATA. HACK TO DECRYPT.'
    });
  }

  return server;
};

export const initializeWorld = (): Record<string, Server> => {
  const startCity = CITIES[0];
  const home = generateServer(0, '', startCity);
  const relay = generateServer(1, 'home', startCity);
  
  home.connections.push(relay.hostname);
  
  return {
    [home.hostname]: home,
    [relay.hostname]: relay
  };
};

export const expandWorld = (currentWorld: Record<string, Server>, sourceHost: string): Record<string, Server> => {
  const source = currentWorld[sourceHost];
  if (!source) return currentWorld;
  
  const newWorld = { ...currentWorld };
  
  // New cluster logic
  // If we breach a Gateway, we unlock a NEW City
  // If we breach a normal node, we might just find more nodes in the SAME City
  
  const isMovingCities = source.type === 'Gateway';
  const newCity = isMovingCities ? CITIES[Math.min(CITIES.length - 1, (CITIES.indexOf(source.city) + 1) % CITIES.length)] : source.city;
  const newConnectionsCount = getRandomInt(2, 4);
  
  for (let i = 0; i < newConnectionsCount; i++) {
    // Chance for next node to be a Gateway to the NEXT city
    const isGateway = !isMovingCities && Math.random() > 0.9; 
    
    const newServer = generateServer(source.depth + 1, source.hostname, newCity, isGateway);
    
    if (!newWorld[newServer.hostname]) {
      newWorld[newServer.hostname] = newServer;
      newWorld[source.hostname] = {
        ...newWorld[source.hostname],
        connections: [...newWorld[source.hostname].connections, newServer.hostname]
      };
    }
  }
  
  return newWorld;
};
