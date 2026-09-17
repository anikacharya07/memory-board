import React, { useState } from 'react';
import type { MemoryNode, BoardMetadata } from '../types';
import {
  exportBoardToFile,
  importBoardFromFile,
  exportStandaloneGiftHtml,
} from '../utils/shareUtils';
import {
  X,
  Download,
  Upload,
  Heart,
  Loader2,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

interface ShareBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: MemoryNode[];
  metadata: BoardMetadata;
  onUpdateMetadata: (metadata: BoardMetadata) => void;
  onImportBoard: (nodes: MemoryNode[], metadata: BoardMetadata) => void;
  onLoadBoardFromInput?: (input: string) => Promise<boolean>;
}

export const ShareBoardModal: React.FC<ShareBoardModalProps> = ({
  isOpen,
  onClose,
  nodes,
  metadata,
  onUpdateMetadata,
  onImportBoard,
}) => {
  const [activeTab, setActiveTab] = useState<'gift_html' | 'file'>('gift_html');
  const [recipient, setRecipient] = useState(metadata.recipientName || '');
  const [sender, setSender] = useState(metadata.senderName || '');
  const [giftMessage, setGiftMessage] = useState(metadata.giftMessage || '');

  // Standalone HTML export state
  const [isExportingHtml, setIsExportingHtml] = useState(false);
  const [exportedHtmlSuccess, setExportedHtmlSuccess] = useState(false);

  if (!isOpen) return null;

  const handleExportGiftHtml = async () => {
    setIsExportingHtml(true);
    setExportedHtmlSuccess(false);

    const updatedMeta: BoardMetadata = {
      ...metadata,
      recipientName: recipient.trim() || undefined,
      senderName: sender.trim() || undefined,
      giftMessage: giftMessage.trim() || undefined,
    };

    onUpdateMetadata(updatedMeta);

    try {
      const ok = await exportStandaloneGiftHtml(nodes, updatedMeta);
      if (ok) {
        setExportedHtmlSuccess(true);
        setTimeout(() => setExportedHtmlSuccess(false), 5000);
      }
    } catch (err) {
      console.warn('Export gift html error:', err);
    } finally {
      setIsExportingHtml(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await importBoardFromFile(file);
      onImportBoard(data.nodes, data.metadata);
      onClose();
    } catch {
      alert('Failed to read memory board file. Please ensure it is a valid .memoryboard or JSON file.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/40 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white rounded-[24px] sm:rounded-[28px] shadow-2xl border border-neutral-100 p-4 sm:p-6 md:p-8 overflow-hidden max-h-[92dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-neutral-100">
          <div>
            <div className="flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-pink-500 fill-pink-400" />
              <h3 className="text-sm sm:text-base font-medium tracking-tight text-neutral-800 lowercase">
                gift & share this board
              </h3>
            </div>
            <p className="text-[11px] sm:text-xs text-neutral-400 mt-0.5 lowercase">
              send your girlfriend this constellation of memories
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Personalized Gift Message */}
        <div className="mt-3 sm:mt-4 p-3 sm:p-4 rounded-2xl bg-pink-50/50 border border-pink-100/70 space-y-2.5 sm:space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-medium text-pink-900 lowercase flex items-center gap-1">
              <span>personalize greeting</span>
              <span className="text-[9.5px] sm:text-[10px] text-pink-500 font-normal">(appears when opened)</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
            <div>
              <label className="block text-[10.5px] sm:text-[11px] text-neutral-500 mb-0.5 sm:mb-1 lowercase">to (her name):</label>
              <input
                type="text"
                placeholder="e.g. Sophia ❤️"
                value={recipient}
                onChange={e => setRecipient(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-pink-200/80 bg-white/90 focus:bg-white focus:outline-none focus:ring-1 focus:ring-pink-400"
              />
            </div>
            <div>
              <label className="block text-[10.5px] sm:text-[11px] text-neutral-500 mb-0.5 sm:mb-1 lowercase">from (your name):</label>
              <input
                type="text"
                placeholder="e.g. With love, Alex"
                value={sender}
                onChange={e => setSender(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-pink-200/80 bg-white/90 focus:bg-white focus:outline-none focus:ring-1 focus:ring-pink-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-neutral-500 mb-1 lowercase">birthday / sweet message:</label>
            <input
              type="text"
              placeholder="e.g. Happy Birthday my love! Every string connects a memory of us..."
              value={giftMessage}
              onChange={e => setGiftMessage(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-pink-200/80 bg-white/90 focus:bg-white focus:outline-none focus:ring-1 focus:ring-pink-400"
            />
          </div>
        </div>

        {/* Tab Navigation (Only Send Gift and Backup) */}
        <div className="mt-4 grid grid-cols-2 rounded-xl bg-neutral-100 p-1 text-xs gap-1">
          <button
            onClick={() => setActiveTab('gift_html')}
            className={`py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'gift_html'
                ? 'bg-white text-pink-700 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-pink-500" />
            <span>send gift (.html)</span>
          </button>
          <button
            onClick={() => setActiveTab('file')}
            className={`py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'file'
                ? 'bg-white text-neutral-800 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>backup</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-4">
          {/* TAB 1: STANDALONE GIFT WEBPAGE (.HTML) */}
          {activeTab === 'gift_html' && (
            <div className="space-y-4 p-1">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-pink-500/10 via-rose-500/5 to-purple-500/10 border border-pink-200/80 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-white shadow-xs text-pink-600">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-pink-950 uppercase tracking-wider">
                      fail-proof gift file • works anywhere
                    </h4>
                    <span className="text-[11px] text-pink-700 font-light">
                      No Wi-Fi or server needed! 100% offline & mobile ready.
                    </span>
                  </div>
                </div>

                <p className="text-xs text-neutral-600 leading-relaxed font-light pt-1">
                  Download a single, self-contained <code className="px-1.5 py-0.5 rounded bg-white border border-pink-200 font-mono text-pink-700 font-medium">.html</code> webpage with all your polaroids, strings, music synthesizer, love greeting, and photos embedded inside!
                </p>
              </div>

              {/* 3 Steps */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100">
                  <span className="w-5 h-5 rounded-full bg-pink-100 text-pink-600 text-[10px] font-bold inline-flex items-center justify-center mb-1">
                    1
                  </span>
                  <p className="text-[10.5px] font-medium text-neutral-700 lowercase">download</p>
                  <p className="text-[9.5px] text-neutral-400 font-light">get .html file</p>
                </div>
                <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100">
                  <span className="w-5 h-5 rounded-full bg-pink-100 text-pink-600 text-[10px] font-bold inline-flex items-center justify-center mb-1">
                    2
                  </span>
                  <p className="text-[10.5px] font-medium text-neutral-700 lowercase">send</p>
                  <p className="text-[9.5px] text-neutral-400 font-light">via whatsapp/airdrop</p>
                </div>
                <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100">
                  <span className="w-5 h-5 rounded-full bg-pink-100 text-pink-600 text-[10px] font-bold inline-flex items-center justify-center mb-1">
                    3
                  </span>
                  <p className="text-[10.5px] font-medium text-neutral-700 lowercase">she taps</p>
                  <p className="text-[9.5px] text-neutral-400 font-light">plays on her phone!</p>
                </div>
              </div>

              {/* Export Button */}
              <div className="pt-2">
                <button
                  onClick={handleExportGiftHtml}
                  disabled={isExportingHtml}
                  className={`w-full py-3 px-4 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 ${
                    exportedHtmlSuccess
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white'
                  }`}
                >
                  {isExportingHtml ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>packaging gift webpage...</span>
                    </>
                  ) : exportedHtmlSuccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>gift webpage downloaded! ready to send ❤️</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>
                        download {recipient.trim() ? `${recipient.trim()}'s` : 'standalone'} gift webpage (.html)
                      </span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100 text-[11px] text-neutral-500 font-light text-center leading-relaxed">
                💡 Works on Safari (iPhone), Chrome (Android), Mac, and Windows. Even works offline on airplane mode!
              </div>
            </div>
          )}

          {/* TAB 2: BACKUP FILE */}
          {activeTab === 'file' && (
            <div className="space-y-3 p-1">
              <div className="flex items-center justify-between p-3.5 rounded-2xl border border-neutral-200 bg-neutral-50/60">
                <div>
                  <p className="text-xs font-medium text-neutral-800 lowercase">export board file</p>
                  <p className="text-[11px] text-neutral-400 lowercase">save a full raw copy (.memoryboard)</p>
                </div>
                <button
                  onClick={() => exportBoardToFile(nodes, { ...metadata, recipientName: recipient, senderName: sender, giftMessage })}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>download</span>
                </button>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl border border-dashed border-neutral-300 hover:border-pink-300 transition-colors">
                <div>
                  <p className="text-xs font-medium text-neutral-800 lowercase">import a board file</p>
                  <p className="text-[11px] text-neutral-400 lowercase">load a memory board from a file</p>
                </div>
                <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-medium cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5 text-neutral-500" />
                  <span>browse</span>
                  <input
                    type="file"
                    accept=".memoryboard,.json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-3 border-t border-neutral-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-800 transition-colors"
          >
            done
          </button>
        </div>
      </div>
    </div>
  );
};
