import LZString from 'lz-string';
import QRCode from 'qrcode';
import type { ShareableBoardData, MemoryNode, BoardMetadata } from '../types';

export const CURRENT_BOARD_VERSION = 1;

/**
 * Generate compressed shareable URL hash
 */
export function generateShareableUrl(nodes: MemoryNode[], metadata: BoardMetadata = {}): { url: string; charLength: number; isLarge: boolean } {
  const payload: ShareableBoardData = {
    version: CURRENT_BOARD_VERSION,
    metadata,
    nodes,
  };

  const jsonString = JSON.stringify(payload);
  const compressed = LZString.compressToEncodedURIComponent(jsonString);
  const baseUrl = `${window.location.origin}${window.location.pathname}`;
  const fullUrl = `${baseUrl}#board=${compressed}`;

  return {
    url: fullUrl,
    charLength: fullUrl.length,
    isLarge: fullUrl.length > 25000, // Warn if unusually large (e.g. huge embedded base64)
  };
}

/**
 * Parse board data from current URL hash or query params
 */
export function parseBoardFromUrl(): ShareableBoardData | null {
  try {
    const hash = window.location.hash;
    let encodedData = '';

    if (hash.startsWith('#board=')) {
      encodedData = hash.substring(7);
    } else {
      const params = new URLSearchParams(window.location.search);
      encodedData = params.get('board') || '';
    }

    if (!encodedData) return null;

    const decompressed = LZString.decompressFromEncodedURIComponent(encodedData);
    if (!decompressed) return null;

    const parsed = JSON.parse(decompressed) as ShareableBoardData;
    if (parsed && Array.isArray(parsed.nodes)) {
      return parsed;
    }
  } catch (err) {
    console.error('Failed to parse shareable board from URL:', err);
  }
  return null;
}

/**
 * Export board as downloadable .memoryboard JSON file
 */
export function exportBoardToFile(nodes: MemoryNode[], metadata: BoardMetadata = {}) {
  const payload: ShareableBoardData = {
    version: CURRENT_BOARD_VERSION,
    metadata,
    nodes,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = (metadata.recipientName || metadata.title || 'memory-board')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-');
  
  a.href = url;
  a.download = `${safeName}.memoryboard`;
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
          resolve({
            version: CURRENT_BOARD_VERSION,
            metadata: {},
            nodes: parsed,
          });
        } else if (parsed && Array.isArray(parsed.nodes)) {
          resolve(parsed as ShareableBoardData);
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
 */
export async function generateQrCode(url: string): Promise<string> {
  try {
    return await QRCode.toDataURL(url, {
      width: 260,
      margin: 2,
      color: {
        dark: '#1c1917',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Failed to generate QR code:', err);
    return '';
  }
}
