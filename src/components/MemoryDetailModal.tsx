import React from 'react';
import type { MemoryNode } from '../types';
import { audioEngine } from '../utils/audioEngine';
import { X, Volume2, Trash2, Heart, Calendar } from 'lucide-react';

interface MemoryDetailModalProps {
  node: MemoryNode | null;
  onClose: () => void;
  onDelete: (id: string) => void;
  isPlaying: boolean;
  onTogglePlay: (node: MemoryNode) => void;
}

export const MemoryDetailModal: React.FC<MemoryDetailModalProps> = ({
  node,
  onClose,
  onDelete,
  isPlaying,
  onTogglePlay,
}) => {
  if (!node) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-sm sm:max-w-md bg-white rounded-[26px] sm:rounded-[32px] shadow-2xl overflow-hidden border border-neutral-100 transform transition-all max-h-[90dvh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={() => {
            audioEngine.stopMemory(node.id);
            onClose();
          }}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 p-2 rounded-full bg-black/40 text-white/90 hover:bg-black/60 transition-colors backdrop-blur-md"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Media Frame */}
        <div className="relative w-full aspect-[4/3] sm:aspect-square bg-neutral-900 overflow-hidden shrink-0">
          {node.mediaType === 'video' ? (
            <video
              src={node.mediaUrl}
              autoPlay
              loop
              muted={!isPlaying}
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={node.mediaUrl}
              alt={node.caption}
              className="w-full h-full object-cover"
            />
          )}

          {/* Sound wave overlay when playing */}
          {isPlaying && (
            <div className="absolute bottom-3 left-3 bg-neutral-900/80 backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1.5 text-xs text-pink-300">
              <Volume2 className="w-3.5 h-3.5 animate-pulse" />
              <span className="font-mono text-[11px]">soundtrack playing</span>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-medium tracking-tight text-neutral-800 lowercase">
                {node.caption}
              </h2>
              {node.date && (
                <div className="flex items-center gap-1.5 text-xs text-neutral-400 mt-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{node.date}</span>
                </div>
              )}
            </div>

            {/* Audio Toggle Button */}
            <button
              onClick={() => onTogglePlay(node)}
              className={`p-2.5 rounded-full border transition-all ${
                isPlaying
                  ? 'bg-pink-500 text-white border-pink-500 shadow-md shadow-pink-300/50'
                  : 'bg-neutral-100 text-neutral-700 border-neutral-200 hover:bg-neutral-200'
              }`}
              title={isPlaying ? 'Pause sound' : 'Play soundtrack'}
            >
              <Volume2 className={`w-4 h-4 ${isPlaying ? 'animate-pulse' : ''}`} />
            </button>
          </div>

          {/* Romantic Note */}
          {node.note ? (
            <div className="mt-4 p-4 rounded-2xl bg-pink-50/50 border border-pink-100/80 text-neutral-700 text-sm leading-relaxed font-serif italic flex gap-2.5">
              <Heart className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
              <p>"{node.note}"</p>
            </div>
          ) : (
            <p className="mt-4 text-xs text-neutral-400 italic">
              a sweet memory pinned on the string.
            </p>
          )}

          {/* Bottom Actions */}
          <div className="mt-6 pt-4 border-t border-neutral-100 flex items-center justify-between text-xs">
            <button
              onClick={() => {
                audioEngine.stopMemory(node.id);
                onDelete(node.id);
                onClose();
              }}
              className="inline-flex items-center gap-1 text-neutral-400 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>remove memory</span>
            </button>

            <span className="text-[11px] text-neutral-400">
              {node.connectedTo.length} string connections
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
