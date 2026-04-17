import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { audioPlayer } from '@/services/audio/audioPlayer';
import { audioInput } from '@/services/audio/audioInput';
import { audioRuntime } from '@/services/audio/audioRuntime';
import { usePlayerStore } from '@/stores/playerStore';
import styles from './PeakStats.module.css';

interface PeakStatsData {
  maxPeak: number;
  minPeak: number;
  avgPeak: number;
  sampleCount: number;
  maxPeakTime: string;
  minPeakTime: string;
  startTime: number;
}

export function PeakStats() {
  const { t } = useTranslation();
  const source = usePlayerStore((s) => s.source);
  const [stats, setStats] = useState<PeakStatsData | null>(null);
  const [isCollecting, setIsCollecting] = useState(false);
  const samplesRef = useRef<number[]>([]);
  const animationRef = useRef<number | null>(null);

  const startCollecting = () => {
    samplesRef.current = [];
    setStats({
      maxPeak: -180,
      minPeak: 0,
      avgPeak: -180,
      sampleCount: 0,
      maxPeakTime: '',
      minPeakTime: '',
      startTime: Date.now(),
    });
    setIsCollecting(true);
  };

  const stopCollecting = () => {
    setIsCollecting(false);
  };

  const resetStats = () => {
    samplesRef.current = [];
    setStats(null);
    setIsCollecting(false);
  };

  const exportCSV = () => {
    if (!stats || samplesRef.current.length === 0) return;

    const headers = ['Timestamp', 'Peak (dB)'];
    const rows = samplesRef.current.map((sample, i) => {
      const time = new Date(stats.startTime + i * 100).toISOString();
      return `${time},${sample.toFixed(2)}`;
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audioflow-stats-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!isCollecting) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const collectStats = () => {
      let magnitudes: number[] = [];

      // Get data from appropriate source
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

      if (magnitudes.length > 0 && !magnitudes.every((m) => m === 0)) {
        const peak = Math.max(...magnitudes);
        samplesRef.current.push(peak);

        const now = new Date();
        const timeStr = now.toLocaleTimeString();

        setStats((prev) => {
          if (!prev) return prev;
          return {
            maxPeak: Math.max(prev.maxPeak, peak),
            minPeak: prev.sampleCount === 0 ? peak : Math.min(prev.minPeak, peak),
            avgPeak:
              samplesRef.current.reduce((a, b) => a + b, 0) / samplesRef.current.length,
            sampleCount: samplesRef.current.length,
            maxPeakTime: peak > prev.maxPeak ? timeStr : prev.maxPeakTime,
            minPeakTime:
              prev.sampleCount === 0 || peak < prev.minPeak ? timeStr : prev.minPeakTime,
            startTime: prev.startTime,
          };
        });
      }

      animationRef.current = requestAnimationFrame(collectStats);
    };

    collectStats();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isCollecting, source]);

  const formatDuration = (ms: number): string => {
    const secs = Math.floor(ms / 1000);
    const mins = Math.floor(secs / 60);
    return `${mins}:${(secs % 60).toString().padStart(2, '0')}`;
  };

  if (!stats && !isCollecting) {
    return (
      <div className={styles.container}>
        <button className={styles.startButton} onClick={startCollecting}>
          📊 {t('peakStats.start')}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>{t('peakStats.title')}</span>
        <div className={styles.actions}>
          {isCollecting ? (
            <button className={styles.stopButton} onClick={stopCollecting}>
              ⏹ {t('peakStats.stop')}
            </button>
          ) : (
            <>
              <button className={styles.resetButton} onClick={resetStats}>
                🔄
              </button>
              <button className={styles.exportButton} onClick={exportCSV} disabled={!stats}>
                📥
              </button>
            </>
          )}
        </div>
      </div>

      {stats && (
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.label}>{t('peakStats.max')}</span>
            <span className={styles.value}>{stats.maxPeak.toFixed(1)} dB</span>
            <span className={styles.time}>{stats.maxPeakTime}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.label}>{t('peakStats.min')}</span>
            <span className={styles.value}>{stats.minPeak.toFixed(1)} dB</span>
            <span className={styles.time}>{stats.minPeakTime}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.label}>{t('peakStats.avg')}</span>
            <span className={styles.value}>{stats.avgPeak.toFixed(1)} dB</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.label}>{t('peakStats.samples')}</span>
            <span className={styles.value}>{stats.sampleCount}</span>
            <span className={styles.time}>
              {formatDuration(stats.sampleCount * 100)}
            </span>
          </div>
        </div>
      )}

      {isCollecting && (
        <div className={styles.recording}>
          <span className={styles.recordingDot} />
          {t('peakStats.recording')}
        </div>
      )}
    </div>
  );
}
