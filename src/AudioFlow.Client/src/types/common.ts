export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

export interface SpectrumFrame {
  frame: number;
  timestamp: string;
  magnitudes: number[];
}

export interface AudioSettings {
  smoothing: 'gravity' | 'lerp' | 'none';
  attack: number;
  decay: number;
  weighting: 'A' | 'C' | 'Linear';
}
