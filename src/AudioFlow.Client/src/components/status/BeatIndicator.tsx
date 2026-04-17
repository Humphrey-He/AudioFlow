import { useEffect, useState, useRef } from 'react';
import { beatDetector, type BeatDetectionResult } from '@/services/audio/beatDetector';
import { audioPlayer } from '@/services/audio/audioPlayer';
import { audioInput } from '@/services/audio/audioInput';
import { audioRuntime } from '@/services/audio/audioRuntime';
import { usePlayerStore } from '@/stores/playerStore';
import styles from './BeatIndicator.module.css';

export function BeatIndicator() {
  const source = usePlayerStore((s) => s.source);
  const [result, setResult] = useState<BeatDetectionResult>({
    bpm: 0,
    isOnBeat: false,
    confidence: 0,
  });
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const detectBeat = () => {
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
        const detection = beatDetector.detect(magnitudes);
        setResult(detection);
      }

      animationRef.current = requestAnimationFrame(detectBeat);
    };

    detectBeat();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [source]);

  if (result.bpm === 0 || result.confidence < 0.3) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={`${styles.indicator} ${result.isOnBeat ? styles.onBeat : ''}`}>
        <span className={styles.bpm}>{result.bpm}</span>
        <span className={styles.label}>BPM</span>
      </div>
      <div className={styles.confidence}>
        <span
          className={styles.confidenceBar}
          style={{ width: `${result.confidence * 100}%` }}
        />
      </div>
    </div>
  );
}
