import { useTranslation } from 'react-i18next';
import { usePlayerStore } from '@/stores/playerStore';
import type { VisualizationMode } from '@/types/visualization';
import { colorSchemes } from '@/types/visualization';
import styles from './VisualizationSelector.module.css';

interface WaterfallConfig {
  frameCount: number;
  decay: number;
  colorScheme: 'fire' | 'aurora' | 'tech' | 'ocean';
}

export function VisualizationSelector() {
  const { t } = useTranslation();
  const { visualizationMode, setVisualizationMode } = usePlayerStore();

  const modes: { key: VisualizationMode; label: string }[] = [
    { key: 'spectrum', label: t('visualization.spectrum') },
    { key: 'waterfall', label: t('visualization.waterfall') },
    { key: 'waveform', label: t('visualization.waveform') },
  ];

  return (
    <div>
      <div className={styles.selector}>
        {modes.map((mode) => (
          <button
            key={mode.key}
            className={`${styles.modeButton} ${visualizationMode === mode.key ? styles.active : ''}`}
            onClick={() => setVisualizationMode(mode.key)}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {visualizationMode === 'waterfall' && <WaterfallControls />}
    </div>
  );
}

function WaterfallControls() {
  const { t } = useTranslation();
  const { visualizationMode } = usePlayerStore();

  const config = visualizationMode === 'waterfall'
    ? { frameCount: 80, decay: 0.92, colorScheme: 'fire' as const }
    : { frameCount: 80, decay: 0.92, colorScheme: 'fire' as const };

  const colorOptions = Object.keys(colorSchemes) as Array<keyof typeof colorSchemes>;

  return (
    <div className={styles.waterfallControls}>
      <div className={styles.controlGroup}>
        <span className={styles.controlLabel}>{t('visualization.frames')}</span>
        <input
          type="range"
          className={styles.controlRange}
          min="30"
          max="150"
          value={config.frameCount}
          onChange={() => {}}
        />
        <span className={styles.controlValue}>{config.frameCount}</span>
      </div>

      <div className={styles.controlGroup}>
        <span className={styles.controlLabel}>{t('visualization.decay')}</span>
        <input
          type="range"
          className={styles.controlRange}
          min="0.8"
          max="0.99"
          step="0.01"
          value={config.decay}
          onChange={() => {}}
        />
        <span className={styles.controlValue}>{config.decay.toFixed(2)}</span>
      </div>

      <div className={styles.controlGroup}>
        <span className={styles.controlLabel}>{t('visualization.colorScheme')}</span>
        <select className={styles.controlSelect}>
          {colorOptions.map((key) => (
            <option key={key} value={key}>
              {t(`colorScheme.${key}`)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
