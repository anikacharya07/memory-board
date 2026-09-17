import React, { useState, useEffect } from 'react';
import type { MemoryNode, BoardMetadata } from '../types';
import {
  createShortShareLink,
  exportBoardToFile,
  importBoardFromFile,
  generateQrCode,
  exportStandaloneGiftHtml,
  fetchNetworkInfo,
  type NetworkInfo,
} from '../utils/shareUtils';
import {
  X,
  Copy,
  Check,
  QrCode,
  Download,
  Upload,
  Share2,
  Heart,
  MessageCircle,
  KeyRound,
  Loader2,
  Sparkles,
  Smartphone,
  Wifi,
  Globe,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
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
  onLoadBoardFromInput,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeTab, setActiveTab] = useState<'phone' | 'gift_html' | 'open' | 'file'>('phone');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [recipient, setRecipient] = useState(metadata.recipientName || '');
  const [sender, setSender] = useState(metadata.senderName || '');
  const [giftMessage, setGiftMessage] = useState(metadata.giftMessage || '');
  const [shortUrl, setShortUrl] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [isGeneratingShort, setIsGeneratingShort] = useState(false);
  const [shareUrlInfo, setShareUrlInfo] = useState({ url: '', charLength: 0, isLarge: false });

  // Network and Custom Host state
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [customHost, setCustomHost] = useState('');
  const [showCustomHost, setShowCustomHost] = useState(false);

  // Standalone HTML export state
  const [isExportingHtml, setIsExportingHtml] = useState(false);
  const [exportedHtmlSuccess, setExportedHtmlSuccess] = useState(false);

  // Open Board Tab state
  const [codeOrUrlInput, setCodeOrUrlInput] = useState('');
  const [isOpeningBoard, setIsOpeningBoard] = useState(false);
  const [openBoardStatus, setOpenBoardStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Fetch local network info on modal open
  useEffect(() => {
    if (!isOpen) return;
    fetchNetworkInfo().then(info => {
      if (info) setNetworkInfo(info);
    });
  }, [isOpen]);

  // Update and generate link whenever metadata, customHost, or network info changes
  useEffect(() => {
    if (!isOpen) return;

    const updatedMeta: BoardMetadata = {
      ...metadata,
      recipientName: recipient.trim() || undefined,
      senderName: sender.trim() || undefined,
      giftMessage: giftMessage.trim() || undefined,
    };

    const effectiveBaseUrl = customHost.trim() || networkInfo?.phoneUrl || undefined;

    setIsGeneratingShort(true);
    createShortShareLink(nodes, updatedMeta, effectiveBaseUrl)
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
  }, [isOpen, nodes, recipient, sender, giftMessage, customHost, networkInfo]);

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
      const toWhom = recipient.trim() ? ` for ${recipient.trim()}` : '';
      const msg = `I made something special${toWhom} ❤️ View your memory board here:\n${shareUrl}`;
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

  const handleExportGiftHtml = async () => {
    setIsExportingHtml(true);
    setExportedHtmlSuccess(false);
    try {
      const ok = await exportStandaloneGiftHtml(nodes, {
        ...metadata,
        recipientName: recipient.trim() || undefined,
        senderName: sender.trim() || undefined,
        giftMessage: giftMessage.trim() || undefined,
      });
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

        {/* Tab Navigation */}
        <div className="mt-4 grid grid-cols-4 rounded-xl bg-neutral-100 p-1 text-xs gap-1">
          <button
            onClick={() => setActiveTab('phone')}
            className={`py-1.5 rounded-lg font-medium transition-all flex items-center justify-center gap-1 ${
              activeTab === 'phone'
                ? 'bg-white text-neutral-800 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-pink-500" />
            <span className="truncate">phone & wi-fi</span>
          </button>
          <button
            onClick={() => setActiveTab('gift_html')}
            className={`py-1.5 rounded-lg font-medium transition-all flex items-center justify-center gap-1 ${
              activeTab === 'gift_html'
                ? 'bg-white text-pink-700 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-pink-500" />
            <span className="truncate">send gift (.html)</span>
          </button>
          <button
            onClick={() => setActiveTab('open')}
            className={`py-1.5 rounded-lg font-medium transition-all flex items-center justify-center gap-1 ${
              activeTab === 'open'
                ? 'bg-white text-neutral-800 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span className="truncate">open board</span>
          </button>
          <button
            onClick={() => setActiveTab('file')}
            className={`py-1.5 rounded-lg font-medium transition-all flex items-center justify-center gap-1 ${
              activeTab === 'file'
                ? 'bg-white text-neutral-800 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span className="truncate">backup</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-4">
          {/* TAB 1: PHONE & WI-FI LINK */}
          {activeTab === 'phone' && (
            <div className="space-y-3.5">
              {/* Network status notice */}
              <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50/70 border border-emerald-200/80 text-xs text-emerald-900 flex items-start gap-2.5 shadow-xs">
                <div className="mt-0.5 p-1 rounded-full bg-emerald-500 text-white shrink-0 animate-pulse">
                  <Wifi className="w-3 h-3" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-emerald-950 flex items-center gap-1.5">
                    <span>phone & tablet ready on wi-fi</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-mono">
                      {networkInfo?.localIp ? `${networkInfo.localIp}:${networkInfo.port}` : 'live'}
                    </span>
                  </p>
                  <p className="text-[11px] text-emerald-800/90 font-light mt-0.5 leading-relaxed">
                    Scan with her phone camera or send this link. Both devices must be on the same Wi-Fi.
                  </p>
                </div>
              </div>

              {/* Shareable Link Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-neutral-700 lowercase">
                    phone-accessible link:
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
              </div>

              {/* QR Code and Passcode Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center pt-1">
                {/* QR Code */}
                <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-neutral-50 border border-neutral-200/80 text-center space-y-2">
                  <div className="p-2 bg-white rounded-xl shadow-xs border border-neutral-100">
                    {qrDataUrl ? (
                      <img src={qrDataUrl} alt="QR Code" className="w-32 h-32 rounded-md" />
                    ) : (
                      <div className="w-32 h-32 flex items-center justify-center text-xs text-neutral-400">
                        {isGeneratingShort ? 'generating...' : 'qr ready'}
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] text-neutral-600 font-medium lowercase flex items-center gap-1">
                    <QrCode className="w-3 h-3 text-pink-500" />
                    <span>scan with phone camera</span>
                  </span>
                </div>

                {/* 5-Letter Passcode Card */}
                <div className="flex flex-col justify-between p-3.5 rounded-2xl bg-gradient-to-br from-pink-50/80 to-rose-50/60 border border-pink-200/70 h-full min-h-[160px] space-y-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="p-1.5 rounded-lg bg-white shadow-xs text-pink-600">
                        <KeyRound className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] tracking-wider uppercase font-semibold text-pink-600/90">
                        5-letter gift code
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-600 font-light leading-snug">
                      If she opens this app on her device, she can simply type this code in "Open Board":
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-white/90 border border-pink-100">
                    <span className="font-mono text-lg font-bold text-neutral-800 tracking-widest px-1 select-all">
                      {shortCode || '...'}
                    </span>
                    <button
                      onClick={() => {
                        if (shortCode && navigator.clipboard) {
                          navigator.clipboard.writeText(shortCode);
                          setCopiedCode(true);
                          setTimeout(() => setCopiedCode(false), 2000);
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg border border-pink-200 bg-pink-50/60 hover:bg-pink-100 text-[10.5px] font-medium text-pink-700 transition-colors"
                    >
                      {copiedCode ? 'copied!' : 'copy code'}
                    </button>
                  </div>

                  <div className="flex items-center gap-2 pt-0.5">
                    <button
                      onClick={handleWhatsAppShare}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-medium transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>whatsapp</span>
                    </button>
                    {'share' in navigator && (
                      <button
                        onClick={handleNativeShare}
                        className="p-1.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600 transition-colors"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Optional Custom Domain / Public Host Toggle */}
              <div className="pt-1 border-t border-neutral-100">
                <button
                  onClick={() => setShowCustomHost(!showCustomHost)}
                  className="flex items-center justify-between w-full text-[11px] text-neutral-500 hover:text-neutral-700 py-1 transition-colors"
                >
                  <span className="flex items-center gap-1">
                    <Globe className="w-3 h-3 text-neutral-400" />
                    <span>using a public tunnel or custom domain? (optional)</span>
                  </span>
                  {showCustomHost ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                {showCustomHost && (
                  <div className="mt-2 p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1.5">
                    <label className="block text-[10.5px] text-neutral-600">
                      custom base url (e.g. <code>https://my-subdomain.loca.lt</code> or public host):
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. https://our-memory-board.surge.sh"
                      value={customHost}
                      onChange={e => setCustomHost(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-neutral-200 bg-white focus:outline-none focus:ring-1 focus:ring-pink-400"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: STANDALONE GIFT WEBPAGE (.HTML) */}
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
                        download {recipient ? `${recipient}'s` : 'standalone'} gift webpage (.html)
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

          {/* TAB 3: OPEN BOARD BY CODE OR LINK */}
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
                <p className="font-medium text-neutral-800 lowercase mb-0.5">how it works:</p>
                <p className="font-light lowercase">
                  If both of you have the memory board web app open, you don't even need to send a long link. Just tell her the 5-letter code (like <code className="px-1.5 py-0.5 rounded bg-white border border-neutral-200 font-mono text-pink-600 font-semibold">{shortCode || 'b55hG'}</code>) and she can load it right here!
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: BACKUP FILE */}
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
