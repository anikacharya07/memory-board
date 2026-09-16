import React, { useEffect, useRef, useState } from 'react';
import type { MemoryNode } from '../types';
import { audioEngine } from '../utils/audioEngine';
import { Disc3, Sparkles, X, Volume2 } from 'lucide-react';

interface CentralHubProps {
  x: number;
  y: number;
  width: number;
  height: number;
  isDragOver: boolean;
  activeMemory: MemoryNode | null;
  onClearActiveMemory: () => void;
  onDropMemory: (memory: MemoryNode) => void;
}

export const CentralHub: React.FC<CentralHubProps> = ({
  x,
  y,
  width,
  height,
  isDragOver,
  activeMemory,
  onClearActiveMemory,
}) => {
  const [visualizerBars, setVisualizerBars] = useState<number[]>([15, 25, 45, 35, 20, 38, 24, 30]);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const dataArray = new Uint8Array(16);

    const updateVisualizer = () => {
      if (activeMemory) {
        audioEngine.getByteFrequencyData(dataArray);
        const bars: number[] = [];
        for (let i = 0; i < 8; i++) {
          const val = dataArray[i * 2] || 0;
          bars.push(Math.max(8, (val / 255) * 42));
        }
        setVisualizerBars(bars);
      }
      animFrameRef.current = requestAnimationFrame(updateVisualizer);
    };

    animFrameRef.current = requestAnimationFrame(updateVisualizer);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [activeMemory]);

  return (
    <div
      id="central-hub"
      style={{
        transform: `translate3d(${x}px, ${y}px, 0)`,
        width: `${width}px`,
        height: `${height}px`,
      }}
      className={`absolute z-30 select-none transition-transform duration-300 ease-out ${
        isDragOver ? 'scale-105' : 'scale-100'
      }`}
    >
      {/* Ambient Resonance Glow underneath */}
      <div
        className={`absolute -inset-4 rounded-[36px] transition-all duration-700 pointer-events-none ${
          activeMemory
            ? 'bg-gradient-to-tr from-pink-400/20 via-rose-300/15 to-transparent blur-xl opacity-100'
            : isDragOver
            ? 'bg-pink-400/25 blur-lg opacity-100'
            : 'opacity-0'
        }`}
      />

      {/* Outer Soundwave Rings (When Playing) */}
      {activeMemory && (
        <div className="absolute -inset-5 pointer-events-none flex items-center justify-center">
          <div className="absolute w-[108%] h-[108%] rounded-[34px] border border-pink-300/30 animate-ping opacity-60" style={{ animationDuration: '3s' }} />
          <div className="absolute w-[120%] h-[120%] rounded-[38px] border border-rose-200/20 animate-pulse opacity-40" />
        </div>
      )}

      {/* Main Hub Body */}
      <div
        className={`relative w-full h-full rounded-[26px] p-4 flex flex-col items-center justify-center text-center transition-all duration-300 ${
          isDragOver
            ? 'bg-pink-50/95 border-2 border-dashed border-pink-400/80 shadow-[0_20px_50px_rgba(244,114,182,0.22)]'
            : activeMemory
            ? 'bg-white/95 backdrop-blur-xl border border-pink-200/70 shadow-[0_20px_45px_-10px_rgba(0,0,0,0.07),0_0_0_1px_rgba(255,255,255,0.8)_inset]'
            : 'bg-white/95 backdrop-blur-md border border-neutral-100/90 shadow-[0_12px_35px_-8px_rgba(0,0,0,0.05),0_0_0_1px_rgba(0,0,0,0.02)] hover:shadow-[0_18px_45px_-10px_rgba(0,0,0,0.08)]'
        }`}
      >
        {activeMemory ? (
          /* Active Playing Memory in Spotlight */
          <div className="w-full h-full flex flex-col items-center justify-between py-0.5">
            {/* Top Bar with Eject */}
            <div className="w-full flex items-center justify-between px-1">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-pink-600 uppercase tracking-widest font-sans">
                <Volume2 className="w-3 h-3 animate-pulse text-rose-500" />
                now playing
              </span>
              <button
                onClick={e => {
                  e.stopPropagation();
                  onClearActiveMemory();
                }}
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                title="Eject memory"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Turntable Vinyl Disc Visualizer */}
            <div className="relative my-1">
              <div className="w-16 h-16 rounded-full overflow-hidden shadow-md ring-2 ring-pink-400/40 relative">
                <img
                  src={activeMemory.mediaUrl}
                  alt={activeMemory.caption}
                  className="w-full h-full object-cover"
                />
                {/* Vinyl Grooves Overlay */}
                <div
                  className="absolute inset-0 rounded-full border-2 border-black/20 pointer-events-none"
                  style={{
                    background:
                      'radial-gradient(circle, transparent 35%, rgba(0,0,0,0.2) 36%, transparent 42%, rgba(0,0,0,0.15) 60%, transparent 68%, rgba(0,0,0,0.25) 85%)',
                  }}
                />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-neutral-900 text-white p-1 rounded-full shadow-sm">
                <Disc3 className="w-3.5 h-3.5 animate-spin text-pink-300" style={{ animationDuration: '3.5s' }} />
              </div>
            </div>

            {/* Caption */}
            <div className="px-2">
              <p className="text-[12px] font-medium text-neutral-800 lowercase tracking-tight">
                {activeMemory.caption}
              </p>
              {activeMemory.date && (
                <p className="text-[10px] text-neutral-400 font-light mt-0.5">
                  {activeMemory.date}
                </p>
              )}
            </div>

            {/* Luxury Rose-Gold Equalizer Bars */}
            <div className="flex items-end justify-center gap-1 h-5 w-full px-4 pt-1">
              {visualizerBars.map((h, i) => (
                <span
                  key={i}
                  className="w-1 bg-gradient-to-t from-pink-500 via-rose-400 to-amber-200 rounded-full transition-all duration-75"
                  style={{ height: `${Math.min(h, 20)}px` }}
                />
              ))}
            </div>
          </div>
        ) : (
          /* Pristine Floating Card (Exact Match to Reference Screenshot) */
          <div className="flex flex-col items-center justify-center pointer-events-none px-2 py-4">
            {isDragOver ? (
              <div className="flex flex-col items-center">
                <Sparkles className="w-5 h-5 text-pink-500 animate-bounce mb-1.5" />
                <p className="text-[13px] font-medium text-pink-600 lowercase tracking-tight">
                  release to listen
                </p>
              </div>
            ) : (
              <>
                <p className="text-[13.5px] text-neutral-400/95 font-normal tracking-[-0.01em] leading-relaxed lowercase font-sans">
                  drop a memory here
                </p>
                <p className="text-[13.5px] text-neutral-400/95 font-normal tracking-[-0.01em] leading-relaxed lowercase font-sans">
                  see what it sounds like
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
