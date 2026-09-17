import LZString from 'lz-string';
import QRCode from 'qrcode';
import type { ShareableBoardData, MemoryNode, BoardMetadata } from '../types';
import { DEFAULT_MEMORIES } from '../data/defaultMemories';

export const CURRENT_BOARD_VERSION = 2;

// Lookup map of default memories for ultra-compact diffing
const defaultMemoryMap = new Map<string, MemoryNode>(
  DEFAULT_MEMORIES.map(node => [node.id, node])
);

/**
 * Sanitize and hydrate a node to guarantee all required fields exist
 */
export function sanitizeNode(raw: Partial<MemoryNode>, fallbackIndex = 0): MemoryNode {
  const def = raw.id ? defaultMemoryMap.get(raw.id) : undefined;

  return {
    id: raw.id || `mem-${Date.now()}-${fallbackIndex}`,
    caption: String(raw.caption ?? def?.caption ?? 'memory'),
    mediaType: raw.mediaType === 'video' ? 'video' : 'image',
    mediaUrl: String(raw.mediaUrl ?? def?.mediaUrl ?? ''),
    audioPreset: raw.audioPreset ?? def?.audioPreset ?? 'acoustic_guitar',
    audioUrl: raw.audioUrl ?? def?.audioUrl,
    x: Number.isFinite(Number(raw.x)) ? Number(raw.x) : (def?.x ?? 200),
    y: Number.isFinite(Number(raw.y)) ? Number(raw.y) : (def?.y ?? 200),
    rotation: Number.isFinite(Number(raw.rotation)) ? Number(raw.rotation) : (def?.rotation ?? 0),
    width: Number.isFinite(Number(raw.width)) ? Number(raw.width) : (def?.width ?? 175),
    height: Number.isFinite(Number(raw.height)) ? Number(raw.height) : (def?.height ?? 220),
    connectedTo: Array.isArray(raw.connectedTo) && raw.connectedTo.length > 0
      ? raw.connectedTo
      : (def?.connectedTo ?? ['mem-hub']),
    note: raw.note ?? def?.note,
    date: raw.date ?? def?.date,
  };
}

/**
 * Compact delta representation for shareable URLs
 */
interface CompactNode {
  i: string; // id
  x: number;
  y: number;
  r: number; // rotation
  c?: string; // caption (if different from default)
  u?: string; // mediaUrl (if different from default)
  t?: 'image' | 'video'; // mediaType
  a?: string; // audioPreset
  au?: string; // audioUrl
  w?: number; // width
  h?: number; // height
  k?: string[]; // connectedTo
  n?: string; // note
  d?: string; // date
}

interface CompactSharePayload {
  v: number;
  m: BoardMetadata;
  s: CompactNode[];
}

/**
 * Generate compressed shareable URL hash with smart compact delta encoding
 */
export interface NetworkInfo {
  localIp: string;
  port: number;
  phoneUrl: string;
}

let cachedNetworkInfo: NetworkInfo | null = null;

/**
 * Fetch local network IP from dev server or fallback to current origin
 */
export async function fetchNetworkInfo(): Promise<NetworkInfo | null> {
  if (cachedNetworkInfo) return cachedNetworkInfo;
  if (typeof window === 'undefined') return null;

  try {
    const res = await fetch('/api/network-info');
    if (res.ok) {
      const data = await res.json();
      if (data && data.localIp) {
        cachedNetworkInfo = {
          localIp: data.localIp,
          port: data.port || 5173,
          phoneUrl: `http://${data.localIp}:${data.port || 5173}${window.location.pathname}`,
        };
        return cachedNetworkInfo;
      }
    }
  } catch {}

  const hostname = window.location.hostname;
  const isLoopback = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';

  if (!isLoopback) {
    cachedNetworkInfo = {
      localIp: hostname,
      port: Number(window.location.port) || 80,
      phoneUrl: `${window.location.origin}${window.location.pathname}`,
    };
    return cachedNetworkInfo;
  }

  return null;
}

/**
 * Generate compact share payload object and standalone URL
 */
export function generateShareablePayload(
  nodes: MemoryNode[],
  metadata: BoardMetadata = {},
  baseUrlOverride?: string
): {
  url: string;
  charLength: number;
  isLarge: boolean;
  compactPayload: CompactSharePayload;
} {
  // Check if any node contains large embedded media (e.g. raw base64)
  let totalMediaChars = 0;
  nodes.forEach(n => {
    if (n.mediaUrl && n.mediaUrl.startsWith('data:')) {
      totalMediaChars += n.mediaUrl.length;
    }
  });

  const compactNodes: CompactNode[] = nodes.map(n => {
    const def = defaultMemoryMap.get(n.id);
    const item: CompactNode = {
      i: n.id,
      x: Math.round(n.x || 0),
      y: Math.round(n.y || 0),
      r: Math.round((n.rotation || 0) * 10) / 10,
    };

    if (!def || def.caption !== n.caption) item.c = n.caption;
    if (!def || def.mediaUrl !== n.mediaUrl) item.u = n.mediaUrl;
    if (!def || def.mediaType !== n.mediaType) item.t = n.mediaType;
    if (!def || def.audioPreset !== n.audioPreset) item.a = n.audioPreset;
    if (n.audioUrl && (!def || def.audioUrl !== n.audioUrl)) item.au = n.audioUrl;
    if (n.note && (!def || def.note !== n.note)) item.n = n.note;
    if (n.date && (!def || def.date !== n.date)) item.d = n.date;
    if (n.width && n.width !== 175 && (!def || def.width !== n.width)) item.w = n.width;
    if (n.height && n.height !== 220 && (!def || def.height !== n.height)) item.h = n.height;
    if (!def || JSON.stringify(def.connectedTo) !== JSON.stringify(n.connectedTo)) {
      item.k = n.connectedTo;
    }

    return item;
  });

  const compactPayload: CompactSharePayload = {
    v: CURRENT_BOARD_VERSION,
    m: metadata,
    s: compactNodes,
  };

  const jsonString = JSON.stringify(compactPayload);
  const compressed = LZString.compressToEncodedURIComponent(jsonString);
  const baseUrl = baseUrlOverride || (typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '');
  const fullUrl = `${baseUrl}#b2=${compressed}`;

  return {
    url: fullUrl,
    charLength: fullUrl.length,
    isLarge: totalMediaChars > 20000 || fullUrl.length > 2500,
    compactPayload,
  };
}

/**
 * Generate compressed standalone shareable URL hash
 */
export function generateShareableUrl(
  nodes: MemoryNode[],
  metadata: BoardMetadata = {},
  baseUrlOverride?: string
): { url: string; charLength: number; isLarge: boolean } {
  return generateShareablePayload(nodes, metadata, baseUrlOverride);
}

/**
 * Create a tiny, ultra-short share link (e.g. #b=b55hG, ~30 characters!)
 * with automatic fallback to standalone compressed hash.
 */
export async function createShortShareLink(
  nodes: MemoryNode[],
  metadata: BoardMetadata = {},
  baseUrlOverride?: string
): Promise<{
  shortUrl: string;
  code: string;
  standaloneUrl: string;
  isShortCreated: boolean;
}> {
  const { url: standaloneUrl, compactPayload } = generateShareablePayload(nodes, metadata, baseUrlOverride);
  const baseUrl = baseUrlOverride || (typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '');

  try {
    const res = await fetch('https://paste.rs', {
      method: 'POST',
      body: JSON.stringify(compactPayload),
    });

    if (res.ok) {
      const pasteUrl = (await res.text()).trim();
      const code = pasteUrl.split('/').pop()?.trim() || '';
      if (code) {
        const shortUrl = `${baseUrl}#b=${code}`;
        return {
          shortUrl,
          code,
          standaloneUrl,
          isShortCreated: true,
        };
      }
    }
  } catch (err) {
    console.warn('Could not create short link via cloud service, using standalone link:', err);
  }

  return {
    shortUrl: standaloneUrl,
    code: '',
    standaloneUrl,
    isShortCreated: false,
  };
}

/**
 * Fetch a shared board using its short code (e.g. b55hG)
 */
export async function fetchBoardByCode(code: string): Promise<ShareableBoardData | null> {
  const cleanCode = code.trim().replace(/^#?(?:b=|code=)?/, '');
  if (!cleanCode) return null;

  try {
    const res = await fetch(`https://paste.rs/${cleanCode}`);
    if (!res.ok) return null;
    const parsed = await res.json();

    if (parsed && parsed.v === 2 && Array.isArray(parsed.s)) {
      const restoredNodes: MemoryNode[] = parsed.s.map((item: CompactNode, idx: number) => {
        const def = defaultMemoryMap.get(item.i);
        return sanitizeNode({
          id: item.i,
          caption: item.c ?? def?.caption ?? 'memory',
          mediaType: item.t ?? def?.mediaType ?? 'image',
          mediaUrl: item.u ?? def?.mediaUrl ?? '',
          audioPreset: (item.a as any) ?? def?.audioPreset ?? 'acoustic_guitar',
          audioUrl: item.au ?? def?.audioUrl,
          x: item.x ?? def?.x ?? 200,
          y: item.y ?? def?.y ?? 200,
          rotation: item.r ?? def?.rotation ?? 0,
          width: item.w ?? def?.width ?? 175,
          height: item.h ?? def?.height ?? 220,
          connectedTo: item.k ?? def?.connectedTo ?? ['mem-hub'],
          note: item.n ?? def?.note,
          date: item.d ?? def?.date,
        }, idx);
      });

      return {
        version: CURRENT_BOARD_VERSION,
        metadata: parsed.m || {},
        nodes: restoredNodes,
      };
    }

    if (parsed && Array.isArray(parsed.nodes)) {
      return {
        version: parsed.version || 1,
        metadata: parsed.metadata || {},
        nodes: parsed.nodes.map((n: any, idx: number) => sanitizeNode(n, idx)),
      };
    }
  } catch (err) {
    console.warn('Failed to fetch board by code:', err);
  }

  return null;
}

/**
 * Decompress a compact v2 hash string
 */
function parseCompactHash(rawEncoded: string): ShareableBoardData | null {
  try {
    let decompressed = LZString.decompressFromEncodedURIComponent(rawEncoded);
    if (!decompressed) {
      try {
        decompressed = LZString.decompressFromEncodedURIComponent(decodeURIComponent(rawEncoded));
      } catch {}
    }
    if (!decompressed) return null;

    const parsed = JSON.parse(decompressed);
    if (parsed && Array.isArray(parsed.s)) {
      const restoredNodes: MemoryNode[] = parsed.s.map((item: CompactNode, idx: number) => {
        const def = defaultMemoryMap.get(item.i);
        return sanitizeNode({
          id: item.i,
          caption: item.c ?? def?.caption ?? 'memory',
          mediaType: item.t ?? def?.mediaType ?? 'image',
          mediaUrl: item.u ?? def?.mediaUrl ?? '',
          audioPreset: (item.a as any) ?? def?.audioPreset ?? 'acoustic_guitar',
          audioUrl: item.au ?? def?.audioUrl,
          x: item.x ?? def?.x ?? 200,
          y: item.y ?? def?.y ?? 200,
          rotation: item.r ?? def?.rotation ?? 0,
          width: item.w ?? def?.width ?? 175,
          height: item.h ?? def?.height ?? 220,
          connectedTo: item.k ?? def?.connectedTo ?? ['mem-hub'],
          note: item.n ?? def?.note,
          date: item.d ?? def?.date,
        }, idx);
      });

      return {
        version: CURRENT_BOARD_VERSION,
        metadata: parsed.m || {},
        nodes: restoredNodes,
      };
    }
  } catch {}
  return null;
}

/**
 * Decompress a legacy v1 hash string
 */
function parseLegacyHash(rawEncoded: string): ShareableBoardData | null {
  try {
    let decompressed = LZString.decompressFromEncodedURIComponent(rawEncoded);
    if (!decompressed) {
      try {
        decompressed = LZString.decompressFromEncodedURIComponent(decodeURIComponent(rawEncoded));
      } catch {}
    }
    if (!decompressed) return null;

    const parsed = JSON.parse(decompressed);
    if (parsed && Array.isArray(parsed.nodes)) {
      return {
        version: 1,
        metadata: parsed.metadata || {},
        nodes: parsed.nodes.map((n: any, idx: number) => sanitizeNode(n, idx)),
      };
    }
  } catch {}
  return null;
}

/**
 * Universally parse and load board from any input string
 * (short code, full link, hash, or cloud URL)
 */
export async function loadBoardFromInput(input: string): Promise<ShareableBoardData | null> {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // 1. Direct short code (e.g. b55hG)
  if (/^[a-zA-Z0-9_-]{3,12}$/.test(trimmed)) {
    const data = await fetchBoardByCode(trimmed);
    if (data) return data;
  }

  // 2. paste.rs URL
  if (trimmed.includes('paste.rs/')) {
    const code = trimmed.split('paste.rs/')[1]?.split(/[?#/&]/)[0];
    if (code) {
      const data = await fetchBoardByCode(code);
      if (data) return data;
    }
  }

  // 3. Short code in URL query or hash (#b=... or ?b=... or ?code=...)
  const codeMatch = trimmed.match(/[?#&](?:b|code)=([a-zA-Z0-9_-]+)/);
  if (codeMatch && codeMatch[1]) {
    const data = await fetchBoardByCode(codeMatch[1]);
    if (data) return data;
  }

  // 4. Compact v2 hash in URL (#b2=... or ?b2=...)
  const b2Match = trimmed.match(/[?#&]b2=([^&]+)/);
  if (b2Match && b2Match[1]) {
    const data = parseCompactHash(b2Match[1]);
    if (data) return data;
  }

  // 5. Legacy v1 hash in URL (#board=... or ?board=...)
  const boardMatch = trimmed.match(/[?#&]board=([^&]+)/);
  if (boardMatch && boardMatch[1]) {
    const data = parseLegacyHash(boardMatch[1]);
    if (data) return data;
  }

  // 6. Direct hash string without prefix
  return parseCompactHash(trimmed) || parseLegacyHash(trimmed);
}

/**
 * Parse board data from current browser URL hash or query params
 */
export async function parseBoardFromUrl(): Promise<ShareableBoardData | null> {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash || '';
  const search = window.location.search || '';

  if (!hash && !search) return null;

  // Check full URL string
  const fullUrl = `${hash}&${search}`;
  return await loadBoardFromInput(fullUrl);
}

/**
 * Export board as downloadable .memoryboard JSON file (standalone full offline format)
 */
export function exportBoardToFile(nodes: MemoryNode[], metadata: BoardMetadata = {}) {
  const sanitized = nodes.map((node, idx) => sanitizeNode(node, idx));
  const payload: ShareableBoardData = {
    version: CURRENT_BOARD_VERSION,
    metadata,
    nodes: sanitized,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = (metadata.recipientName || metadata.title || 'memory-board')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-');

  a.href = url;
  a.download = `${safeName || 'memory-board'}.memoryboard`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export board as a self-contained, standalone single-file HTML gift webpage (.html)
 * that can be sent via WhatsApp, AirDrop, or email and opened on ANY device offline or online!
 */
export async function exportStandaloneGiftHtml(
  nodes: MemoryNode[],
  metadata: BoardMetadata = {}
): Promise<boolean> {
  const sanitized = nodes.map((node, idx) => sanitizeNode(node, idx));
  const giftPayload: ShareableBoardData = {
    version: CURRENT_BOARD_VERSION,
    metadata,
    nodes: sanitized,
  };
  const jsonString = JSON.stringify(giftPayload);

  let templateHtml = '';
  try {
    const res = await fetch('/gift-template.html');
    if (res.ok) {
      templateHtml = await res.text();
    }
  } catch (err) {
    console.warn('Could not fetch /gift-template.html:', err);
  }

  if (!templateHtml) {
    // If template is unavailable, fallback to .memoryboard export
    exportBoardToFile(nodes, metadata);
    return false;
  }

  // Replace script tag in the template
  const replacement = `<script id="standalone-gift-data" type="application/json">${jsonString.replace(/<\/script>/gi, '<\\/script>')}</script>`;
  let finalHtml = templateHtml;

  if (finalHtml.includes('<script id="standalone-gift-data" type="application/json"></script>')) {
    finalHtml = finalHtml.replace(
      '<script id="standalone-gift-data" type="application/json"></script>',
      replacement
    );
  } else if (finalHtml.includes('<!-- STANDALONE_GIFT_DATA -->')) {
    finalHtml = finalHtml.replace('<!-- STANDALONE_GIFT_DATA -->', replacement);
  } else if (finalHtml.includes('<div id="root"></div>')) {
    finalHtml = finalHtml.replace('<div id="root"></div>', `${replacement}<div id="root"></div>`);
  } else {
    finalHtml += replacement;
  }

  // Set customized document title
  const recipient = metadata.recipientName || 'Sophia';
  const customTitle = `${recipient}'s Memory Board — Constellation of Love`;
  finalHtml = finalHtml.replace(/<title>.*?<\/title>/i, `<title>${customTitle}</title>`);

  const blob = new Blob([finalHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = (metadata.recipientName || 'our-memories')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-');

  a.href = url;
  a.download = `${safeName || 'memory'}-gift.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
}

/**
 * Import board from a .memoryboard or .json file
 */
export function importBoardFromFile(file: File): Promise<ShareableBoardData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          // Backward compatibility if raw array of nodes was saved
          const sanitized = parsed.map((n, idx) => sanitizeNode(n, idx));
          resolve({
            version: CURRENT_BOARD_VERSION,
            metadata: {},
            nodes: sanitized,
          });
        } else if (parsed && Array.isArray(parsed.nodes)) {
          const sanitized = parsed.nodes.map((n: Partial<MemoryNode>, idx: number) =>
            sanitizeNode(n, idx)
          );
          resolve({
            version: CURRENT_BOARD_VERSION,
            metadata: parsed.metadata || {},
            nodes: sanitized,
          });
        } else {
          reject(new Error('Invalid memory board file format.'));
        }
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/**
 * Generate QR code data URL for mobile scanning
 * Safely guards against data sizes that exceed QR code limits.
 */
export async function generateQrCode(url: string): Promise<string> {
  // Standard QR code physical byte limit with Low Error Correction is ~2,953 bytes.
  // Beyond 2,200 chars, QR density is too high for cameras to scan reliably.
  if (!url || url.length > 2200) {
    return '';
  }

  try {
    return await QRCode.toDataURL(url, {
      width: 260,
      margin: 2,
      errorCorrectionLevel: 'L',
      color: {
        dark: '#1c1917',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.warn('QR code generation skipped or failed:', err);
    return '';
  }
}
