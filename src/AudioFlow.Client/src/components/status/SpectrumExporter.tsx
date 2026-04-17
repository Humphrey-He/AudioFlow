import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlayerStore } from '@/stores/playerStore';
import { audioPlayer } from '@/services/audio/audioPlayer';
import { audioInput } from '@/services/audio/audioInput';
import { audioRuntime } from '@/services/audio/audioRuntime';
import { exportSpectrum } from '@/services/audio/spectrumExporter';
import styles from './SpectrumExporter.module.css';

export function SpectrumExporter() {
  const { t } = useTranslation();
  const source = usePlayerStore((s) => s.source);
  const [format, setFormat] = useState<'csv' | 'json'>('json');
  const [status, setStatus] = useState<string | null>(null);

  const getMagnitudes = useCallback(() => {
    let magnitudes: number[] = [];
    if (source === 'file' && audioPlayer.getFileName()) {
      magnitudes = Array.from(audioPlayer.getFrequencyData()).map((v) => {
        return v > 0 ? 20 * Math.log10(v / 255) : -180;
      });
    } else if (source === 'microphone' && audioInput.getIsActive()) {
      magnitudes = Array.from(audioInput.getFrequencyData()).map((v) => {
        return v > 0 ? 20 * Math.log10(v / 255) : -180;
      });
    } else {
      const snapshot = audioRuntime.getSnapshot();
      magnitudes = Array.from(snapshot.magnitudes);
    }
    return magnitudes;
  }, [source]);

  const handleExport = useCallback(() => {
    const magnitudes = getMagnitudes();

    if (magnitudes.length === 0 || magnitudes.every((m) => m === 0)) {
      setStatus(t('spectrumExport.noData'));
      setTimeout(() => setStatus(null), 2000);
      return;
    }

    try {
      exportSpectrum(magnitudes, { format, includeMetadata: true });
      setStatus(t('spectrumExport.success'));
      setTimeout(() => setStatus(null), 2000);
    } catch (err) {
      console.error('Export failed:', err);
      setStatus(t('spectrumExport.error'));
      setTimeout(() => setStatus(null), 2000);
    }
  }, [getMagnitudes, format, t]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>{t('spectrumExport.title')}</span>
      </div>

      <div className={styles.controls}>
        <div className={styles.formatSelector}>
          <label className={styles.radio}>
            <input
              type="radio"
              name="format"
              value="csv"
              checked={format === 'csv'}
              onChange={() => setFormat('csv')}
            />
            <span>CSV</span>
          </label>
          <label className={styles.radio}>
            <input
              type="radio"
              name="format"
              value="json"
              checked={format === 'json'}
              onChange={() => setFormat('json')}
            />
            <span>JSON</span>
          </label>
        </div>

        <button className={styles.exportButton} onClick={handleExport}>
          📥 {t('spectrumExport.export')}
        </button>
      </div>

      {status && <div className={styles.status}>{status}</div>}
    </div>
  );
}
