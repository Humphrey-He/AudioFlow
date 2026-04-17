import { useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlayerStore } from '@/stores/playerStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { audioRuntime } from '@/services/audio/audioRuntime';
import { audioPlayer } from '@/services/audio/audioPlayer';
import { audioInput } from '@/services/audio/audioInput';
import { instrumentDetector, type DetectedInstrument } from '@/services/audio/instrumentDetector';
import styles from './InstrumentIndicator.module.css';

export function InstrumentIndicator() {
  const { t } = useTranslation();
  const showInstruments = useSettingsStore((s) => s.effects.showInstruments);
  const source = usePlayerStore((s) => s.source);
  const visualizationMode = usePlayerStore((s) => s.visualizationMode);

  const containerRef = useRef<HTMLDivElement>(null);
  const instrumentsRef = useRef<DetectedInstrument[]>([]);
  const animationRef = useRef<number | null>(null);
  const smoothedInstrumentsRef = useRef<DetectedInstrument[]>([]);

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

  useEffect(() => {
    if (!showInstruments || visualizationMode === 'waveform') {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const updateInstruments = () => {
      const magnitudes = getMagnitudes();
      if (magnitudes.length > 0 && !magnitudes.every((m) => m === 0)) {
        const detected = instrumentDetector.detect(magnitudes, 3);

        // Smooth instrument transitions (lerp positions and mags)
        const smoothed = smoothedInstrumentsRef.current;
        for (const inst of detected) {
          const existing = smoothed.find(
            (s) => s.nameEn === inst.nameEn
          );
          if (existing) {
            existing.position += (inst.position - existing.position) * 0.3;
            existing.magnitude += (inst.magnitude - existing.magnitude) * 0.3;
          } else {
            smoothed.push({ ...inst });
          }
        }

        // Remove instruments not detected anymore
        const toRemove = smoothed.filter(
          (s) => !detected.find((d) => d.nameEn === s.nameEn)
        );
        for (const rem of toRemove) {
          rem.magnitude -= 2; // Fade out
          if (rem.magnitude < -50) {
            const idx = smoothed.indexOf(rem);
            if (idx >= 0) smoothed.splice(idx, 1);
          }
        }

        instrumentsRef.current = [...smoothed];
      }

      animationRef.current = requestAnimationFrame(updateInstruments);
    };

    updateInstruments();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [showInstruments, visualizationMode, getMagnitudes]);

  if (!showInstruments || visualizationMode === 'waveform') {
    return null;
  }

  const instruments = instrumentsRef.current;

  return (
    <div ref={containerRef} className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>{t('instrument.title')}</span>
      </div>
      <div className={styles.instruments}>
        {instruments.length === 0 ? (
          <span className={styles.noSignal}>{t('instrument.noSignal')}</span>
        ) : (
          instruments.map((inst) => (
            <div
              key={inst.nameEn}
              className={styles.instrument}
              style={{
                left: `${inst.position * 100}%`,
                opacity: Math.max(0.3, Math.min(1, (inst.magnitude + 60) / 60)),
              }}
            >
              <span className={styles.indicator} />
              <span className={styles.name}>{t(inst.name)}</span>
              <span className={styles.freq}>{inst.frequency}Hz</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
