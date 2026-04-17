export type VisualizationMode = 'spectrum' | 'waterfall' | 'waveform' | 'polar' | '3d' | 'comparison';

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
  polar: {
    type: 'full' | 'half';
    direction: 'cw' | 'ccw';
    minRadius: number;
    maxRadius: number;
  };
  threeD: {
    rotationSpeed: number;
    barSpacing: number;
    colorScheme: 'fire' | 'aurora' | 'tech' | 'ocean';
  };
  comparison: {
    showDifference: boolean;
    splitView: 'horizontal' | 'vertical';
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
  polar: {
    type: 'full',
    direction: 'cw',
    minRadius: 50,
    maxRadius: 120,
  },
  threeD: {
    rotationSpeed: 0.5,
    barSpacing: 0.2,
    colorScheme: 'fire',
  },
  comparison: {
    showDifference: true,
    splitView: 'horizontal',
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
