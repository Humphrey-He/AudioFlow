import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/stores/settingsStore';
import styles from './EffectsPanel.module.css';

const effectKeys = ['glow', 'reflection', 'peak', 'pulse', 'centerLine'] as const;
type EffectKey = (typeof effectKeys)[number];

export function EffectsPanel() {
  const { t } = useTranslation();
  const effects = useSettingsStore((s) => s.effects);
  const updateEffect = useSettingsStore((s) => s.updateEffect);

  return (
    <div className={styles.panel}>
      <span className={styles.title}>{t('effects.title')}:</span>
      {effectKeys.map((key) => (
        <label
          key={key}
          className={`${styles.toggle} ${effects[key] ? styles.active : ''}`}
          title={t(`effects.${key}Tooltip`)}
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
