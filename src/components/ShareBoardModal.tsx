import React, { useState, useEffect } from 'react';
import type { MemoryNode, BoardMetadata } from '../types';
import { generateShareableUrl, exportBoardToFile, importBoardFromFile, generateQrCode } from '../utils/shareUtils';
import { X, Copy, Check, QrCode, Download, Upload, Share2, Heart, MessageCircle, AlertCircle } from 'lucide-react';

interface ShareBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: MemoryNode[];
  metadata: BoardMetadata;
  onUpdateMetadata: (metadata: BoardMetadata) => void;
  onImportBoard: (nodes: MemoryNode[], metadata: BoardMetadata) => void;
}

export const ShareBoardModal: React.FC<ShareBoardModalProps> = ({
  isOpen,
  onClose,
  nodes,
  metadata,
  onUpdateMetadata,
  onImportBoard,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'link' | 'qr' | 'file'>('link');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [recipient, setRecipient] = useState(metadata.recipientName || '');
  const [sender, setSender] = useState(metadata.senderName || '');
  const [giftMessage, setGiftMessage] = useState(metadata.giftMessage || '');
  const [shareUrlInfo, setShareUrlInfo] = useState({ url: '', charLength: 0, isLarge: false });

  // Update share link when metadata or nodes change
  useEffect(() => {
    if (!isOpen) return;

    const updatedMeta: BoardMetadata = {
      ...metadata,
      recipientName: recipient.trim() || undefined,
      senderName: sender.trim() || undefined,
      giftMessage: giftMessage.trim() || undefined,
    };

    const info = generateShareableUrl(nodes, updatedMeta);
    setShareUrlInfo(info);

    generateQrCode(info.url).then(qr => {
      setQrDataUrl(qr);
    });
  }, [isOpen, nodes, recipient, sender, giftMessage]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrlInfo.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      onUpdateMetadata({
        ...metadata,
        recipientName: recipient.trim() || undefined,
        senderName: sender.trim() || undefined,
        giftMessage: giftMessage.trim() || undefined,
      });
    } catch {
      // Fallback if clipboard API fails
      const input = document.getElementById('share-link-input') as HTMLInputElement;
      if (input) {
        input.select();
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    }
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `I made something special for you ❤️ View your memory board here: ${shareUrlInfo.url}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: metadata.title || 'the board — memories, on a string',
          text: giftMessage || 'A constellation of our memories on a string ❤️',
          url: shareUrlInfo.url,
        });
      } catch {}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white rounded-[28px] shadow-2xl border border-neutral-100 p-6 md:p-8 overflow-hidden max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
          <div>
            <div className="flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-pink-500 fill-pink-400" />
              <h3 className="text-base font-medium tracking-tight text-neutral-800 lowercase">
                gift & share this board
              </h3>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5 lowercase">
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

        {/* Personalized Gift Message (Optional) */}
        <div className="mt-4 p-4 rounded-2xl bg-pink-50/50 border border-pink-100/70 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-pink-900 lowercase flex items-center gap-1">
              <span>personalize greeting</span>
              <span className="text-[10px] text-pink-500 font-normal">(appears when opened)</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] text-neutral-500 mb-1 lowercase">to (her name):</label>
              <input
                type="text"
                placeholder="e.g. Sophia ❤️"
                value={recipient}
                onChange={e => setRecipient(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-pink-200/80 bg-white/90 focus:bg-white focus:outline-none focus:ring-1 focus:ring-pink-400"
              />
            </div>
            <div>
              <label className="block text-[11px] text-neutral-500 mb-1 lowercase">from (your name):</label>
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

        {/* Tab Navigation */}
        <div className="mt-4 flex rounded-xl bg-neutral-100 p-1 text-xs">
          <button
            onClick={() => setActiveTab('link')}
            className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'link'
                ? 'bg-white text-neutral-800 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            shareable link
          </button>
          <button
            onClick={() => setActiveTab('qr')}
            className={`flex-1 py-1.5 rounded-lg font-medium transition-all flex items-center justify-center gap-1 ${
              activeTab === 'qr'
                ? 'bg-white text-neutral-800 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>qr code</span>
          </button>
          <button
            onClick={() => setActiveTab('file')}
            className={`flex-1 py-1.5 rounded-lg font-medium transition-all flex items-center justify-center gap-1 ${
              activeTab === 'file'
                ? 'bg-white text-neutral-800 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>backup file</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-4">
          {activeTab === 'link' && (
            <div className="space-y-3">
              <label className="block text-xs font-medium text-neutral-600 lowercase">
                instant web link:
              </label>

              <div className="flex gap-2">
                <input
                  id="share-link-input"
                  type="text"
                  readOnly
                  value={shareUrlInfo.url}
                  className="flex-1 px-3.5 py-2 text-xs font-mono rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-600 select-all focus:outline-none focus:bg-white focus:ring-1 focus:ring-pink-400 truncate"
                />
                <button
                  onClick={handleCopy}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-neutral-900 hover:bg-neutral-800 text-white shadow-sm'
                  }`}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'copied!' : 'copy'}</span>
                </button>
              </div>

              {shareUrlInfo.isLarge && (
                <div className="flex items-start gap-1.5 p-2.5 rounded-xl bg-amber-50 text-amber-800 text-[11px]">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <span>
                    Note: Your board contains uploaded media. For very large files, downloading the .memoryboard file in the "Backup File" tab is also recommended!
                  </span>
                </div>
              )}

              {/* Quick Share Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  onClick={handleWhatsAppShare}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>share via whatsapp</span>
                </button>

                {'share' in navigator && (
                  <button
                    onClick={handleNativeShare}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 text-xs transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>share...</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'qr' && (
            <div className="flex flex-col items-center justify-center p-3 text-center space-y-3">
              <div className="p-3 bg-white rounded-2xl shadow-md border border-neutral-100">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR Code" className="w-48 h-48 rounded-lg" />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-xs text-neutral-400">
                    generating qr...
                  </div>
                )}
              </div>
              <p className="text-xs text-neutral-500 lowercase max-w-xs">
                she can scan this with her phone camera to open her memory board instantly!
              </p>
            </div>
          )}

          {activeTab === 'file' && (
            <div className="space-y-3 p-1">
              <div className="flex items-center justify-between p-3.5 rounded-2xl border border-neutral-200 bg-neutral-50/60">
                <div>
                  <p className="text-xs font-medium text-neutral-800 lowercase">export board file</p>
                  <p className="text-[11px] text-neutral-400 lowercase">save a full offline copy (.memoryboard)</p>
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
