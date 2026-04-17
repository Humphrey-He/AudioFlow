import { useTranslation } from 'react-i18next';
import { usePlayerStore, type ColorScheme } from '@/stores/playerStore';
import type { VisualizationMode } from '@/types/visualization';
import { colorSchemes } from '@/types/visualization';
import styles from './VisualizationSelector.module.css';

export function VisualizationSelector() {
  const { t } = useTranslation();
  const visualizationMode = usePlayerStore((s) => s.visualizationMode);
  const setVisualizationMode = usePlayerStore((s) => s.setVisualizationMode);

  const modes: { key: VisualizationMode; label: string }[] = [
    { key: 'spectrum', label: t('visualization.spectrum') },
    { key: 'waterfall', label: t('visualization.waterfall') },
    { key: 'waveform', label: t('visualization.waveform') },
    { key: 'polar', label: t('visualization.polar') },
    { key: '3d', label: t('visualization.3d') },
    { key: 'comparison', label: t('visualization.comparison') },
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
      {visualizationMode === 'polar' && <PolarControls />}
    </div>
  );
}

function WaterfallControls() {
  const { t } = useTranslation();
  const waterfallConfig = usePlayerStore((s) => s.waterfallConfig);
  const updateWaterfallConfig = usePlayerStore((s) => s.updateWaterfallConfig);

  const colorOptions = Object.keys(colorSchemes) as ColorScheme[];

  return (
    <div className={styles.waterfallControls}>
      <div className={styles.controlGroup}>
        <span className={styles.controlLabel}>{t('visualization.frames')}</span>
        <input
          type="range"
          className={styles.controlRange}
          min="30"
          max="150"
          value={waterfallConfig.frameCount}
          onChange={(e) => updateWaterfallConfig({ frameCount: parseInt(e.target.value) })}
        />
        <span className={styles.controlValue}>{waterfallConfig.frameCount}</span>
      </div>

      <div className={styles.controlGroup}>
        <span className={styles.controlLabel}>{t('visualization.decay')}</span>
        <input
          type="range"
          className={styles.controlRange}
          min="0.8"
          max="0.99"
          step="0.01"
          value={waterfallConfig.decay}
          onChange={(e) => updateWaterfallConfig({ decay: parseFloat(e.target.value) })}
        />
        <span className={styles.controlValue}>{waterfallConfig.decay.toFixed(2)}</span>
      </div>

      <div className={styles.controlGroup}>
        <span className={styles.controlLabel}>{t('visualization.colorScheme')}</span>
        <select
          className={styles.controlSelect}
          value={waterfallConfig.colorScheme}
          onChange={(e) => updateWaterfallConfig({ colorScheme: e.target.value as ColorScheme })}
        >
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

function PolarControls() {
  const { t } = useTranslation();
  const polarConfig = usePlayerStore((s) => s.polarConfig);
  const updatePolarConfig = usePlayerStore((s) => s.updatePolarConfig);

  return (
    <div className={styles.waterfallControls}>
      <div className={styles.controlGroup}>
        <span className={styles.controlLabel}>{t('polar.type')}</span>
        <select
          className={styles.controlSelect}
          value={polarConfig.type}
          onChange={(e) => updatePolarConfig({ type: e.target.value as 'full' | 'half' })}
        >
          <option value="full">{t('polar.full')}</option>
          <option value="half">{t('polar.half')}</option>
        </select>
      </div>

      <div className={styles.controlGroup}>
        <span className={styles.controlLabel}>{t('polar.direction')}</span>
        <select
          className={styles.controlSelect}
          value={polarConfig.direction}
          onChange={(e) => updatePolarConfig({ direction: e.target.value as 'cw' | 'ccw' })}
        >
          <option value="cw">{t('polar.cw')}</option>
          <option value="ccw">{t('polar.ccw')}</option>
        </select>
      </div>
    </div>
  );
}
