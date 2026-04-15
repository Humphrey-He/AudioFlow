import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/stores/settingsStore';
import styles from './ControlsPanel.module.css';

const tooltips: Record<string, Record<string, string>> = {
  en: {
    smoothing: 'Smoothing algorithm for frequency magnitude changes.',
    attack: 'Speed of magnitude increase. Higher = faster response.',
    decay: 'Speed of magnitude decrease. Higher = faster fade.',
    weighting: 'A simulates human ear sensitivity, C is flatter.',
  },
  zh: {
    smoothing: '频率幅度变化的平滑算法',
    attack: '幅度增加速度，越高响应越快',
    decay: '幅度下降速度，越高衰减越快',
    weighting: 'A模拟人耳灵敏度，C更平坦',
  },
  ja: {
    smoothing: '周波数マグニチュード変化のスムージングアルゴリズム',
    attack: 'マグニチュード増加の速度。高い = 反応が速い',
    decay: 'マグニチュード減少の速度。高い = 減衰が速い',
    weighting: 'Aは人間の耳の感度を模擬、Cはより平坦',
  },
};

export function ControlsPanel() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const audio = useSettingsStore((s) => s.audio);
  const updateAudioSetting = useSettingsStore((s) => s.updateAudioSetting);
  const tt = tooltips[lang] || tooltips.en;

  return (
    <div className={styles.panel}>
      <div className={styles.group}>
        <label className={styles.label}>
          <span className={styles.tooltip} data-tooltip={tt.smoothing}>
            {t('controls.smoothing')}
          </span>
        </label>
        <select
          className={styles.select}
          value={audio.smoothing}
          onChange={(e) => updateAudioSetting('smoothing', e.target.value as 'gravity' | 'lerp' | 'none')}
        >
          <option value="gravity">{t('controls.gravity')}</option>
          <option value="lerp">{t('controls.lerp')}</option>
          <option value="none">{t('controls.none')}</option>
        </select>
      </div>

      <div className={styles.group}>
        <label className={styles.label}>
          <span className={styles.tooltip} data-tooltip={tt.attack}>
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
        />
      </div>

      <div className={styles.group}>
        <label className={styles.label}>
          <span className={styles.tooltip} data-tooltip={tt.decay}>
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
        />
      </div>

      <div className={styles.group}>
        <label className={styles.label}>
          <span className={styles.tooltip} data-tooltip={tt.weighting}>
            {t('controls.weighting')}
          </span>
        </label>
        <select
          className={styles.select}
          value={audio.weighting}
          onChange={(e) => updateAudioSetting('weighting', e.target.value as 'A' | 'C' | 'Linear')}
        >
          <option value="A">{t('controls.aWeighting')}</option>
          <option value="C">{t('controls.cWeighting')}</option>
          <option value="Linear">{t('controls.linear')}</option>
        </select>
      </div>
    </div>
  );
}
