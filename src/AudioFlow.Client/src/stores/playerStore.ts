import { create } from 'zustand';
import type { VisualizationMode } from '@/types/visualization';

export type ColorScheme = 'fire' | 'aurora' | 'tech' | 'ocean';

export interface WaterfallConfig {
  frameCount: number;
  decay: number;
  colorScheme: ColorScheme;
}

interface PlayerState {
  // Playback state
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  fileName: string;
  volume: number;

  // Source
  source: 'system' | 'microphone' | 'file';

  // Visualization
  visualizationMode: VisualizationMode;
  waterfallConfig: WaterfallConfig;

  // Actions
  setPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setFileName: (name: string) => void;
  setVolume: (volume: number) => void;
  setSource: (source: 'system' | 'microphone' | 'file') => void;
  setVisualizationMode: (mode: VisualizationMode) => void;
  updateWaterfallConfig: (config: Partial<WaterfallConfig>) => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  fileName: '',
  volume: 0.8,
  source: 'system',
  visualizationMode: 'spectrum',
  waterfallConfig: {
    frameCount: 80,
    decay: 0.92,
    colorScheme: 'fire',
  },

  setPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setFileName: (fileName) => set({ fileName }),
  setVolume: (volume) => set({ volume }),
  setSource: (source) => set({ source }),
  setVisualizationMode: (mode) => set({ visualizationMode: mode }),
  updateWaterfallConfig: (config) =>
    set((state) => ({
      waterfallConfig: { ...state.waterfallConfig, ...config },
    })),
}));
