import { create } from 'zustand';
import type { AudioSettings } from '@/types/common';
import { settingsSyncController } from '@/services/audio/settingsSyncController';

interface EffectsState {
  glow: boolean;
  reflection: boolean;
  peak: boolean;
  pulse: boolean;
  centerLine: boolean;
}

export interface SettingsState {
  audio: AudioSettings;
  effects: EffectsState;
  preset: string;
  updateAudioSetting: <K extends keyof AudioSettings>(key: K, value: AudioSettings[K]) => void;
  updateEffect: (key: keyof EffectsState, value: boolean) => void;
  applyPreset: (preset: string) => void;
}

const defaultEffects: EffectsState = {
  glow: true,
  reflection: true,
  peak: true,
  pulse: false,
  centerLine: false,
};

const presets: Record<string, EffectsState> = {
  default: { glow: true, reflection: true, peak: true, pulse: false, centerLine: false },
  bassic: { glow: true, reflection: true, peak: true, pulse: true, centerLine: true },
  vivid: { glow: true, reflection: true, peak: true, pulse: true, centerLine: true },
  minimal: { glow: false, reflection: false, peak: false, pulse: false, centerLine: false },
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  audio: {
    smoothing: 'gravity',
    attack: 0.6,
    decay: 0.2,
    weighting: 'A',
  },
  effects: { ...defaultEffects },
  preset: 'default',
  updateAudioSetting: (key, value) => {
    const newAudio = { ...get().audio, [key]: value };
    set({ audio: newAudio });
    // Sync to server via controller
    settingsSyncController.applySettings(newAudio);
  },
  updateEffect: (key, value) =>
    set((state) => ({
      effects: { ...state.effects, [key]: value },
      preset: 'custom',
    })),
  applyPreset: (preset) => {
    if (preset === 'custom') {
      set({ preset });
      return;
    }
    const effects = presets[preset];
    if (effects) {
      set({ effects: { ...effects }, preset });
    }
  },
}));
