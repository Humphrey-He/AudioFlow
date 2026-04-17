import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlayerStore } from '@/stores/playerStore';
import styles from './ParticleEditor.module.css';

export function ParticleEditor() {
  const { t } = useTranslation();
  const particleConfig = usePlayerStore((s) => s.particleConfig);
  const updateParticleConfig = usePlayerStore((s) => s.updateParticleConfig);

  const handleToggle = useCallback(
    (enabled: boolean) => {
      updateParticleConfig({ enabled });
    },
    [updateParticleConfig]
  );

  const handleChange = useCallback(
    (key: keyof typeof particleConfig, value: number | boolean) => {
      updateParticleConfig({ [key]: value });
    },
    [updateParticleConfig]
  );

  if (!particleConfig) return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>{t('particle.title')}</span>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={particleConfig.enabled}
            onChange={(e) => handleToggle(e.target.checked)}
          />
          <span className={styles.toggleLabel}>{t('particle.enable')}</span>
        </label>
      </div>

      {particleConfig.enabled && (
        <div className={styles.controls}>
          <div className={styles.controlRow}>
            <label className={styles.label}>{t('particle.count')}</label>
            <input
              type="range"
              className={styles.slider}
              min="10"
              max="100"
              step="5"
              value={particleConfig.count}
              onChange={(e) => handleChange('count', parseInt(e.target.value))}
            />
            <span className={styles.value}>{particleConfig.count}</span>
          </div>

          <div className={styles.controlRow}>
            <label className={styles.label}>{t('particle.size')}</label>
            <input
              type="range"
              className={styles.slider}
              min="1"
              max="10"
              step="0.5"
              value={particleConfig.size}
              onChange={(e) => handleChange('size', parseFloat(e.target.value))}
            />
            <span className={styles.value}>{particleConfig.size}</span>
          </div>

          <div className={styles.controlRow}>
            <label className={styles.label}>{t('particle.speed')}</label>
            <input
              type="range"
              className={styles.slider}
              min="0.5"
              max="5"
              step="0.5"
              value={particleConfig.speed}
              onChange={(e) => handleChange('speed', parseFloat(e.target.value))}
            />
            <span className={styles.value}>{particleConfig.speed}</span>
          </div>

          <div className={styles.controlRow}>
            <label className={styles.label}>{t('particle.threshold')}</label>
            <input
              type="range"
              className={styles.slider}
              min="0.1"
              max="0.9"
              step="0.1"
              value={particleConfig.energyThreshold}
              onChange={(e) => handleChange('energyThreshold', parseFloat(e.target.value))}
            />
            <span className={styles.value}>{Math.round(particleConfig.energyThreshold * 100)}%</span>
          </div>

          <div className={styles.controlRow}>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={particleConfig.colorFollowBar}
                onChange={(e) => handleChange('colorFollowBar', e.target.checked)}
              />
              <span>{t('particle.colorFollow')}</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
