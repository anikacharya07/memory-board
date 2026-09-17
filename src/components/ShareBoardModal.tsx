import React, { useState, useEffect } from 'react';
import type { MemoryNode, BoardMetadata } from '../types';
import { createShortShareLink, exportBoardToFile, importBoardFromFile, generateQrCode } from '../utils/shareUtils';
import { X, Copy, Check, QrCode, Download, Upload, Share2, Heart, MessageCircle, AlertCircle, KeyRound, Loader2, Sparkles } from 'lucide-react';

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
  onLoadBoardFromInput,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeTab, setActiveTab] = useState<'link' | 'qr' | 'open' | 'file'>('link');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [recipient, setRecipient] = useState(metadata.recipientName || '');
  const [sender, setSender] = useState(metadata.senderName || '');
  const [giftMessage, setGiftMessage] = useState(metadata.giftMessage || '');
  const [shortUrl, setShortUrl] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [isGeneratingShort, setIsGeneratingShort] = useState(false);
  const [shareUrlInfo, setShareUrlInfo] = useState({ url: '', charLength: 0, isLarge: false });

  // Open Board Tab state
  const [codeOrUrlInput, setCodeOrUrlInput] = useState('');
  const [isOpeningBoard, setIsOpeningBoard] = useState(false);
  const [openBoardStatus, setOpenBoardStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Update and generate short link when metadata or nodes change
  useEffect(() => {
    if (!isOpen) return;

    const updatedMeta: BoardMetadata = {
      ...metadata,
      recipientName: recipient.trim() || undefined,
      senderName: sender.trim() || undefined,
      giftMessage: giftMessage.trim() || undefined,
    };

    setIsGeneratingShort(true);
    createShortShareLink(nodes, updatedMeta)
      .then(res => {
        setShortUrl(res.shortUrl);
        setShortCode(res.code);
        setShareUrlInfo({
          url: res.shortUrl,
          charLength: res.shortUrl.length,
          isLarge: res.standaloneUrl.length > 2500,
        });
        setIsGeneratingShort(false);

        if (res.shortUrl.length <= 2200) {
          generateQrCode(res.shortUrl)
            .then(qr => setQrDataUrl(qr))
            .catch(() => setQrDataUrl(''));
        } else {
          setQrDataUrl('');
        }
      })
      .catch(() => {
        setIsGeneratingShort(false);
      });
  }, [isOpen, nodes, recipient, sender, giftMessage]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrlInfo.url);
      } else {
        throw new Error('Clipboard API unavailable');
      }
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
      try {
        const input = document.getElementById('share-link-input') as HTMLInputElement;
        if (input) {
          input.select();
          input.setSelectionRange(0, 99999);
          document.execCommand('copy');
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
        }
      } catch (err) {
        console.warn('Fallback copy failed:', err);
      }
    }
  };

  const handleWhatsAppShare = () => {
    try {
      const shareUrl = shareUrlInfo.url;
      // If URL is too long for WhatsApp query string, send link directly
      const msg = `I made something special for you ❤️ View your memory board here:\n${shareUrl}`;
      const text = encodeURIComponent(msg);
      window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    } catch (e) {
      console.warn('WhatsApp share error:', e);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: metadata.title || 'the board — memories, on a string',
          text: giftMessage || 'A constellation of our memories on a string ❤️',
          url: shareUrlInfo.url,
        });
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.warn('Native share failed:', err);
        }
      }
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
      <div className="relative w-full max-w-lg bg-white rounded-[24px] sm:rounded-[28px] shadow-2xl border border-neutral-100 p-4 sm:p-6 md:p-8 overflow-hidden max-h-[90dvh] overflow-y-auto">
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

        {/* Personalized Gift Message (Optional) */}
        <div className="mt-3 sm:mt-4 p-3 sm:p-4 rounded-2xl bg-pink-50/50 border border-pink-100/70 space-y-2.5 sm:space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-medium text-pink-900 lowercase flex items-center gap-1">
              <span>personalize greeting</span>
              <span className="text-[9.5px] sm:text-[10px] text-pink-500 font-normal">(on open)</span>
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
            short link
          </button>
          <button
            onClick={() => setActiveTab('open')}
            className={`flex-1 py-1.5 rounded-lg font-medium transition-all flex items-center justify-center gap-1 ${
              activeTab === 'open'
                ? 'bg-white text-neutral-800 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>open board</span>
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
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-neutral-700 lowercase">
                  short shareable web link:
                </label>
                {isGeneratingShort && (
                  <span className="text-[10.5px] text-pink-600 flex items-center gap-1 font-light">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>creating short link...</span>
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  id="share-link-input"
                  type="text"
                  readOnly
                  value={shortUrl || shareUrlInfo.url}
                  className="flex-1 px-3.5 py-2 text-xs font-mono rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-700 select-all focus:outline-none focus:bg-white focus:ring-1 focus:ring-pink-400 truncate"
                />
                <button
                  onClick={handleCopy}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all shrink-0 ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-neutral-900 hover:bg-neutral-800 text-white shadow-sm'
                  }`}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'copied!' : 'copy'}</span>
                </button>
              </div>

              {/* 5-Letter Passcode Card */}
              {shortCode && (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-pink-50 to-rose-50/70 border border-pink-200/80 shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-white shadow-xs text-pink-600">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] tracking-wider uppercase font-semibold text-pink-600/90 block">
                        gift passcode
                      </span>
                      <span className="font-mono text-base font-bold text-neutral-800 tracking-widest select-all">
                        {shortCode}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(shortCode);
                        setCopiedCode(true);
                        setTimeout(() => setCopiedCode(false), 2000);
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl border border-pink-200 bg-white hover:bg-pink-50 text-[11px] font-medium text-pink-700 transition-colors shadow-xs active:scale-95"
                  >
                    {copiedCode ? 'copied code!' : 'copy code'}
                  </button>
                </div>
              )}

              {shareUrlInfo.isLarge && (
                <div className="flex items-start gap-1.5 p-2.5 rounded-xl bg-amber-50 text-amber-800 text-[11px]">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <span>
                    Note: For very large media collections, downloading the .memoryboard file in the "Backup File" tab is also recommended!
                  </span>
                </div>
              )}

              {/* Quick Share Buttons */}
              <div className="pt-1 flex items-center gap-2">
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

          {/* Open Board by Passcode or Link */}
          {activeTab === 'open' && (
            <div className="space-y-3 p-1">
              <div>
                <label className="block text-xs font-medium text-neutral-700 lowercase mb-1">
                  enter 5-letter passcode or paste board link:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. b55hG or paste full link..."
                    value={codeOrUrlInput}
                    onChange={e => {
                      setCodeOrUrlInput(e.target.value);
                      setOpenBoardStatus('idle');
                    }}
                    className="flex-1 px-3.5 py-2 text-xs font-mono rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-pink-400"
                  />
                  <button
                    onClick={async () => {
                      if (!codeOrUrlInput.trim() || !onLoadBoardFromInput) return;
                      setIsOpeningBoard(true);
                      setOpenBoardStatus('idle');
                      const ok = await onLoadBoardFromInput(codeOrUrlInput);
                      setIsOpeningBoard(false);
                      if (ok) {
                        setOpenBoardStatus('success');
                        onClose();
                      } else {
                        setOpenBoardStatus('error');
                      }
                    }}
                    disabled={!codeOrUrlInput.trim() || isOpeningBoard}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-neutral-900 hover:bg-neutral-800 text-white shadow-sm disabled:opacity-50 transition-all active:scale-95 shrink-0"
                  >
                    {isOpeningBoard ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-pink-300" />
                    )}
                    <span>open board</span>
                  </button>
                </div>

                {openBoardStatus === 'error' && (
                  <p className="text-xs text-rose-500 mt-2 font-light lowercase">
                    could not find or open a board with that code. please verify the passcode or link.
                  </p>
                )}
                {openBoardStatus === 'success' && (
                  <p className="text-xs text-emerald-600 mt-2 font-light lowercase">
                    memory board opened successfully!
                  </p>
                )}
              </div>

              <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200/80 text-[11.5px] text-neutral-600 leading-relaxed">
                <p className="font-medium text-neutral-800 lowercase mb-0.5">tip:</p>
                <p className="font-light lowercase">
                  you can type a 5-letter gift code (like <code className="px-1.5 py-0.5 rounded bg-white border border-neutral-200 font-mono text-pink-600 font-semibold">b55hG</code>) or paste any shared memory board link to view it instantly!
                </p>
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
                    {isGeneratingShort ? 'creating qr...' : 'generating qr...'}
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
