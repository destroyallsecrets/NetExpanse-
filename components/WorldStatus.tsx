import React, { useEffect, useRef, useState } from 'react';
import { Server, LogEntry } from '../types';

interface WorldStatusProps {
  servers: Record<string, Server>;
  currentHostname: string;
  onNavigate: (hostname: string) => void;
  lastLog?: LogEntry;
}

const getLogColor = (type?: LogEntry['type']) => {
  switch (type) {
    case 'error': return '#ef4444'; // Red
    case 'success': return '#22c55e'; // Bright Green
    case 'warn': return '#eab308'; // Yellow
    case 'chat': return '#d946ef'; // Magenta (distinct from system)
    case 'system': return '#3b82f6'; // Blue (Requested)
    case 'info': return '#06b6d4'; // Cyan
    default: return '#15803d'; // Base Matrix Green (dim)
  }
};

const textToBinary = (text: string): string => {
  return text.split('')
    .map(char => char.charCodeAt(0).toString(2).padStart(8, '0'))
    .join(''); // Returns a stream of 0s and 1s representing the text
};

const MatrixRain = ({ lastLog }: { lastLog?: LogEntry }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dropsRef = useRef<number[]>([]);
  const colorsRef = useRef<string[]>([]);
  const payloadsRef = useRef<(string | null)[]>([]); // Store binary strings per column
  const lastLogIdRef = useRef<string | null>(null);
  
  // Chaos System
  const chaosRef = useRef<number>(0); // 0 to 100+
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initial Resize
    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || 800;
      canvas.height = canvas.parentElement?.clientHeight || 600;
      
      const fontSize = 14;
      const columns = Math.ceil(canvas.width / fontSize);
      
      // Initialize if size changed drastically or first run
      if (dropsRef.current.length !== columns) {
        dropsRef.current = new Array(columns).fill(0).map(() => Math.random() * -100);
        colorsRef.current = new Array(columns).fill('#15803d');
        payloadsRef.current = new Array(columns).fill(null);
      }
    };
    resize();
    window.addEventListener('resize', resize);

    const chars = '01';
    const fontSize = 14;

    const animate = (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const deltaTime = time - lastTimeRef.current;

      // Decay chaos slowly
      chaosRef.current = Math.max(0, chaosRef.current - 0.2);

      // Dynamic Speed Control based on Chaos
      // Base: ~30fps (33ms). High Chaos: ~60fps+ (16ms or less)
      const baseInterval = 33;
      const targetInterval = Math.max(10, baseInterval - (chaosRef.current * 0.3));

      if (deltaTime < targetInterval) {
        requestRef.current = requestAnimationFrame(animate);
        return;
      }
      
      lastTimeRef.current = time;

      // Fade effect - Chaos affects trail length (lower alpha = longer trails)
      const fadeAlpha = chaosRef.current > 50 ? 0.08 : 0.1; 
      ctx.fillStyle = `rgba(0, 0, 0, ${fadeAlpha})`; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${fontSize}px monospace`;
      
      const drops = dropsRef.current;
      const colors = colorsRef.current;
      const payloads = payloadsRef.current;

      // Chaos affects density (reset threshold)
      const resetThreshold = 0.975 - (chaosRef.current * 0.0005);

      for (let i = 0; i < drops.length; i++) {
        let text = chars.charAt(Math.floor(Math.random() * chars.length));
        let isPayloadActive = false;

        // If this column has a binary payload, use it
        if (payloads[i]) {
            const idx = Math.floor(drops[i]);
            // If we are within the string length, print that bit
            if (idx >= 0 && idx < payloads[i]!.length) {
                text = payloads[i]![idx];
                isPayloadActive = true;
            } else if (idx >= payloads[i]!.length) {
                // Payload finished, revert to random matrix noise
                payloads[i] = null;
                colors[i] = '#15803d';
            }
        }
        
        ctx.fillStyle = colors[i];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        // Reset condition
        if (drops[i] * fontSize > canvas.height && Math.random() > resetThreshold) {
          drops[i] = 0;
          // If a payload hits bottom, clear it to prevent wrapping/glitching
          if (isPayloadActive) {
             payloads[i] = null;
             colors[i] = '#15803d'; 
          }
        }
        
        // Move drop - Chaos affects vertical speed (skipping rows)
        const speedBoost = chaosRef.current > 75 ? 2 : 1;
        drops[i] += speedBoost;
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    
    return () => {
      cancelAnimationFrame(requestRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  // React to events by injecting binary strings into the rain and boosting chaos
  useEffect(() => {
    if (!lastLog || lastLog.id === lastLogIdRef.current) return;
    lastLogIdRef.current = lastLog.id;

    const color = getLogColor(lastLog.type);
    const binaryMessage = textToBinary(lastLog.message); // Convert log to binary
    
    const drops = dropsRef.current;
    const colors = colorsRef.current;
    const payloads = payloadsRef.current;
    
    // Determine intensity and chaos boost based on log type
    let intensity = 0.15; 
    let chaosBoost = 5;

    if (lastLog.type === 'error') {
        intensity = 0.4;
        chaosBoost = 40;
    } else if (lastLog.type === 'success') {
        intensity = 0.3;
        chaosBoost = 20;
    } else if (lastLog.type === 'warn') {
        chaosBoost = 15;
    } else if (lastLog.type === 'system') {
        intensity = 0.5;
        chaosBoost = 10;
    }

    // Apply chaos
    chaosRef.current = Math.min(100, chaosRef.current + chaosBoost);

    const count = Math.max(1, Math.floor(drops.length * intensity));
    
    for (let k = 0; k < count; k++) {
      const col = Math.floor(Math.random() * drops.length);
      colors[col] = color;
      payloads[col] = binaryMessage; // Inject binary string
      drops[col] = 0; // Reset to top to start streaming the message
    }

  }, [lastLog]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-40 pointer-events-none" />;
};

const WorldStatus: React.FC<WorldStatusProps> = ({ servers, currentHostname, onNavigate, lastLog }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 800, h: 600 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const serverList = Object.values(servers);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    const scale = viewBox.w / (containerRef.current?.clientWidth || 1);
    
    setViewBox(prev => ({
      ...prev,
      x: prev.x - dx * scale,
      y: prev.y - dy * scale
    }));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    const scaleFactor = 1.1;
    const direction = e.deltaY > 0 ? 1 : -1;
    const factor = direction > 0 ? scaleFactor : 1 / scaleFactor;
    
    setViewBox(prev => ({
      ...prev,
      w: prev.w * factor,
      h: prev.h * factor,
    }));
  };

  return (
    <div 
      ref={containerRef} 
      className="bg-black border border-green-900/50 rounded-lg h-full overflow-hidden relative flex flex-col cursor-move select-none shadow-[0_0_20px_rgba(0,255,0,0.1)]"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      <MatrixRain lastLog={lastLog} />
      
      {/* HUD Layer */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none p-2 rounded border border-green-900/30 bg-black/80 backdrop-blur-sm">
        <h2 className="text-xl font-bold text-green-500 font-mono glow-text">CONSTRUCT_MAP_V2</h2>
        <div className="text-xs text-green-700 font-mono mt-1">
          NODES: {serverList.length} | ROOTED: {serverList.filter(s => s.hasRoot).length}
        </div>
        <div className="text-[10px] text-green-800 mt-2 max-w-[200px]">
          INTERACTION: DRAG TO PAN, SCROLL TO ZOOM. CLICK NODES TO CONNECT.
        </div>
      </div>

      <div className="flex-1 relative z-0">
         <svg 
            width="100%" 
            height="100%" 
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`} 
            className="w-full h-full block"
            preserveAspectRatio="xMidYMid slice"
         >
            <defs>
              <filter id="matrix-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            {/* Connections */}
            {serverList.map(server => 
              server.connections.map(targetName => {
                const target = servers[targetName];
                if (!target) return null;
                if (server.hostname > targetName) return null; 

                const pathId = `edge-${server.hostname}-${targetName}`;
                const bitStream = "1 0 1 0 1 0 0 1 1 0 1 0 1 0 0 1 ".repeat(20);

                return (
                  <g key={pathId} className="opacity-60">
                    <path 
                      id={pathId}
                      d={`M ${server.x || 400} ${server.y || 300} L ${target.x || 400} ${target.y || 300}`}
                      fill="none"
                      stroke="none"
                    />
                    <text dy="-2" fontSize="10" fontFamily="monospace" fill="#003300" className="pointer-events-none">
                      <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
                        {bitStream}
                      </textPath>
                    </text>
                    <text dy="-2" fontSize="10" fontFamily="monospace" fill={server.hasRoot && target.hasRoot ? "#22c55e" : "#15803d"} className="pointer-events-none">
                      <textPath href={`#${pathId}`} startOffset="0%">
                        {bitStream}
                        <animate attributeName="startOffset" from="100%" to="0%" dur="10s" repeatCount="indefinite" />
                      </textPath>
                    </text>
                  </g>
                );
              })
            )}

            {/* Nodes */}
            {serverList.map(server => {
               const isRoot = server.hasRoot;
               const isCurrent = server.hostname === currentHostname;
               const isGateway = server.type === 'Gateway';
               const isRival = server.type === 'RivalNode';
               
               const nodeColor = isCurrent ? '#22c55e' : isRoot ? '#4ade80' : isRival ? '#ef4444' : isGateway ? '#facc15' : '#14532d';
               const glow = isCurrent || isRoot;

               return (
                <g 
                  key={server.hostname} 
                  transform={`translate(${server.x || 400}, ${server.y || 300})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate(server.hostname);
                  }}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                >
                  {(isGateway || isCurrent) && (
                     <circle r={25} stroke={nodeColor} strokeWidth="1" strokeDasharray="4 2" fill="none" opacity="0.5">
                        <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur="20s" repeatCount="indefinite" />
                     </circle>
                  )}

                  <text 
                    textAnchor="middle" 
                    dy=".35em" 
                    fill={nodeColor}
                    fontSize={isGateway ? "36" : "24"}
                    fontFamily="monospace"
                    fontWeight="bold"
                    filter={glow ? "url(#matrix-glow)" : ""}
                  >
                    {isRoot ? '1' : '0'}
                  </text>

                  <text 
                    y={25} 
                    textAnchor="middle" 
                    fill={isCurrent ? '#22c55e' : '#065f46'}
                    fontSize="10"
                    fontFamily="monospace"
                    className="select-none uppercase tracking-widest"
                  >
                    [{server.hostname}]
                  </text>
                </g>
              );
            })}
         </svg>
      </div>

      <div className="p-1 bg-black border-t border-green-900/50 text-[10px] text-green-800 flex justify-between uppercase tracking-widest font-mono relative z-10">
        <div>Coordinates: {Math.floor(viewBox.x)}, {Math.floor(viewBox.y)}</div>
        <div>Zoom: {Math.round((800 / viewBox.w) * 100)}%</div>
      </div>
    </div>
  );
};

export default WorldStatus;