import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlayerStore } from '@/stores/playerStore';
import styles from './ThemeMarket.module.css';

export interface Theme {
  id: string;
  name: string;
  author?: string;
  colors: {
    low: string;
    mid: string;
    high: string;
    background: string;
  };
}

const BUILT_IN_THEMES: Theme[] = [
  {
    id: 'fire',
    name: 'Fire',
    author: 'AudioFlow',
    colors: {
      low: '#ffee00',
      mid: '#ff9900',
      high: '#ff2200',
      background: '#0a0505',
    },
  },
  {
    id: 'aurora',
    name: 'Aurora',
    author: 'AudioFlow',
    colors: {
      low: '#ff66aa',
      mid: '#8866ff',
      high: '#00ff88',
      background: '#050510',
    },
  },
  {
    id: 'tech',
    name: 'Tech',
    author: 'AudioFlow',
    colors: {
      low: '#0044aa',
      mid: '#0088ff',
      high: '#00ffff',
      background: '#050510',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    author: 'AudioFlow',
    colors: {
      low: '#003388',
      mid: '#0066cc',
      high: '#00aaff',
      background: '#020810',
    },
  },
  {
    id: 'sunset',
    name: 'Sunset',
    author: 'Community',
    colors: {
      low: '#ff6b6b',
      mid: '#feca57',
      high: '#ff9ff3',
      background: '#0a0a0f',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    author: 'Community',
    colors: {
      low: '#1dd1a1',
      mid: '#10ac84',
      high: '#5f27cd',
      background: '#0a0f0a',
    },
  },
];

const STORAGE_KEY = 'audioflow-custom-themes';

export function ThemeMarket() {
  const { t } = useTranslation();
  const [importJson, setImportJson] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [error, setError] = useState('');

  const customGradient = usePlayerStore((s) => s.customGradient);
  const updateCustomGradient = usePlayerStore((s) => s.updateCustomGradient);

  // Load custom themes from localStorage
  const getCustomThemes = useCallback((): Theme[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  const saveCustomThemes = useCallback((themes: Theme[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(themes));
  }, []);

  const allThemes = [...BUILT_IN_THEMES, ...getCustomThemes()];

  const applyTheme = useCallback((theme: Theme) => {
    updateCustomGradient({
      low: theme.colors.low,
      mid: theme.colors.mid,
      high: theme.colors.high,
      useCustom: true,
    });
  }, [updateCustomGradient]);

  const handleExport = useCallback(() => {
    const theme: Theme = {
      id: `custom-${Date.now()}`,
      name: 'My Theme',
      author: 'User',
      colors: {
        low: customGradient.low,
        mid: customGradient.mid,
        high: customGradient.high,
        background: '#0a0a0f',
      },
    };

    const json = JSON.stringify(theme, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `audioflow-theme-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [customGradient]);

  const handleImport = useCallback(() => {
    setError('');
    try {
      const theme = JSON.parse(importJson) as Theme;

      if (!theme.id || !theme.name || !theme.colors) {
        throw new Error('Invalid theme format');
      }

      const customThemes = getCustomThemes();

      // Check if theme already exists
      const existingIndex = customThemes.findIndex((t) => t.id === theme.id);
      if (existingIndex >= 0) {
        customThemes[existingIndex] = theme;
      } else {
        theme.id = `custom-${Date.now()}`;
        customThemes.push(theme);
      }

      saveCustomThemes(customThemes);
      applyTheme(theme);
      setImportJson('');
      setShowImport(false);
    } catch (err) {
      setError(t('themeMarket.invalidFormat'));
    }
  }, [importJson, getCustomThemes, saveCustomThemes, applyTheme, t]);

  const handleDeleteCustom = useCallback((themeId: string) => {
    const customThemes = getCustomThemes().filter((t) => t.id !== themeId);
    saveCustomThemes(customThemes);
  }, [getCustomThemes, saveCustomThemes]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>{t('themeMarket.title')}</span>
      </div>

      <div className={styles.themes}>
        {allThemes.map((theme) => (
          <div
            key={theme.id}
            className={`${styles.themeCard} ${theme.colors.low === customGradient.low && theme.colors.mid === customGradient.mid ? styles.active : ''}`}
            onClick={() => applyTheme(theme)}
          >
            <div className={styles.preview}>
              <div className={styles.previewBar} style={{ backgroundColor: theme.colors.high }} />
              <div className={styles.previewBar} style={{ backgroundColor: theme.colors.mid }} />
              <div className={styles.previewBar} style={{ backgroundColor: theme.colors.low }} />
            </div>
            <div className={styles.themeInfo}>
              <span className={styles.themeName}>{theme.name}</span>
              {theme.author && <span className={styles.themeAuthor}>{theme.author}</span>}
            </div>
            {!theme.id.startsWith('custom') && (
              <span className={styles.builtIn}>{t('themeMarket.builtIn')}</span>
            )}
            {theme.id.startsWith('custom') && (
              <button
                className={styles.deleteBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteCustom(theme.id);
                }}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      <div className={styles.actions}>
        <button className={styles.exportBtn} onClick={handleExport}>
          {t('themeMarket.export')}
        </button>

        <button
          className={styles.importBtn}
          onClick={() => setShowImport(!showImport)}
        >
          {t('themeMarket.import')}
        </button>
      </div>

      {showImport && (
        <div className={styles.importSection}>
          <textarea
            className={styles.textarea}
            value={importJson}
            onChange={(e) => setImportJson(e.target.value)}
            placeholder={t('themeMarket.pasteJson')}
            rows={4}
          />
          {error && <span className={styles.error}>{error}</span>}
          <button className={styles.applyBtn} onClick={handleImport}>
            {t('themeMarket.apply')}
          </button>
        </div>
      )}
    </div>
  );
}
