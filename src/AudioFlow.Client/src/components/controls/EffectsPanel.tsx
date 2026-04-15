import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/stores/settingsStore';
import styles from './EffectsPanel.module.css';

const effectKeys = ['glow', 'reflection', 'peak', 'pulse', 'centerLine'] as const;
type EffectKey = (typeof effectKeys)[number];

const tooltips: Record<string, Record<EffectKey, string>> = {
  en: {
    glow: 'Add glow effect to high-energy bars (above -20dB)',
    reflection: 'Show mirrored reflection below each bar',
    peak: 'Hold peak values for 1.5s before decaying',
    pulse: 'Background pulses with low-frequency energy',
    centerLine: 'Draw smooth curve connecting bar midpoints',
  },
  zh: {
    glow: '为高能量条形添加发光效果 (>-20dB)',
    reflection: '在每个条形下方显示镜像倒影',
    peak: '保持峰值1.5秒后开始衰减',
    pulse: '背景随低频能量脉动',
    centerLine: '绘制连接条形中点的平滑曲线',
  },
  ja: {
    glow: '高エネルギーバー (> -20dB) にグロー効果を加える',
    reflection: '各バーの下にミラーリフレクションを表示',
    peak: 'ピークを1.5秒間保持してから減衰',
    pulse: '低周波エネルギーと連動して背景が脈動',
    centerLine: 'バーの中間点を結ぶスムーズなカーブを描画',
  },
};

export function EffectsPanel() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const effects = useSettingsStore((s) => s.effects);
  const updateEffect = useSettingsStore((s) => s.updateEffect);
  const tt = tooltips[lang] || tooltips.en;

  return (
    <div className={styles.panel}>
      <span className={styles.title}>{t('effects.title')}:</span>
      {effectKeys.map((key) => (
        <label
          key={key}
          className={`${styles.toggle} ${effects[key] ? styles.active : ''}`}
          data-tooltip={tt[key]}
          title={tt[key]}
        >
          <input
            type="checkbox"
            checked={effects[key]}
            onChange={() => updateEffect(key, !effects[key])}
          />
          <span className={styles.indicator} />
          <span>{t(`effects.${key}`)}</span>
        </label>
      ))}
    </div>
  );
}
