export const formatMoney = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(amount);
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

export const calculateProcessDuration = (op: string, skill: number, security: number): number => {
  const baseTime = 2000; // 2 seconds minimum
  const securityPenalty = security * 200;
  const skillBonus = skill * 50;
  
  let time = baseTime + securityPenalty - skillBonus;
  
  // Operation modifiers
  if (op === 'GROW') time *= 1.2;
  if (op === 'WEAKEN') time *= 1.5;
  if (op === 'SIPHON') time *= 1.0;
  
  return Math.max(1000, time); // Minimum 1 second
};

export const calculateRamCost = (content: string): number => {
  let cost = 1.5; // Base OS overhead
  if (content.includes('grow')) cost += 1.0;
  if (content.includes('weaken')) cost += 1.0;
  if (content.includes('siphon')) cost += 1.0;
  return cost;
};
