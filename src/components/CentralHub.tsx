import React, { useEffect, useRef, useState } from 'react';
import type { MemoryNode } from '../types';
import { audioEngine } from '../utils/audioEngine';
import { Sparkles } from 'lucide-react';

interface CentralHubProps {
  x: number;
  y: number;
  width: number;
  height: number;
  isDragOver: boolean;
  activeMemory: MemoryNode | null;
  onClearActiveMemory?: () => void;
  onDropMemory: (memory: MemoryNode) => void;
}

export const CentralHub: React.FC<CentralHubProps> = ({
  x,
  y,
  width,
  height,
  isDragOver,
  activeMemory,
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
          bars.push(Math.max(6, (val / 255) * 36));
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
        className={`absolute -inset-5 rounded-[40px] transition-all duration-700 pointer-events-none ${
          activeMemory
            ? 'bg-gradient-to-tr from-pink-400/25 via-rose-300/20 to-transparent blur-xl opacity-100'
            : isDragOver
            ? 'bg-pink-400/30 blur-lg opacity-100'
            : 'opacity-0'
        }`}
      />

      {/* Outer Soundwave Rings (When Memory is Docked & Playing) */}
      {activeMemory && (
        <div className="absolute -inset-8 pointer-events-none flex items-center justify-center">
          <div
            className="absolute w-[115%] h-[115%] rounded-[38px] border border-pink-300/40 animate-ping opacity-60"
            style={{ animationDuration: '3s' }}
          />
          <div className="absolute w-[130%] h-[130%] rounded-[44px] border border-rose-200/25 animate-pulse opacity-40" />
        </div>
      )}


      {/* Main Hub Body / Turntable Dock */}
      <div
        className={`relative w-full h-full rounded-[26px] p-4 flex flex-col items-center justify-center text-center transition-all duration-300 ${
          isDragOver
            ? 'bg-pink-50/95 border-2 border-dashed border-pink-400/80 shadow-[0_20px_50px_rgba(244,114,182,0.22)]'
            : activeMemory
            ? 'bg-white/95 backdrop-blur-xl border-2 border-pink-300/60 shadow-[0_20px_45px_-10px_rgba(244,114,182,0.18)]'
            : 'bg-white/95 backdrop-blur-md border border-neutral-100/90 shadow-[0_12px_35px_-8px_rgba(0,0,0,0.05),0_0_0_1px_rgba(0,0,0,0.02)] hover:shadow-[0_18px_45px_-10px_rgba(0,0,0,0.08)]'
        }`}
      >
        {activeMemory ? (
          /* Dock Pedestal State (The memory card itself sits right over this) */
          <div className="w-full h-full flex flex-col items-center justify-between py-1 pointer-events-none">
            {/* Vinyl record grooves watermark in the dock */}
            <div
              className="w-20 h-20 rounded-full border border-pink-200/40 my-auto opacity-30 pointer-events-none"
              style={{
                background:
                  'radial-gradient(circle, transparent 35%, rgba(244,63,94,0.15) 36%, transparent 42%, rgba(244,63,94,0.12) 60%, transparent 68%, rgba(244,63,94,0.18) 85%)',
              }}
            />
          </div>
        ) : (
          /* Empty Waiting Drop Zone (Matches Reference Screenshot) */
          <div className="flex flex-col items-center justify-center pointer-events-none px-2 py-4">
            {isDragOver ? (
              <div className="flex flex-col items-center">
                <Sparkles className="w-5 h-5 text-pink-500 animate-bounce mb-1.5" />
                <p className="text-[13px] font-medium text-pink-600 lowercase tracking-tight">
                  release to play song
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

      {/* Floating Bottom Equalizer Bar when a card is docked */}
      {activeMemory && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-1 pointer-events-none animate-fadeIn whitespace-nowrap">
          <div className="flex items-end justify-center gap-1 h-4">
            {visualizerBars.map((h, i) => (
              <span
                key={i}
                className="w-1 bg-gradient-to-t from-pink-500 via-rose-400 to-amber-300 rounded-full transition-all duration-75"
                style={{ height: `${Math.min(h, 16)}px` }}
              />
            ))}
          </div>
          <span className="text-[10px] text-neutral-400 font-light lowercase">
            drag card out to stop
          </span>
        </div>
      )}
    </div>
  );
};
