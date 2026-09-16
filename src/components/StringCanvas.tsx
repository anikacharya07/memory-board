import React from 'react';
import type { MemoryNode } from '../types';

interface HubPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface StringCanvasProps {
  nodes: MemoryNode[];
  hubPos: HubPosition;
  activeHoverId: string | null;
  canvasWidth: number;
  canvasHeight: number;
}

export const StringCanvas: React.FC<StringCanvasProps> = ({
  nodes,
  hubPos,
  activeHoverId,
  canvasWidth,
  canvasHeight,
}) => {
  // Node anchor map (each node connects from its designated realistic pin anchor)
  const nodeMap = new Map<string, { x: number; y: number; width: number; height: number; rotation: number }>();

  nodes.forEach(node => {
    nodeMap.set(node.id, {
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
      rotation: node.rotation,
    });
  });

  // Hub anchor
  nodeMap.set('mem-hub', {
    x: hubPos.x,
    y: hubPos.y,
    width: hubPos.width,
    height: hubPos.height,
    rotation: 0,
  });

  // Calculate realistic anchor position on card (e.g. pinned near top/center)
  const getAnchorPoint = (nodeId: string, targetCenter: { x: number; y: number }) => {
    const node = nodeMap.get(nodeId);
    if (!node) return { x: 0, y: 0 };

    if (nodeId === 'mem-hub') {
      // Hub connects from its soft border towards the target
      const cx = node.x + node.width / 2;
      const cy = node.y + node.height / 2;
      const angle = Math.atan2(targetCenter.y - cy, targetCenter.x - cx);
      return {
        x: cx + Math.cos(angle) * (node.width * 0.44),
        y: cy + Math.sin(angle) * (node.height * 0.44),
      };
    }

    // On polaroids, strings are pinned to the top pin point or edge
    const cx = node.x + node.width / 2;
    const cy = node.y + node.height / 2;
    
    // Choose pin anchor near top edge with slight natural offset
    const pinX = cx;
    const pinY = node.y + 12;

    // Apply card rotation to anchor point
    const rad = (node.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const rx = cx + (pinX - cx) * cos - (pinY - cy) * sin;
    const ry = cy + (pinX - cx) * sin + (pinY - cy) * cos;

    return { x: rx, y: ry };
  };

  // Set of drawn edges to avoid duplicate overlapping lines
  const drawnEdges = new Set<string>();

  const stringPaths: {
    key: string;
    d: string;
    shadowD: string;
    p1: { x: number; y: number };
    p2: { x: number; y: number };
    isHighlighted: boolean;
    isSuperActive: boolean;
    distance: number;
  }[] = [];

  nodes.forEach(node => {
    node.connectedTo.forEach(targetId => {
      const edgeKey = [node.id, targetId].sort().join('--');
      if (drawnEdges.has(edgeKey)) return;
      drawnEdges.add(edgeKey);

      const target = nodeMap.get(targetId);
      if (!target) return;

      const fromNode = nodeMap.get(node.id);
      if (!fromNode) return;

      const fromCenter = { x: fromNode.x + fromNode.width / 2, y: fromNode.y + fromNode.height / 2 };
      const toCenter = { x: target.x + target.width / 2, y: target.y + target.height / 2 };

      const p1 = getAnchorPoint(node.id, toCenter);
      const p2 = getAnchorPoint(targetId, fromCenter);

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.hypot(dx, dy);

      // Realistic physical catenary sag calculation:
      // When nodes are close, thread hangs with generous relaxed slack.
      // When nodes are stretched far apart, string tightens with taut tension.
      const slack = Math.max(16, Math.min(65, (dist * 0.12) + (1400 / (dist + 80))));

      // Subtle organic perpendicular drape (slight gravity bias + gentle natural weave)
      const nx = -dy / (dist || 1);
      const ny = dx / (dist || 1);
      
      // Deterministic organic twist based on coordinates
      const seed = Math.sin(p1.x * 0.03 + p2.y * 0.04);
      const weave = seed * 10;

      // Downward gravity pull
      const gravitySag = Math.abs(dy) < 80 ? slack * 1.2 : slack * 0.8;

      const cp1x = p1.x + dx * 0.35 + nx * weave;
      const cp1y = p1.y + dy * 0.35 + ny * weave + gravitySag;

      const cp2x = p1.x + dx * 0.65 + nx * weave;
      const cp2y = p1.y + dy * 0.65 + ny * weave + gravitySag;

      // Main thread path
      const pathData = `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;

      // Realistic thread cast shadow (offset by light angle: light from top-left, shadow cast +2px x, +5px y)
      const shadowOffX = 1.5;
      const shadowOffY = 4.5;
      const shadowPathData = `M ${(p1.x + shadowOffX).toFixed(1)} ${(p1.y + shadowOffY).toFixed(1)} C ${(cp1x + shadowOffX).toFixed(1)} ${(cp1y + shadowOffY).toFixed(1)}, ${(cp2x + shadowOffX).toFixed(1)} ${(cp2y + shadowOffY).toFixed(1)}, ${(p2.x + shadowOffX).toFixed(1)} ${(p2.y + shadowOffY).toFixed(1)}`;

      const isHighlighted =
        activeHoverId === node.id ||
        activeHoverId === targetId ||
        (activeHoverId === 'mem-hub' && (node.id === 'mem-hub' || targetId === 'mem-hub'));

      const isSuperActive =
        activeHoverId !== null &&
        ((node.id === activeHoverId && targetId === 'mem-hub') ||
         (targetId === activeHoverId && node.id === 'mem-hub'));

      stringPaths.push({
        key: edgeKey,
        d: pathData,
        shadowD: shadowPathData,
        p1,
        p2,
        isHighlighted,
        isSuperActive,
        distance: dist,
      });
    });
  });

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-10 overflow-visible"
      width={Math.max(canvasWidth, 1200)}
      height={Math.max(canvasHeight, 1000)}
    >
      <defs>
        {/* Realistic Silk Thread Gradients */}
        <linearGradient id="silk-rose" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f472b6" stopOpacity="0.95" />
          <stop offset="35%" stopColor="#fb7185" stopOpacity="0.9" />
          <stop offset="70%" stopColor="#f43f5e" stopOpacity="0.92" />
          <stop offset="100%" stopColor="#e11d48" stopOpacity="0.95" />
        </linearGradient>

        <linearGradient id="silk-rose-glow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f43f5e" stopOpacity="1" />
          <stop offset="50%" stopColor="#fb7185" stopOpacity="1" />
          <stop offset="100%" stopColor="#e11d48" stopOpacity="1" />
        </linearGradient>

        {/* Realistic Thread Soft Shadow Filter */}
        <filter id="thread-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.8" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.35
                    0 0 0 0 0.12
                    0 0 0 0 0.2
                    0 0 0 0.18 0"
          />
        </filter>

        {/* Ambient Bloom Glow for Active Strings */}
        <filter id="thread-bloom" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Metallic Rose Gold Pin Head Radial Gradient */}
        <radialGradient id="pin-head-metallic" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="30%" stopColor="#fbcfe8" />
          <stop offset="65%" stopColor="#f43f5e" />
          <stop offset="95%" stopColor="#9f1239" />
          <stop offset="100%" stopColor="#4c0519" />
        </radialGradient>

        <filter id="pin-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0.5" dy="1.5" stdDeviation="1" floodColor="#4c0519" floodOpacity="0.3" />
        </filter>
      </defs>

      {stringPaths.map(item => (
        <g key={item.key} className="transition-all duration-300">
          {/* 1. Realistic Cast Shadow on the Canvas Paper */}
          <path
            d={item.shadowD}
            fill="none"
            stroke="rgba(80, 20, 40, 0.09)"
            strokeWidth={item.isHighlighted ? 3.5 : 2.2}
            strokeLinecap="round"
            filter="url(#thread-shadow)"
          />

          {/* 2. Ambient Color Halo (Soft dyed fiber bleed) */}
          <path
            d={item.d}
            fill="none"
            stroke={item.isHighlighted ? 'rgba(244, 63, 94, 0.35)' : 'rgba(251, 113, 133, 0.15)'}
            strokeWidth={item.isHighlighted ? 4.8 : 3.0}
            strokeLinecap="round"
          />

          {/* 3. Main Silk Thread (Delicate, vibrant, tactile) */}
          <path
            d={item.d}
            fill="none"
            stroke={item.isHighlighted ? 'url(#silk-rose-glow)' : 'url(#silk-rose)'}
            strokeWidth={item.isHighlighted ? 2.0 : 1.4}
            strokeLinecap="round"
            filter={item.isHighlighted ? 'url(#thread-bloom)' : undefined}
          />

          {/* 4. Fine Spun-Silk Highlight Fiber (Creates tactile woven sheen) */}
          <path
            d={item.d}
            fill="none"
            stroke="rgba(255, 255, 255, 0.65)"
            strokeWidth="0.55"
            strokeDasharray="5 3"
            strokeLinecap="round"
            opacity={item.isHighlighted ? 0.9 : 0.55}
          />

          {/* 5. Animated Pulse on Active Strings */}
          {item.isHighlighted && (
            <path
              d={item.d}
              fill="none"
              stroke="#ffffff"
              strokeWidth="1.2"
              strokeDasharray="12 40"
              strokeLinecap="round"
              className="animate-pulse opacity-70"
            />
          )}

          {/* 6. Pushpins at Anchor Endpoints */}
          {/* Pin 1 */}
          <circle
            cx={item.p1.x}
            cy={item.p1.y}
            r={item.isHighlighted ? 3.6 : 2.8}
            fill="url(#pin-head-metallic)"
            filter="url(#pin-shadow)"
          />
          <circle
            cx={item.p1.x - 0.7}
            cy={item.p1.y - 0.7}
            r={item.isHighlighted ? 1.0 : 0.8}
            fill="#ffffff"
            opacity="0.8"
          />

          {/* Pin 2 */}
          <circle
            cx={item.p2.x}
            cy={item.p2.y}
            r={item.isHighlighted ? 3.6 : 2.8}
            fill="url(#pin-head-metallic)"
            filter="url(#pin-shadow)"
          />
          <circle
            cx={item.p2.x - 0.7}
            cy={item.p2.y - 0.7}
            r={item.isHighlighted ? 1.0 : 0.8}
            fill="#ffffff"
            opacity="0.8"
          />
        </g>
      ))}
    </svg>
  );
};
