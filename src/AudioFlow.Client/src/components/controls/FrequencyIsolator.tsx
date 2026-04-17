import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/stores/settingsStore';
import styles from './FrequencyIsolator.module.css';

type FrequencyRange = 'all' | 'bass' | 'vocal' | 'mid' | 'high';

export function FrequencyIsolator() {
  const { t } = useTranslation();
  const frequencyRange = useSettingsStore((s) => s.effects.frequencyRange);
  const setFrequencyRange = useSettingsStore((s) => s.setFrequencyRange);

  const ranges: { key: FrequencyRange; label: string; low: number; high: number }[] = [
    { key: 'all', label: t('frequency.all'), low: 0, high: 100 },
    { key: 'bass', label: t('frequency.bass'), low: 0, high: 25 },
    { key: 'vocal', label: t('frequency.vocal'), low: 25, high: 50 },
    { key: 'mid', label: t('frequency.mid'), low: 50, high: 75 },
    { key: 'high', label: t('frequency.high'), low: 75, high: 100 },
  ];

  const currentRange = ranges.find((r) => r.key === frequencyRange) || ranges[0];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>{t('frequency.title')}</span>
        <span className={styles.range}>
          {currentRange.low}% - {currentRange.high}%
        </span>
      </div>

      <div className={styles.presets}>
        {ranges.map((range) => (
          <button
            key={range.key}
            className={`${styles.presetButton} ${frequencyRange === range.key ? styles.active : ''}`}
            onClick={() => setFrequencyRange(range.key)}
          >
            {range.label}
          </button>
        ))}
      </div>

      <div className={styles.slider}>
        <input
          type="range"
          min="0"
          max="100"
          value={currentRange.high}
          className={styles.rangeSlider}
          onChange={(e) => {
            const high = parseInt(e.target.value);
            if (high > currentRange.low) {
              // This is simplified - in a real app you'd want more granular control
              setFrequencyRange('all');
            }
          }}
        />
      </div>
    </div>
  );
}
