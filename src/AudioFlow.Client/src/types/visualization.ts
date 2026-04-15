export type VisualizationMode = 'spectrum' | 'waterfall' | 'waveform';

export interface VisualizationConfig {
  mode: VisualizationMode;
  waterfall: {
    frameCount: number;
    decay: number;
    colorScheme: 'fire' | 'aurora' | 'tech' | 'ocean';
  };
  waveform: {
    lineWidth: number;
    strokeStyle: string;
  };
}

export const defaultVisualizationConfig: VisualizationConfig = {
  mode: 'spectrum',
  waterfall: {
    frameCount: 80,
    decay: 0.92,
    colorScheme: 'fire',
  },
  waveform: {
    lineWidth: 2,
    strokeStyle: '#38d9a9',
  },
};

// Color schemes for waterfall
export const colorSchemes = {
  fire: {
    high: '#ff2200',
    mid: '#ff9900',
    low: '#ffee00',
    bg: '#0a0505',
  },
  aurora: {
    high: '#00ff88',
    mid: '#8866ff',
    low: '#ff66aa',
    bg: '#050510',
  },
  tech: {
    high: '#00ffff',
    mid: '#0088ff',
    low: '#0044aa',
    bg: '#050510',
  },
  ocean: {
    high: '#00aaff',
    mid: '#0066cc',
    low: '#003388',
    bg: '#020810',
  },
};
