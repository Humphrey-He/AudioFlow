import { useTranslation } from 'react-i18next';
import styles from './StatsPanel.module.css';

interface StatsPanelProps {
  frame: number;
  peakDb: number;
  avgDb: number;
  fps: number;
}

export function StatsPanel({ frame, peakDb, avgDb, fps }: StatsPanelProps) {
  const { t } = useTranslation();

  const formatDb = (db: number) => (db > -180 ? db.toFixed(1) : '-∞');

  return (
    <div className={styles.panel}>
      <div className={styles.card}>
        <div className={styles.label}>{t('stats.frame')}</div>
        <div className={styles.value}>{frame}</div>
      </div>
      <div className={styles.card}>
        <div className={styles.label}>{t('stats.peak')}</div>
        <div className={styles.value}>{formatDb(peakDb)}</div>
      </div>
      <div className={styles.card}>
        <div className={styles.label}>{t('stats.avg')}</div>
        <div className={styles.value}>{formatDb(avgDb)}</div>
      </div>
      <div className={styles.card}>
        <div className={styles.label}>{t('stats.fps')}</div>
        <div className={styles.value}>{fps}</div>
      </div>
    </div>
  );
}
