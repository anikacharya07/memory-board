import React from 'react';
import type { BoardMetadata } from '../types';
import { Heart, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface GiftWelcomeOverlayProps {
  metadata: BoardMetadata;
  isOpen: boolean;
  onOpenBoard: () => void;
}

export const GiftWelcomeOverlay: React.FC<GiftWelcomeOverlayProps> = ({
  metadata,
  isOpen,
  onOpenBoard,
}) => {
  if (!isOpen) return null;

  const handleOpen = () => {
    // Shower of romantic confetti
    confetti({
      particleCount: 70,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#f472b6', '#fb7185', '#f43f5e', '#fda4af', '#fbcfe8'],
    });

    onOpenBoard();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#ffffff] rounded-[32px] shadow-[0_25px_60px_-15px_rgba(244,63,94,0.3)] border border-pink-100 p-8 text-center overflow-hidden">
        {/* Soft Background Rosy Glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-pink-200/40 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-rose-200/40 blur-3xl pointer-events-none" />

        {/* Floating Heart Icon */}
        <div className="relative inline-flex items-center justify-center w-14 h-14 rounded-full bg-pink-50 border border-pink-200/80 mb-4 shadow-sm">
          <Heart className="w-7 h-7 text-pink-500 fill-pink-400 animate-pulse" />
        </div>

        {/* Recipient Greeting */}
        <h2 className="text-xl md:text-2xl font-normal tracking-tight text-neutral-800 lowercase font-sans">
          {metadata.recipientName ? `for ${metadata.recipientName}` : 'a memory board for you'}
        </h2>

        {/* Subtitle / Sender */}
        {metadata.senderName && (
          <p className="text-xs text-pink-600 font-medium tracking-wide uppercase mt-1">
            from {metadata.senderName}
          </p>
        )}

        {/* Gift Message */}
        {metadata.giftMessage ? (
          <div className="my-5 p-4 rounded-2xl bg-pink-50/60 border border-pink-100 text-neutral-700 text-sm leading-relaxed font-serif italic">
            "{metadata.giftMessage}"
          </div>
        ) : (
          <p className="my-5 text-xs text-neutral-500 leading-relaxed font-light lowercase">
            a constellation of our favorite memories, connected on a string. hover any card to hear its soundtrack.
          </p>
        )}

        {/* Action Button */}
        <button
          onClick={handleOpen}
          className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-full bg-neutral-900 hover:bg-neutral-800 active:scale-98 text-white text-sm font-medium shadow-md hover:shadow-lg transition-all"
        >
          <Sparkles className="w-4 h-4 text-pink-300" />
          <span>open your memory board</span>
        </button>

        <p className="text-[11px] text-neutral-400 mt-3 lowercase">
          click to unlock sound & explore memories
        </p>
      </div>
    </div>
  );
};
