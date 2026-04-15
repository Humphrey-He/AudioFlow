import { create } from 'zustand';
import type { VisualizationMode } from '@/types/visualization';

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

  // Actions
  setPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setFileName: (name: string) => void;
  setVolume: (volume: number) => void;
  setSource: (source: 'system' | 'microphone' | 'file') => void;
  setVisualizationMode: (mode: VisualizationMode) => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  fileName: '',
  volume: 0.8,
  source: 'system',
  visualizationMode: 'spectrum',

  setPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setFileName: (fileName) => set({ fileName }),
  setVolume: (volume) => set({ volume }),
  setSource: (source) => set({ source }),
  setVisualizationMode: (mode) => set({ visualizationMode: mode }),
}));
