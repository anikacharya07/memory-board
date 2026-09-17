import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { MemoryNode, DragState, BoardMetadata } from './types';
import { DEFAULT_MEMORIES } from './data/defaultMemories';
import { audioEngine } from './utils/audioEngine';
import { StringCanvas } from './components/StringCanvas';
import { MemoryCard } from './components/MemoryCard';
import { CentralHub } from './components/CentralHub';
import { AddMemoryModal } from './components/AddMemoryModal';
import { MemoryDetailModal } from './components/MemoryDetailModal';
import { ShareBoardModal } from './components/ShareBoardModal';
import { GiftWelcomeOverlay } from './components/GiftWelcomeOverlay';
import { parseBoardFromUrl } from './utils/shareUtils';
import { Plus, Trash2, RotateCcw, Volume2, VolumeX, Sparkles, Gift, BookmarkCheck, Maximize2, Minimize2 } from 'lucide-react';
import confetti from 'canvas-confetti';

const STORAGE_KEY = 'romantic_memory_board_nodes_v1';
const METADATA_KEY = 'romantic_memory_board_meta_v1';

export function App() {
  // Check if board was loaded via share link (hash #board=...)
  const initialSharedData = useRef(parseBoardFromUrl()).current;

  const [metadata, setMetadata] = useState<BoardMetadata>(() => {
    if (initialSharedData?.metadata) {
      return initialSharedData.metadata;
    }
    try {
      const saved = localStorage.getItem(METADATA_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      title: 'the board',
      subtitle: 'memories, on a string',
    };
  });

  const [nodes, setNodes] = useState<MemoryNode[]>(() => {
    if (initialSharedData?.nodes && Array.isArray(initialSharedData.nodes)) {
      return initialSharedData.nodes;
    }
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
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isWelcomeOverlayOpen, setIsWelcomeOverlayOpen] = useState(Boolean(initialSharedData));
  const [isViewingSharedBoard, setIsViewingSharedBoard] = useState(Boolean(initialSharedData));
  const [detailModalNode, setDetailModalNode] = useState<MemoryNode | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [savedNotification, setSavedNotification] = useState(false);

  // Mobile responsiveness states
  const [isMobileView, setIsMobileView] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [isMobileFit, setIsMobileFit] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Central Hub Position & Dimensions
  const hubWidth = 180;
  const hubHeight = 175;
  const hubPos = {
    x: Math.max(380, Math.floor(canvasDimensions.width / 2 - hubWidth / 2)),
    y: Math.max(320, Math.floor(canvasDimensions.height / 2 - hubHeight / 2)),
    width: hubWidth,
    height: hubHeight,
  };

  // Update canvas bounds & detect mobile on resize
  useEffect(() => {
    const handleResize = () => {
      const w = Math.max(window.innerWidth, 1200);
      const h = Math.max(window.innerHeight, 950);
      setCanvasDimensions({ width: w, height: h });
      setIsMobileView(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-center scroll viewport on central hub on initial mount (for phones)
  useEffect(() => {
    if (viewportRef.current && window.innerWidth < 768 && !isMobileFit) {
      const timer = setTimeout(() => {
        const hubCenterX = hubPos.x + hubPos.width / 2;
        const hubCenterY = hubPos.y + hubPos.height / 2;
        const targetScrollX = Math.max(0, hubCenterX - window.innerWidth / 2);
        const targetScrollY = Math.max(0, hubCenterY - window.innerHeight / 2);
        viewportRef.current?.scrollTo({
          left: targetScrollX,
          top: targetScrollY,
          behavior: 'smooth',
        });
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isMobileFit]);

  // Save to LocalStorage on change (only if not viewing a temporary shared link)
  useEffect(() => {
    if (!isViewingSharedBoard) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nodes));
        localStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
      } catch {}
    }
  }, [nodes, metadata, isViewingSharedBoard]);

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

  // Card Hover Sound Controls (Desktop)
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
    if (hubActiveMemory?.id !== node.id) {
      if (activeSoundNodeId === node.id) {
        setActiveSoundNodeId(null);
      }
      audioEngine.stopMemory(node.id, 320);
    }
  };

  // Card Tap / Click Behavior (Touch-Optimized)
  const handleCardClick = (clickedNode: MemoryNode) => {
    if (dragState) return;
    handleUserGesture();

    // If on mobile or not playing, first tap plays sound
    if (activeSoundNodeId !== clickedNode.id) {
      audioEngine.playMemory(clickedNode.id, clickedNode.audioPreset, clickedNode.audioUrl);
      setActiveSoundNodeId(clickedNode.id);
      setActiveHoverId(clickedNode.id);
    } else {
      // Second tap on the active memory opens the romantic detail modal
      setDetailModalNode(clickedNode);
    }
  };

  // Add new memory to board
  const handleAddMemory = (
    data: Omit<MemoryNode, 'id' | 'x' | 'y' | 'rotation' | 'width' | 'height' | 'connectedTo'>
  ) => {
    const id = `mem-${Date.now()}`;
    const randomOffset = (Math.random() - 0.5) * 120;
    const newX = Math.min(Math.max(hubPos.x + randomOffset, 100), canvasDimensions.width - 240);
    const newY = Math.min(Math.max(hubPos.y - 180 + randomOffset, 100), canvasDimensions.height - 240);

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
    setMetadata({ title: 'the board', subtitle: 'memories, on a string' });
    setIsViewingSharedBoard(false);
    window.location.hash = '';
  };

  const handleSaveSharedBoardToDevice = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nodes));
      localStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
      setIsViewingSharedBoard(false);
      window.location.hash = '';
      setSavedNotification(true);
      setTimeout(() => setSavedNotification(false), 3000);
    } catch {}
  };

  const handleImportBoard = (importedNodes: MemoryNode[], importedMeta: BoardMetadata) => {
    setNodes(importedNodes);
    setMetadata(importedMeta);
    setIsViewingSharedBoard(false);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(importedNodes));
      localStorage.setItem(METADATA_KEY, JSON.stringify(importedMeta));
    } catch {}
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.5 },
      colors: ['#f472b6', '#fda4af', '#fbcfe8'],
    });
  };

  const toggleMute = () => {
    handleUserGesture();
    const muted = audioEngine.toggleMute();
    setIsMuted(muted);
  };

  // Mobile fit scale factor
  const mobileScale = isMobileView
    ? Math.min(1, (window.innerWidth - 16) / canvasDimensions.width)
    : 1;

  return (
    <div
      ref={viewportRef}
      className="relative w-full h-[100dvh] overflow-auto overscroll-contain touch-scrollable bg-board-paper select-none"
    >
      {/* Top Banner: Shared Board Notification */}
      {isViewingSharedBoard && (
        <div className="fixed top-0 inset-x-0 z-50 bg-gradient-to-r from-pink-500/95 via-rose-500/95 to-pink-600/95 text-white px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs flex items-center justify-between shadow-md backdrop-blur-md">
          <span className="flex items-center gap-1.5 font-light truncate max-w-[60%]">
            <Gift className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              {metadata.recipientName
                ? `gifted to ${metadata.recipientName}`
                : 'viewing a shared memory board'}
            </span>
          </span>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={handleSaveSharedBoardToDevice}
              className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-white text-pink-700 font-medium hover:bg-pink-50 transition-colors text-[10.5px] sm:text-xs"
            >
              <BookmarkCheck className="w-3 h-3" />
              <span>save</span>
            </button>
            <button
              onClick={handleResetDefault}
              className="px-2 py-0.5 text-white/80 hover:text-white transition-colors text-[10.5px] sm:text-xs"
            >
              exit
            </button>
          </div>
        </div>
      )}

      {/* Save Success Toast Notification */}
      {savedNotification && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 bg-neutral-900/90 text-white px-4 py-2 rounded-full text-xs flex items-center gap-2 shadow-xl animate-fadeIn">
          <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>saved to your device!</span>
        </div>
      )}

      {/* Top Header & Minimalist Controls (Mobile-Optimized) */}
      <header
        className={`fixed left-0 right-0 z-40 px-3.5 sm:px-7 py-3 sm:py-6 flex items-center justify-between pointer-events-none transition-all ${
          isViewingSharedBoard ? 'top-8 sm:top-8' : 'top-0'
        }`}
      >
        {/* Top Left: the board / memories, on a string */}
        <div className="pointer-events-auto">
          <h1 className="text-base sm:text-[22px] font-normal tracking-[-0.03em] text-neutral-800 lowercase font-sans leading-tight">
            {metadata.title || 'the board'}
          </h1>
          <p className="text-[10px] sm:text-[12.5px] text-neutral-400 font-light lowercase tracking-tight">
            {metadata.subtitle || 'memories, on a string'}
          </p>
        </div>

        {/* Top Right Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
          {/* Sound Toggle Indicator */}
          <button
            onClick={toggleMute}
            className={`p-1.5 sm:p-2 rounded-full border transition-all ${
              isMuted
                ? 'bg-neutral-100/90 text-neutral-400 border-neutral-200/60'
                : 'bg-white/90 backdrop-blur-md text-pink-500 border-pink-200/80 shadow-[0_2px_8px_rgba(244,114,182,0.15)]'
            }`}
            title={isMuted ? 'Unmute sound' : 'Mute sound'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* Share / Gift Board Button */}
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full border border-pink-200 bg-pink-50/85 hover:bg-pink-100/90 text-pink-700 text-xs sm:text-[13px] font-medium shadow-[0_2px_8px_rgba(244,114,182,0.15)] hover:shadow-md transition-all active:scale-95"
            title="Share or gift this board"
          >
            <Gift className="w-3.5 h-3.5 text-pink-600" />
            <span className="hidden sm:inline">share board</span>
            <span className="sm:hidden">share</span>
          </button>

          {/* Reset button */}
          {nodes.length < DEFAULT_MEMORIES.length && (
            <button
              onClick={handleResetDefault}
              className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border border-neutral-200/80 bg-white/80 hover:bg-white text-xs text-neutral-600 shadow-sm transition-all active:scale-95"
              title="Restore sample memories"
            >
              <RotateCcw className="w-3 h-3 text-neutral-500" />
              <span className="hidden sm:inline">restore</span>
            </button>
          )}

          {/* Clear Board Button */}
          {nodes.length > 0 && (
            <button
              onClick={handleClearBoard}
              className="p-1.5 sm:px-3 sm:py-1.5 rounded-full border border-transparent hover:border-neutral-200/70 hover:bg-white/80 text-neutral-400 hover:text-neutral-700 transition-all"
              title="Clear all cards"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-xs ml-1">clear</span>
            </button>
          )}

          {/* + Add Memory Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-full border border-neutral-200/90 bg-white/90 backdrop-blur-md hover:bg-white text-neutral-800 text-xs sm:text-[13px] font-normal shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-md transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 text-neutral-500" />
            <span className="hidden sm:inline">add memory</span>
            <span className="sm:hidden">add</span>
          </button>
        </div>
      </header>

      {/* Floating Audio Interaction Prompt (Unobtrusive) */}
      {!hasInteracted && !isWelcomeOverlayOpen && (
        <div className="fixed bottom-14 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 bg-neutral-900/85 text-white/90 backdrop-blur-xl px-4 py-2 rounded-full text-[11px] sm:text-xs flex items-center gap-2 shadow-[0_10px_30px_rgba(0,0,0,0.15)] ring-1 ring-white/10 animate-pulse pointer-events-none whitespace-nowrap">
          <Sparkles className="w-3.5 h-3.5 text-pink-300 shrink-0" />
          <span>tap any memory to hear its soundtrack</span>
        </div>
      )}

      {/* Mobile Fit View Toggle Pill (Phone-Only Feature) */}
      {isMobileView && (
        <button
          onClick={() => {
            handleUserGesture();
            setIsMobileFit(prev => !prev);
          }}
          className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-neutral-200/90 shadow-md text-[11px] font-medium text-neutral-700 active:scale-95 transition-all"
        >
          {isMobileFit ? (
            <>
              <Maximize2 className="w-3 h-3 text-pink-500" />
              <span>100% zoom</span>
            </>
          ) : (
            <>
              <Minimize2 className="w-3 h-3 text-pink-500" />
              <span>fit constellation</span>
            </>
          )}
        </button>
      )}

      {/* Board Canvas (Scalable for phone view) */}
      <div
        ref={containerRef}
        onClick={handleUserGesture}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative transition-transform duration-300 ease-out origin-top-left"
        style={{
          width: `${canvasDimensions.width}px`,
          height: `${canvasDimensions.height}px`,
          transform: isMobileFit ? `scale(${mobileScale})` : 'none',
          marginBottom: isMobileFit ? `-${canvasDimensions.height * (1 - mobileScale)}px` : undefined,
          marginRight: isMobileFit ? `-${canvasDimensions.width * (1 - mobileScale)}px` : undefined,
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
            onClick={handleCardClick}
            onDelete={handleDeleteNode}
          />
        ))}
      </div>

      {/* Add Memory Modal */}
      <AddMemoryModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddMemory}
      />

      {/* Share / Gift Board Modal */}
      <ShareBoardModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        nodes={nodes}
        metadata={metadata}
        onUpdateMetadata={setMetadata}
        onImportBoard={handleImportBoard}
      />

      {/* Gift Welcome Overlay (shown when opening via a shared link) */}
      <GiftWelcomeOverlay
        isOpen={isWelcomeOverlayOpen}
        metadata={metadata}
        onOpenBoard={() => {
          setIsWelcomeOverlayOpen(false);
          handleUserGesture();
        }}
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
