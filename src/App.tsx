import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { MemoryNode, DragState } from './types';
import { DEFAULT_MEMORIES } from './data/defaultMemories';
import { audioEngine } from './utils/audioEngine';
import { StringCanvas } from './components/StringCanvas';
import { MemoryCard } from './components/MemoryCard';
import { CentralHub } from './components/CentralHub';
import { AddMemoryModal } from './components/AddMemoryModal';
import { MemoryDetailModal } from './components/MemoryDetailModal';
import { Plus, Trash2, RotateCcw, Volume2, VolumeX, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

const STORAGE_KEY = 'romantic_memory_board_nodes_v1';

export function App() {
  const [nodes, setNodes] = useState<MemoryNode[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_MEMORIES;
  });

  const [canvasDimensions, setCanvasDimensions] = useState({ width: 1300, height: 950 });
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [activeHoverId, setActiveHoverId] = useState<string | null>(null);
  const [activeSoundNodeId, setActiveSoundNodeId] = useState<string | null>(null);
  const [hubActiveMemory, setHubActiveMemory] = useState<MemoryNode | null>(null);
  const [isDragOverHub, setIsDragOverHub] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [detailModalNode, setDetailModalNode] = useState<MemoryNode | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Central Hub Position & Dimensions
  const hubWidth = 180;
  const hubHeight = 175;
  const hubPos = {
    x: Math.max(380, Math.floor(canvasDimensions.width / 2 - hubWidth / 2)),
    y: Math.max(320, Math.floor(canvasDimensions.height / 2 - hubHeight / 2)),
    width: hubWidth,
    height: hubHeight,
  };

  // Update canvas bounds on resize
  useEffect(() => {
    const handleResize = () => {
      const w = Math.max(window.innerWidth, 1200);
      const h = Math.max(window.innerHeight, 950);
      setCanvasDimensions({ width: w, height: h });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Save to LocalStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nodes));
    } catch {}
  }, [nodes]);

  // Unlock Web Audio on any initial interaction
  const handleUserGesture = useCallback(() => {
    if (!hasInteracted) {
      setHasInteracted(true);
      audioEngine.unlockAudio();
    }
  }, [hasInteracted]);

  // Pointer down on a card to start dragging
  const handleCardPointerDown = (e: React.PointerEvent, node: MemoryNode) => {
    handleUserGesture();
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const pointerX = e.clientX - rect.left;
    const pointerY = e.clientY - rect.top;

    setDragState({
      nodeId: node.id,
      startX: pointerX,
      startY: pointerY,
      initialNodeX: node.x,
      initialNodeY: node.y,
    });

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  // Pointer move to drag card and check hub proximity
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const pointerX = e.clientX - rect.left;
    const pointerY = e.clientY - rect.top;

    const deltaX = pointerX - dragState.startX;
    const deltaY = pointerY - dragState.startY;

    const targetNode = nodes.find(n => n.id === dragState.nodeId);
    if (!targetNode) return;

    const newX = Math.max(20, Math.min(canvasDimensions.width - targetNode.width - 20, dragState.initialNodeX + deltaX));
    const newY = Math.max(70, Math.min(canvasDimensions.height - targetNode.height - 20, dragState.initialNodeY + deltaY));

    setNodes(prev =>
      prev.map(n => (n.id === dragState.nodeId ? { ...n, x: newX, y: newY } : n))
    );

    // Collision check with Central Hub (with magnetic margin)
    const nodeCenterX = newX + targetNode.width / 2;
    const nodeCenterY = newY + targetNode.height / 2;
    const margin = 45;
    const isOverHub =
      nodeCenterX >= hubPos.x - margin &&
      nodeCenterX <= hubPos.x + hubPos.width + margin &&
      nodeCenterY >= hubPos.y - margin &&
      nodeCenterY <= hubPos.y + hubPos.height + margin;

    setIsDragOverHub(isOverHub);

  };

  // Pointer up to finish drag
  const handlePointerUp = () => {
    if (!dragState) return;

    if (isDragOverHub) {
      const droppedNode = nodes.find(n => n.id === dragState.nodeId);
      if (droppedNode) {
        setHubActiveMemory(droppedNode);
        setActiveSoundNodeId(droppedNode.id);
        audioEngine.playMemory(droppedNode.id, droppedNode.audioPreset, droppedNode.audioUrl);

        // Gentle celebratory confetti
        confetti({
          particleCount: 40,
          spread: 55,
          origin: {
            x: (hubPos.x + hubPos.width / 2) / window.innerWidth,
            y: (hubPos.y + hubPos.height / 2) / window.innerHeight,
          },
          colors: ['#f472b6', '#fb7185', '#fbcfe8', '#fda4af'],
        });
      }
    }

    setDragState(null);
    setIsDragOverHub(false);
  };

  // Card Hover Sound Controls (Crucial Feature)
  const handleCardHoverStart = (node: MemoryNode) => {
    if (dragState) return;
    setActiveHoverId(node.id);
    setActiveSoundNodeId(node.id);
    handleUserGesture();
    audioEngine.playMemory(node.id, node.audioPreset, node.audioUrl, 280);
  };

  const handleCardHoverEnd = (node: MemoryNode) => {
    if (dragState) return;
    if (activeHoverId === node.id) {
      setActiveHoverId(null);
    }
    // If this node is not docked in the central hub, fade out its sound
    if (hubActiveMemory?.id !== node.id) {
      if (activeSoundNodeId === node.id) {
        setActiveSoundNodeId(null);
      }
      audioEngine.stopMemory(node.id, 320);
    }
  };

  // Add new memory to board
  const handleAddMemory = (
    data: Omit<MemoryNode, 'id' | 'x' | 'y' | 'rotation' | 'width' | 'height' | 'connectedTo'>
  ) => {
    const id = `mem-${Date.now()}`;
    // Position near the top-center or slightly staggered
    const randomOffset = (Math.random() - 0.5) * 120;
    const newX = Math.min(Math.max(hubPos.x + randomOffset, 100), canvasDimensions.width - 240);
    const newY = Math.min(Math.max(hubPos.y - 180 + randomOffset, 100), canvasDimensions.height - 240);

    // Connect to 2 closest nodes or hub
    const closestNodes = [...nodes]
      .sort((a, b) => {
        const da = Math.hypot(a.x - newX, a.y - newY);
        const db = Math.hypot(b.x - newX, b.y - newY);
        return da - db;
      })
      .slice(0, 2)
      .map(n => n.id);

    const newNode: MemoryNode = {
      ...data,
      id,
      x: newX,
      y: newY,
      rotation: (Math.random() - 0.5) * 6,
      width: 175,
      height: 220,
      connectedTo: closestNodes.length ? closestNodes : ['mem-hub'],
    };

    setNodes(prev => [newNode, ...prev]);

    // Play subtle chime & trigger confetti
    confetti({
      particleCount: 30,
      spread: 45,
      origin: { x: 0.5, y: 0.4 },
      colors: ['#f472b6', '#fed7aa', '#e9d5ff'],
    });
  };

  const handleDeleteNode = (id: string) => {
    if (hubActiveMemory?.id === id) {
      setHubActiveMemory(null);
      audioEngine.stopMemory(id);
    }
    setNodes(prev => prev.filter(n => n.id !== id));
  };

  const handleClearBoard = () => {
    if (window.confirm('Clear all memories from the board? You can restore them anytime with "reset".')) {
      audioEngine.stopAll();
      setHubActiveMemory(null);
      setNodes([]);
    }
  };

  const handleResetDefault = () => {
    audioEngine.stopAll();
    setHubActiveMemory(null);
    setNodes(DEFAULT_MEMORIES);
  };

  const toggleMute = () => {
    handleUserGesture();
    const muted = audioEngine.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div
      ref={containerRef}
      onClick={handleUserGesture}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="relative w-full min-h-screen bg-board-paper overflow-hidden select-none"
      style={{
        minWidth: `${canvasDimensions.width}px`,
        minHeight: `${canvasDimensions.height}px`,
      }}
    >
      {/* Ambient Romantic Dust Particles (Nostalgic Film Aura) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[18%] left-[12%] w-1.5 h-1.5 rounded-full bg-pink-300/40 blur-[0.8px] animate-float-particle" style={{ animationDuration: '9s' }} />
        <div className="absolute top-[45%] left-[30%] w-2 h-2 rounded-full bg-rose-200/35 blur-[1px] animate-float-particle" style={{ animationDuration: '12s', animationDelay: '2s' }} />
        <div className="absolute top-[28%] right-[22%] w-1.5 h-1.5 rounded-full bg-amber-200/40 blur-[0.8px] animate-float-particle" style={{ animationDuration: '10s', animationDelay: '4s' }} />
        <div className="absolute top-[68%] left-[62%] w-2 h-2 rounded-full bg-pink-200/35 blur-[1.2px] animate-float-particle" style={{ animationDuration: '14s', animationDelay: '1s' }} />
        <div className="absolute top-[75%] right-[15%] w-1.5 h-1.5 rounded-full bg-rose-300/30 blur-[0.8px] animate-float-particle" style={{ animationDuration: '11s', animationDelay: '3s' }} />
      </div>

      {/* Top Header & Minimalist Controls (Top Left & Top Right) */}
      <header className="fixed top-0 left-0 right-0 z-40 px-7 py-6 flex items-center justify-between pointer-events-none">
        {/* Top Left: the board / memories, on a string */}
        <div className="pointer-events-auto">
          <h1 className="text-[22px] font-normal tracking-[-0.03em] text-neutral-800 lowercase font-sans">
            the board
          </h1>
          <p className="text-[12.5px] text-neutral-400 font-light lowercase tracking-tight mt-0.5">
            memories, on a string
          </p>
        </div>

        {/* Top Right Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Sound Toggle Indicator */}
          <button
            onClick={toggleMute}
            className={`p-2 rounded-full border transition-all ${
              isMuted
                ? 'bg-neutral-100/90 text-neutral-400 border-neutral-200/60'
                : 'bg-white/90 backdrop-blur-md text-pink-500 border-pink-200/80 shadow-[0_2px_8px_rgba(244,114,182,0.15)]'
            }`}
            title={isMuted ? 'Unmute sound' : 'Mute sound'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* Reset button (shown if memories were cleared or altered) */}
          {nodes.length < DEFAULT_MEMORIES.length && (
            <button
              onClick={handleResetDefault}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-neutral-200/80 bg-white/80 hover:bg-white text-xs text-neutral-600 shadow-sm transition-all active:scale-95"
              title="Restore sample memories"
            >
              <RotateCcw className="w-3 h-3 text-neutral-500" />
              <span>restore</span>
            </button>
          )}

          {/* Clear Board Button */}
          {nodes.length > 0 && (
            <button
              onClick={handleClearBoard}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-transparent hover:border-neutral-200/70 hover:bg-white/80 text-xs text-neutral-400 hover:text-neutral-700 transition-all"
              title="Clear all cards"
            >
              <Trash2 className="w-3 h-3" />
              <span>clear</span>
            </button>
          )}

          {/* + Add Memory Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-neutral-200/90 bg-white/90 backdrop-blur-md hover:bg-white text-neutral-800 text-xs md:text-[13px] font-normal shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-md transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 text-neutral-500" />
            <span>add memory</span>
          </button>
        </div>
      </header>

      {/* Floating Audio Interaction Prompt (Unobtrusive) */}
      {!hasInteracted && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-neutral-900/85 text-white/90 backdrop-blur-xl px-4 py-2 rounded-full text-xs flex items-center gap-2 shadow-[0_10px_30px_rgba(0,0,0,0.15)] ring-1 ring-white/10 animate-pulse pointer-events-none">
          <Sparkles className="w-3.5 h-3.5 text-pink-300" />
          <span>click anywhere or hover a memory to explore sound</span>
        </div>
      )}

      {/* Dynamic Pink String Connections Canvas */}
      <StringCanvas
        nodes={nodes}
        hubPos={hubPos}
        activeHoverId={activeHoverId || (isDragOverHub ? 'mem-hub' : null)}
        canvasWidth={canvasDimensions.width}
        canvasHeight={canvasDimensions.height}
      />

      {/* Central Drop Hub ("drop a memory here / see what it sounds like") */}
      <CentralHub
        x={hubPos.x}
        y={hubPos.y}
        width={hubPos.width}
        height={hubPos.height}
        isDragOver={isDragOverHub}
        activeMemory={hubActiveMemory}
        onClearActiveMemory={() => {
          if (hubActiveMemory) {
            audioEngine.stopMemory(hubActiveMemory.id);
            setHubActiveMemory(null);
            setActiveSoundNodeId(null);
          }
        }}
        onDropMemory={memory => {
          setHubActiveMemory(memory);
          audioEngine.playMemory(memory.id, memory.audioPreset, memory.audioUrl);
        }}
      />

      {/* Scattered Draggable Memory Cards */}
      {nodes.map(node => (
        <MemoryCard
          key={node.id}
          node={node}
          isDragging={dragState?.nodeId === node.id}
          isHovered={activeHoverId === node.id}
          isPlayingAudio={activeSoundNodeId === node.id}
          onPointerDown={handleCardPointerDown}
          onHoverStart={handleCardHoverStart}
          onHoverEnd={handleCardHoverEnd}
          onClick={clickedNode => setDetailModalNode(clickedNode)}
          onDelete={handleDeleteNode}
        />
      ))}

      {/* Add Memory Modal */}
      <AddMemoryModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddMemory}
      />

      {/* Detail Scrapbook Modal */}
      <MemoryDetailModal
        node={detailModalNode}
        onClose={() => setDetailModalNode(null)}
        onDelete={handleDeleteNode}
        isPlaying={detailModalNode ? activeSoundNodeId === detailModalNode.id : false}
        onTogglePlay={node => {
          if (activeSoundNodeId === node.id) {
            audioEngine.stopMemory(node.id);
            setActiveSoundNodeId(null);
          } else {
            audioEngine.playMemory(node.id, node.audioPreset, node.audioUrl);
            setActiveSoundNodeId(node.id);
          }
        }}
      />
    </div>
  );
}

export default App;
