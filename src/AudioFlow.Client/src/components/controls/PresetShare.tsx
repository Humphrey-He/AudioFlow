import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/stores/settingsStore';
import { usePlayerStore } from '@/stores/playerStore';
import styles from './PresetShare.module.css';

export function PresetShare() {
  const { t } = useTranslation();
  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [error, setError] = useState<string | null>(null);

  const audioSettings = useSettingsStore((s) => s.audio);
  const effects = useSettingsStore((s) => s.effects);
  const waterfallConfig = usePlayerStore((s) => s.waterfallConfig);
  const polarConfig = usePlayerStore((s) => s.polarConfig);
  const visualizationMode = usePlayerStore((s) => s.visualizationMode);
  const updateAudioSetting = useSettingsStore((s) => s.updateAudioSetting);
  const updateEffect = useSettingsStore((s) => s.updateEffect);

  const exportPreset = () => {
    const preset = {
      name: 'Custom Preset',
      version: 1,
      audio: audioSettings,
      effects: {
        glow: effects.glow,
        reflection: effects.reflection,
        peak: effects.peak,
        pulse: effects.pulse,
        centerLine: effects.centerLine,
      },
      visualization: {
        mode: visualizationMode,
        waterfall: waterfallConfig,
        polar: polarConfig,
      },
    };

    const json = JSON.stringify(preset, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audioflow-preset-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const copyShareLink = () => {
    const preset = {
      audio: audioSettings,
      effects: {
        glow: effects.glow,
        reflection: effects.reflection,
        peak: effects.peak,
        pulse: effects.pulse,
        centerLine: effects.centerLine,
      },
      visualization: {
        mode: visualizationMode,
        waterfall: {
          frameCount: waterfallConfig.frameCount,
          decay: waterfallConfig.decay,
          colorScheme: waterfallConfig.colorScheme,
        },
      },
    };

    const encoded = btoa(encodeURIComponent(JSON.stringify(preset)));
    const url = `${window.location.origin}${window.location.pathname}?preset=${encoded}`;

    navigator.clipboard.writeText(url).then(
      () => alert(t('presetShare.copied')),
      () => {
        // Fallback
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        alert(t('presetShare.copied'));
      }
    );
  };

  const importPreset = () => {
    setError(null);
    try {
      const preset = JSON.parse(importJson);

      if (preset.audio) {
        const { smoothing, attack, decay, weighting } = preset.audio;
        if (smoothing) updateAudioSetting('smoothing', smoothing);
        if (attack !== undefined) updateAudioSetting('attack', attack);
        if (decay !== undefined) updateAudioSetting('decay', decay);
        if (weighting) updateAudioSetting('weighting', weighting);
      }

      if (preset.effects) {
        Object.entries(preset.effects).forEach(([key, value]) => {
          if (key in effects) {
            updateEffect(key as keyof typeof effects, value as boolean);
          }
        });
      }

      setShowImport(false);
      setImportJson('');
      alert(t('presetShare.imported'));
    } catch (err) {
      setError(t('presetShare.invalid'));
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.buttons}>
        <button className={styles.button} onClick={exportPreset} title={t('presetShare.export')}>
          📥 {t('presetShare.export')}
        </button>
        <button className={styles.button} onClick={copyShareLink} title={t('presetShare.copyLink')}>
          🔗 {t('presetShare.copyLink')}
        </button>
        <button
          className={styles.button}
          onClick={() => setShowImport(!showImport)}
          title={t('presetShare.import')}
        >
          📤 {t('presetShare.import')}
        </button>
      </div>

      {showImport && (
        <div className={styles.importPanel}>
          <textarea
            className={styles.textarea}
            value={importJson}
            onChange={(e) => setImportJson(e.target.value)}
            placeholder={t('presetShare.pasteJson')}
            rows={5}
          />
          {error && <span className={styles.error}>{error}</span>}
          <div className={styles.importActions}>
            <button className={styles.importButton} onClick={importPreset}>
              {t('presetShare.import')}
            </button>
            <button className={styles.cancelButton} onClick={() => setShowImport(false)}>
              {t('presetShare.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
