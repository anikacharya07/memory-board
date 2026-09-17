export type MediaType = 'image' | 'video';

export type AudioPresetType = 
  | 'acoustic_guitar'
  | 'music_box'
  | 'lofi_piano'
  | 'sunset_chords'
  | 'rain_ambient'
  | 'starlight_pads';

export interface MemoryNode {
  id: string;
  caption: string;
  mediaType: MediaType;
  mediaUrl: string;
  audioPreset?: AudioPresetType;
  audioUrl?: string; // Optional custom uploaded audio file/blob
  x: number; // Position in pixels
  y: number; // Position in pixels
  rotation: number; // Degree (-5 to 5)
  width: number;
  height: number;
  connectedTo: string[]; // List of other node IDs connected with pink strings
  note?: string; // Romantic memory note
  date?: string;
}

export interface DragState {
  nodeId: string;
  startX: number;
  startY: number;
  initialNodeX: number;
  initialNodeY: number;
}

export interface BoardMetadata {
  title?: string;
  subtitle?: string;
  recipientName?: string;
  senderName?: string;
  giftMessage?: string;
  createdDate?: string;
}

export interface ShareableBoardData {
  version: number;
  metadata: BoardMetadata;
  nodes: MemoryNode[];
}
