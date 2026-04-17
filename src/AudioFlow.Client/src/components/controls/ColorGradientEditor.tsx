import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlayerStore } from '@/stores/playerStore';
import styles from './ColorGradientEditor.module.css';

const PRESET_GRADIENTS = [
  { name: 'fire', low: '#ff2200', mid: '#ff9900', high: '#ffee00' },
  { name: 'aurora', low: '#00ff88', mid: '#8866ff', high: '#ff66aa' },
  { name: 'tech', low: '#00ffff', mid: '#0088ff', high: '#0044aa' },
  { name: 'ocean', low: '#00aaff', mid: '#0066cc', high: '#003388' },
];

export function ColorGradientEditor() {
  const { t } = useTranslation();
  const customGradient = usePlayerStore((s) => s.customGradient);
  const updateCustomGradient = usePlayerStore((s) => s.updateCustomGradient);

  const handleColorChange = useCallback(
    (key: 'low' | 'mid' | 'high', value: string) => {
      updateCustomGradient({ [key]: value, useCustom: true });
    },
    [updateCustomGradient]
  );

  const handleToggleCustom = useCallback(
    (enabled: boolean) => {
      updateCustomGradient({ useCustom: enabled });
    },
    [updateCustomGradient]
  );

  const handlePresetSelect = useCallback(
    (preset: typeof PRESET_GRADIENTS[0]) => {
      updateCustomGradient({
        low: preset.low,
        mid: preset.mid,
        high: preset.high,
        useCustom: true,
      });
    },
    [updateCustomGradient]
  );

  const previewGradient = `linear-gradient(90deg, ${customGradient.low} 0%, ${customGradient.mid} 50%, ${customGradient.high} 100%)`;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>{t('gradient.title')}</span>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={customGradient.useCustom}
            onChange={(e) => handleToggleCustom(e.target.checked)}
          />
          <span className={styles.toggleLabel}>{t('gradient.enable')}</span>
        </label>
      </div>

      {customGradient.useCustom && (
        <>
          <div className={styles.preview}>
            <div className={styles.previewBar} style={{ background: previewGradient }} />
          </div>

          <div className={styles.colorInputs}>
            <div className={styles.colorRow}>
              <label className={styles.colorLabel}>{t('gradient.low')}</label>
              <input
                type="color"
                className={styles.colorPicker}
                value={customGradient.low}
                onChange={(e) => handleColorChange('low', e.target.value)}
              />
              <span className={styles.colorValue}>{customGradient.low}</span>
            </div>

            <div className={styles.colorRow}>
              <label className={styles.colorLabel}>{t('gradient.mid')}</label>
              <input
                type="color"
                className={styles.colorPicker}
                value={customGradient.mid}
                onChange={(e) => handleColorChange('mid', e.target.value)}
              />
              <span className={styles.colorValue}>{customGradient.mid}</span>
            </div>

            <div className={styles.colorRow}>
              <label className={styles.colorLabel}>{t('gradient.high')}</label>
              <input
                type="color"
                className={styles.colorPicker}
                value={customGradient.high}
                onChange={(e) => handleColorChange('high', e.target.value)}
              />
              <span className={styles.colorValue}>{customGradient.high}</span>
            </div>
          </div>

          <div className={styles.presets}>
            <span className={styles.presetsLabel}>{t('gradient.presets')}</span>
            <div className={styles.presetButtons}>
              {PRESET_GRADIENTS.map((preset) => (
                <button
                  key={preset.name}
                  className={styles.presetButton}
                  onClick={() => handlePresetSelect(preset)}
                  title={t(`colorScheme.${preset.name}`)}
                >
                  <div
                    className={styles.presetSwatch}
                    style={{
                      background: `linear-gradient(90deg, ${preset.low}, ${preset.mid}, ${preset.high})`,
                    }}
                  />
                  <span className={styles.presetName}>{t(`colorScheme.${preset.name}`)}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
