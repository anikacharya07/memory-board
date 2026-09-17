import React, { useRef, useState } from 'react';
import type { MemoryNode } from '../types';
import { Volume2, Sparkles, Music, BookOpen } from 'lucide-react';

interface MemoryCardProps {
  node: MemoryNode;
  isDragging: boolean;
  isHovered: boolean;
  isPlayingAudio: boolean;
  onPointerDown: (e: React.PointerEvent, node: MemoryNode) => void;
  onHoverStart: (node: MemoryNode) => void;
  onHoverEnd: (node: MemoryNode) => void;
  onClick: (node: MemoryNode) => void;
  onDelete?: (nodeId: string) => void;
}

export const MemoryCard: React.FC<MemoryCardProps> = ({
  node,
  isDragging,
  isHovered,
  isPlayingAudio,
  onPointerDown,
  onHoverStart,
  onHoverEnd,
  onClick,
}) => {
  const [imageError, setImageError] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const pointerStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const fallbackGradient =
    'linear-gradient(135deg, #fce7f3 0%, #ffe4e6 50%, #ede9fe 100%)';

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    pointerStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    onPointerDown(e, node);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDragging) return;

    // If already playing or on desktop hover, open modal
    // Otherwise on touch/phone, first tap plays sound, second tap opens modal
    onClick(node);
  };

  return (
    <div
      ref={cardRef}
      id={`memory-card-${node.id}`}
      style={{
        transform: `translate3d(${node.x}px, ${node.y}px, 0) rotate(${
          isDragging ? 0 : isHovered ? node.rotation * 0.25 : node.rotation
        }deg) scale(${isDragging ? 1.05 : isHovered ? 1.03 : 1})`,
        zIndex: isDragging ? 50 : isHovered ? 40 : 20,
        width: `${node.width}px`,
        touchAction: 'none',
      }}
      className="absolute select-none cursor-grab active:cursor-grabbing transition-transform duration-250 ease-out will-change-transform group"
      onPointerDown={handlePointerDown}
      onMouseEnter={() => onHoverStart(node)}
      onMouseLeave={() => onHoverEnd(node)}
      onClick={handleClick}
    >
      {/* Museum-Grade Fine Art Polaroid Card */}
      <div
        className={`relative bg-[#ffffff] p-2 sm:p-2.5 pb-2.5 sm:pb-3 rounded-[20px] sm:rounded-[22px] transition-all duration-300 border border-black/[0.04] ${
          isDragging
            ? 'shadow-[0_24px_50px_-12px_rgba(0,0,0,0.22),0_12px_24px_-6px_rgba(244,63,94,0.18)] ring-2 ring-pink-400/60'
            : isHovered || isPlayingAudio
            ? 'shadow-[0_20px_40px_-10px_rgba(0,0,0,0.12),0_8px_20px_-4px_rgba(244,114,182,0.18)] ring-1 ring-pink-300/50'
            : 'shadow-[0_2px_4px_rgba(0,0,0,0.02),0_8px_18px_-4px_rgba(0,0,0,0.06),0_16px_32px_-8px_rgba(244,114,182,0.05)]'
        }`}
      >
        {/* Rose Gold Metallic Pushpin at Top */}
        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div className="relative w-3.5 h-3.5 rounded-full bg-gradient-to-br from-rose-100 via-pink-400 to-rose-700 shadow-[0_1.5px_3px_rgba(0,0,0,0.25)] border border-rose-300/60 flex items-center justify-center">
            <div className="w-1 h-1 rounded-full bg-white/90 shadow-sm" />
          </div>
        </div>

        {/* Media Container with Inner Photographic Bevel */}
        <div
          className="relative w-full overflow-hidden rounded-[14px] sm:rounded-[16px] bg-neutral-50 ring-1 ring-black/[0.05]"
          style={{ height: `${node.height - 38}px` }}
        >
          {node.mediaType === 'video' ? (
            <video
              src={node.mediaUrl}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover pointer-events-none"
            />
          ) : !imageError ? (
            <img
              src={node.mediaUrl}
              alt={node.caption}
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
              className="w-full h-full object-cover pointer-events-none transition-transform duration-700 ease-out group-hover:scale-105"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center p-4 text-center text-xs text-neutral-600 font-serif italic"
              style={{ background: fallbackGradient }}
            >
              "{node.caption}"
            </div>
          )}

          {/* Subtle 35mm Analog Vignette / Sheen */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/[0.04] via-transparent to-black/[0.08] pointer-events-none" />

          {/* Audio Indicator Badge */}
          <div
            className={`absolute top-1.5 right-1.5 sm:top-2 sm:right-2 flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full backdrop-blur-md transition-all duration-300 ${
              isPlayingAudio
                ? 'bg-neutral-900/85 text-pink-300 shadow-[0_2px_10px_rgba(244,63,94,0.3)] ring-1 ring-pink-400/40 opacity-100'
                : 'bg-black/35 text-white/90 opacity-0 group-hover:opacity-100'
            }`}
            title={isPlayingAudio ? 'Soundtrack playing' : 'Tap/hover to hear sound'}
          >
            {isPlayingAudio ? (
              <>
                <Volume2 className="w-2.5 h-2.5 animate-pulse text-pink-400" />
                <span className="flex gap-0.5 items-end h-2 px-0.5">
                  <span className="w-0.5 bg-pink-400 rounded-full animate-[bounce_0.7s_infinite_100ms] h-2" />
                  <span className="w-0.5 bg-pink-400 rounded-full animate-[bounce_0.7s_infinite_280ms] h-2.5" />
                  <span className="w-0.5 bg-pink-400 rounded-full animate-[bounce_0.7s_infinite_180ms] h-1.5" />
                </span>
              </>
            ) : (
              <Music className="w-2.5 h-2.5" />
            )}
          </div>

          {/* Mobile Tap-For-Story Hint when playing */}
          {isPlayingAudio && node.note && (
            <div className="absolute bottom-1.5 left-1.5 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-neutral-900/75 backdrop-blur-sm text-[9px] text-pink-200">
              <BookOpen className="w-2.5 h-2.5" />
              <span>tap for note</span>
            </div>
          )}

          {/* Subtle Hover Specular Reflection */}
          <div
            className={`absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.07] to-transparent pointer-events-none transition-opacity duration-300 ${
              isHovered || isPlayingAudio ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </div>

        {/* Minimalist Lowercase Caption below photo */}
        <div className="pt-1.5 sm:pt-2 px-0.5 sm:px-1 text-left flex items-center justify-between">
          <p className="text-[11px] sm:text-[11.5px] font-normal tracking-[-0.01em] text-neutral-500 lowercase truncate font-sans">
            {node.caption}
          </p>

          {node.note && (isHovered || isPlayingAudio) && (
            <Sparkles className="w-2.5 h-2.5 text-pink-400 shrink-0 opacity-80 animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
};
