import { create } from 'zustand';

interface UiState {
  language: string;
  isLoading: boolean;
  errorMessage: string | null;
  setLanguage: (lang: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  language: localStorage.getItem('audioflow_lang') || 'en',
  isLoading: false,
  errorMessage: null,
  setLanguage: (lang) => {
    localStorage.setItem('audioflow_lang', lang);
    set({ language: lang });
  },
  setLoading: (isLoading) => set({ isLoading }),
  setError: (errorMessage) => set({ errorMessage }),
}));
