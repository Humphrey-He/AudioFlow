import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/stores/settingsStore';
import styles from './ControlsPanel.module.css';

export function ControlsPanel() {
  const { t } = useTranslation();
  const audio = useSettingsStore((s) => s.audio);
  const updateAudioSetting = useSettingsStore((s) => s.updateAudioSetting);

  return (
    <div className={styles.panel}>
      <div className={styles.group}>
        <label className={styles.label}>
          <span className={styles.tooltip} data-tooltip={t('controls.smoothingDesc')}>
            {t('controls.smoothing')}
          </span>
        </label>
        <select
          className={styles.select}
          value={audio.smoothing}
          onChange={(e) => updateAudioSetting('smoothing', e.target.value as 'gravity' | 'lerp' | 'none')}
          title={t('controls.smoothingDesc')}
        >
          <option value="gravity" title={t('controls.smoothingOptions.gravity')}>
            {t('controls.gravity')}
          </option>
          <option value="lerp" title={t('controls.smoothingOptions.lerp')}>
            {t('controls.lerp')}
          </option>
          <option value="none" title={t('controls.smoothingOptions.none')}>
            {t('controls.none')}
          </option>
        </select>
      </div>

      <div className={styles.group}>
        <label className={styles.label}>
          <span className={styles.tooltip} data-tooltip={`${t('controls.attackDesc')} (${t('controls.attackRange')})`}>
            {t('controls.attack')}
          </span>
        </label>
        <input
          type="range"
          className={styles.range}
          min="0.1"
          max="1.0"
          step="0.1"
          value={audio.attack}
          onChange={(e) => updateAudioSetting('attack', parseFloat(e.target.value))}
          title={`${t('controls.attackDesc')} (${t('controls.attackRange')})`}
        />
        <span className={styles.value}>{audio.attack.toFixed(1)}</span>
      </div>

      <div className={styles.group}>
        <label className={styles.label}>
          <span className={styles.tooltip} data-tooltip={`${t('controls.decayDesc')} (${t('controls.decayRange')})`}>
            {t('controls.decay')}
          </span>
        </label>
        <input
          type="range"
          className={styles.range}
          min="0.1"
          max="1.0"
          step="0.1"
          value={audio.decay}
          onChange={(e) => updateAudioSetting('decay', parseFloat(e.target.value))}
          title={`${t('controls.decayDesc')} (${t('controls.decayRange')})`}
        />
        <span className={styles.value}>{audio.decay.toFixed(1)}</span>
      </div>

      <div className={styles.group}>
        <label className={styles.label}>
          <span className={styles.tooltip} data-tooltip={t('controls.weightingDesc')}>
            {t('controls.weighting')}
          </span>
        </label>
        <select
          className={styles.select}
          value={audio.weighting}
          onChange={(e) => updateAudioSetting('weighting', e.target.value as 'A' | 'C' | 'Linear')}
          title={t('controls.weightingDesc')}
        >
          <option value="A" title={t('controls.weightingOptions.a')}>
            {t('controls.aWeighting')}
          </option>
          <option value="C" title={t('controls.weightingOptions.c')}>
            {t('controls.cWeighting')}
          </option>
          <option value="Linear" title={t('controls.weightingOptions.linear')}>
            {t('controls.linear')}
          </option>
        </select>
      </div>
    </div>
  );
}
