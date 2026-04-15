import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { audioRuntime } from '@/services/audio/audioRuntime';
import styles from './StatsPanel.module.css';

export function StatsPanel() {
  const { t } = useTranslation();
  const [fps, setFps] = useState(0);
  const [frameCount, setFrameCount] = useState(0);
  const [peakDb, setPeakDb] = useState(-180);
  const [avgDb, setAvgDb] = useState(-180);

  useEffect(() => {
    const interval = setInterval(() => {
      const snapshot = audioRuntime.getSnapshot();
      setFrameCount(snapshot.stats.frameCount);
      setPeakDb(snapshot.stats.peakDb);
      setAvgDb(snapshot.stats.avgDb);
      // Estimate FPS from frame rate
      setFps(Math.round(1000 / Math.max(1, snapshot.version)));
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const formatDb = (db: number) => (db > -180 ? db.toFixed(1) : '-∞');

  return (
    <div className={styles.panel}>
      <div className={styles.card} title={t('stats.frameDesc')}>
        <div className={styles.label}>{t('stats.frame')}</div>
        <div className={styles.value}>{frameCount}</div>
      </div>
      <div className={styles.card} title={t('stats.peakDesc')}>
        <div className={styles.label}>{t('stats.peak')}</div>
        <div className={styles.value}>{formatDb(peakDb)}</div>
      </div>
      <div className={styles.card} title={t('stats.avgDesc')}>
        <div className={styles.label}>{t('stats.avg')}</div>
        <div className={styles.value}>{formatDb(avgDb)}</div>
      </div>
      <div className={styles.card} title={t('stats.fpsDesc')}>
        <div className={styles.label}>{t('stats.fps')}</div>
        <div className={styles.value}>{fps}</div>
      </div>
    </div>
  );
}
