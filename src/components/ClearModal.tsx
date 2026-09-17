import React from 'react';
import type { MemoryNode } from '../types';
import { Trash2, Disc3, X } from 'lucide-react';

interface ClearModalProps {
  isOpen: boolean;
  onClose: () => void;
  hubActiveMemory: MemoryNode | null;
  onClearHub: () => void;
  onClearEntireBoard: () => void;
}

export const ClearModal: React.FC<ClearModalProps> = ({
  isOpen,
  onClose,
  hubActiveMemory,
  onClearHub,
  onClearEntireBoard,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-sm sm:max-w-md bg-white rounded-[26px] sm:rounded-[30px] shadow-2xl border border-neutral-100 p-5 sm:p-7 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-full bg-rose-50 border border-rose-100">
              <Trash2 className="w-4 h-4 text-rose-500" />
            </div>
            <h3 className="text-sm sm:text-base font-medium tracking-tight text-neutral-800 lowercase">
              {hubActiveMemory ? 'clear options' : 'clear board?'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 space-y-3">
          {hubActiveMemory ? (
            /* Options when a card is in the central hub */
            <>
              {/* Option 1: Clear Central Box */}
              <button
                onClick={() => {
                  onClearHub();
                  onClose();
                }}
                className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-pink-200/90 bg-pink-50/50 hover:bg-pink-50 text-left transition-all group active:scale-98"
              >
                <div className="p-2 rounded-xl bg-white shadow-sm text-pink-600 group-hover:scale-105 transition-transform">
                  <Disc3 className="w-5 h-5 animate-spin" style={{ animationDuration: '4s' }} />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-pink-950 lowercase">
                    clear central box
                  </p>
                  <p className="text-[10.5px] sm:text-[11px] text-pink-600/80 lowercase mt-0.5">
                    stop music and return "{hubActiveMemory.caption}" to the board
                  </p>
                </div>
              </button>

              {/* Option 2: Clear Entire Board */}
              <button
                onClick={() => {
                  onClearEntireBoard();
                  onClose();
                }}
                className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-neutral-200/80 bg-neutral-50/50 hover:bg-neutral-100 text-left transition-all group active:scale-98"
              >
                <div className="p-2 rounded-xl bg-white shadow-sm text-neutral-500 group-hover:scale-105 transition-transform">
                  <Trash2 className="w-5 h-5 text-neutral-600" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-neutral-800 lowercase">
                    clear entire board
                  </p>
                  <p className="text-[10.5px] sm:text-[11px] text-neutral-500 lowercase mt-0.5">
                    remove all cards (you can restore them anytime)
                  </p>
                </div>
              </button>
            </>
          ) : (
            /* Confirmation when clearing entire board */
            <div className="space-y-4 text-left">
              <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed font-light lowercase">
                are you sure you want to clear all memory cards from the board? you can reload the default constellation anytime with the "restore" button.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-neutral-500 hover:text-neutral-700 transition-colors lowercase"
                >
                  cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClearEntireBoard();
                    onClose();
                  }}
                  className="px-5 py-2 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-medium shadow-sm transition-all lowercase"
                >
                  clear all
                </button>
              </div>
            </div>
          )}
        </div>

        {hubActiveMemory && (
          <div className="mt-4 pt-2 border-t border-neutral-100 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs text-neutral-500 hover:text-neutral-700 transition-colors lowercase"
            >
              cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
