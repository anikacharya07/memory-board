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
export function generateShareableUrl(
  nodes: MemoryNode[],
  metadata: BoardMetadata = {}
): { url: string; charLength: number; isLarge: boolean } {
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
  const baseUrl = `${window.location.origin}${window.location.pathname}`;
  const fullUrl = `${baseUrl}#b2=${compressed}`;

  return {
    url: fullUrl,
    charLength: fullUrl.length,
    isLarge: totalMediaChars > 20000 || fullUrl.length > 2500,
  };
}

/**
 * Parse board data from current URL hash or query params
 */
export function parseBoardFromUrl(): ShareableBoardData | null {
  try {
    const hash = window.location.hash || '';
    let encodedData = '';
    let isV2 = false;

    if (hash.startsWith('#b2=')) {
      encodedData = hash.substring(4);
      isV2 = true;
    } else if (hash.startsWith('#board=')) {
      encodedData = hash.substring(7);
      isV2 = false;
    } else {
      const params = new URLSearchParams(window.location.search);
      if (params.get('b2')) {
        encodedData = params.get('b2') || '';
        isV2 = true;
      } else if (params.get('board')) {
        encodedData = params.get('board') || '';
        isV2 = false;
      }
    }

    if (!encodedData) return null;

    // Try direct decompression, then with decodeURIComponent fallback if URL-encoded by apps
    let decompressed = LZString.decompressFromEncodedURIComponent(encodedData);
    if (!decompressed) {
      try {
        decompressed = LZString.decompressFromEncodedURIComponent(decodeURIComponent(encodedData));
      } catch {}
    }

    if (!decompressed) return null;

    const parsed = JSON.parse(decompressed);

    // V2 Compact schema
    if (isV2 || (parsed && parsed.v === 2 && Array.isArray(parsed.s))) {
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

    // V1 Full schema
    if (parsed && Array.isArray(parsed.nodes)) {
      const sanitized = parsed.nodes.map((node: Partial<MemoryNode>, idx: number) =>
        sanitizeNode(node, idx)
      );
      return {
        version: 1,
        metadata: parsed.metadata || {},
        nodes: sanitized,
      };
    }
  } catch (err) {
    console.error('Failed to parse shareable board from URL:', err);
  }
  return null;
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
