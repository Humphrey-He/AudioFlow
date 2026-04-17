import { useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlayerStore } from '@/stores/playerStore';
import { audioPlayer } from '@/services/audio/audioPlayer';
import { audioInput } from '@/services/audio/audioInput';
import { audioRuntime } from '@/services/audio/audioRuntime';
import { useSettingsStore } from '@/stores/settingsStore';
import styles from './ComparisonCanvas.module.css';

export function ComparisonCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvas2Ref = useRef<HTMLCanvasElement>(null);
  const peakValuesRef = useRef<number[]>(new Array(512).fill(-180));
  const peakHoldTimesRef = useRef<number[]>(new Array(512).fill(0));
  // Smoothing buffer for average spectrum
  const smoothedRef = useRef<number[]>(new Array(512).fill(-180));
  const smoothedAlphaRef = useRef(0.95); // Smoothing factor (0-1, higher = more smoothing)

  const visualizationMode = usePlayerStore((s) => s.visualizationMode);
  const source = usePlayerStore((s) => s.source);
  const comparisonConfig = usePlayerStore((s) => s.comparisonConfig);
  const effects = useSettingsStore((s) => s.effects);

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

  // Update smoothed average when new magnitudes arrive
  const updateSmoothed = useCallback((magnitudes: number[]) => {
    const smoothed = smoothedRef.current;
    const alpha = smoothedAlphaRef.current;
    for (let i = 0; i < Math.min(magnitudes.length, smoothed.length); i++) {
      // Exponential moving average: smoothed = alpha * smoothed + (1 - alpha) * current
      smoothed[i] = alpha * smoothed[i] + (1 - alpha) * magnitudes[i];
    }
  }, []);

  const renderSpectrum = useCallback((
    ctx: CanvasRenderingContext2D,
    magnitudes: number[],
    width: number,
    height: number,
    label: string,
    color: string,
    drawPeaks: boolean = false
  ) => {
    const mags = magnitudes;
    const barCount = mags.length;
    const barWidth = width / barCount;

    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = color;
    ctx.font = '12px monospace';
    ctx.fillText(label, 10, 20);

    for (let i = 0; i < barCount; i++) {
      const magnitude = mags[i];
      const normalized = Math.max(0, (magnitude + 60) / 60);
      const barHeight = normalized * height;
      const x = i * barWidth + barWidth * 0.1;

      const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;

      ctx.beginPath();
      ctx.roundRect(x, height - barHeight, barWidth * 0.8, barHeight, 2);
      ctx.fill();

      if (drawPeaks) {
        const currentTime = performance.now();
        if (magnitude > peakValuesRef.current[i]) {
          peakValuesRef.current[i] = magnitude;
          peakHoldTimesRef.current[i] = currentTime;
        }

        const holdTime = currentTime - peakHoldTimesRef.current[i];
        let displayPeak = peakValuesRef.current[i];

        if (holdTime > 1500) {
          const decayProgress = Math.min(1, (holdTime - 1500) / 500);
          displayPeak = peakValuesRef.current[i] + (magnitude - peakValuesRef.current[i]) * decayProgress;
          if (decayProgress >= 1) {
            peakValuesRef.current[i] = magnitude;
          }
        }

        if (displayPeak > -180) {
          const peakNormalized = Math.max(0, (displayPeak + 60) / 60);
          const peakY = height - peakNormalized * height;

          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(x + (barWidth * 0.8) / 2, peakY, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.strokeStyle = '#2a2a3a';
    for (let i = 0; i < 5; i++) {
      const y = (height / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }, []);

  const renderDifference = useCallback((
    ctx: CanvasRenderingContext2D,
    current: number[],
    smoothed: number[],
    width: number,
    height: number
  ) => {
    const barCount = Math.min(current.length, smoothed.length);
    const barWidth = width / barCount;
    const centerY = height / 2;

    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#888';
    ctx.font = '12px monospace';
    ctx.fillText('Difference (Current - Avg)', 10, 20);

    // Draw center line (zero difference)
    ctx.strokeStyle = '#444';
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    // Draw difference bars
    for (let i = 0; i < barCount; i++) {
      const diff = current[i] - smoothed[i];
      const normalized = Math.max(-1, Math.min(1, diff / 30)); // Normalize to +/-30dB range
      const barHeight = Math.abs(normalized) * (height / 2);
      const x = i * barWidth + barWidth * 0.1;

      // Color based on positive (above avg) or negative (below avg)
      const color = diff > 0 ? '#38d9a9' : '#e74c3c';
      ctx.fillStyle = color;

      if (diff > 0) {
        // Above average - bar goes up from center
        ctx.fillRect(x, centerY - barHeight, barWidth * 0.8, barHeight);
      } else {
        // Below average - bar goes down from center
        ctx.fillRect(x, centerY, barWidth * 0.8, barHeight);
      }
    }
  }, []);

  useEffect(() => {
    if (visualizationMode !== 'comparison') return;

    let animationId: number;

    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      const canvas2 = canvas2Ref.current;
      if (!canvas || !canvas2) return;

      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        const width = rect.width - 60;
        const halfWidth = (width - 20) / 2;
        canvas.width = halfWidth;
        canvas2.width = halfWidth;
        canvas.height = 250;
        canvas2.height = 250;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const animate = () => {
      const canvas = canvasRef.current;
      const canvas2 = canvas2Ref.current;
      if (!canvas || !canvas2) return;

      const ctx1 = canvas.getContext('2d');
      const ctx2 = canvas2.getContext('2d');
      if (!ctx1 || !ctx2) return;

      const magnitudes = getMagnitudes();

      if (magnitudes.length === 0 || magnitudes.every((m) => m === 0)) {
        animationId = requestAnimationFrame(animate);
        return;
      }

      // Update smoothed average with current frame
      updateSmoothed(magnitudes);

      // Use real smoothed values instead of fake generated data
      const smoothed = smoothedRef.current;

      if (comparisonConfig.showDifference) {
        // Show current vs difference
        renderSpectrum(ctx1, magnitudes, canvas.width, canvas.height, 'Current', '#38d9a9', effects.peak);
        renderDifference(ctx2, magnitudes, smoothed, canvas2.width, canvas2.height);
      } else {
        // Show current vs smoothed average
        renderSpectrum(ctx1, magnitudes, canvas.width, canvas.height, 'Current', '#38d9a9', effects.peak);
        renderSpectrum(ctx2, smoothed, canvas2.width, canvas2.height, 'Average', '#6c5ce7', false);
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, [visualizationMode, source, comparisonConfig, getMagnitudes, renderSpectrum, renderDifference, updateSmoothed, effects.peak]);

  if (visualizationMode !== 'comparison') {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.canvases}>
        <div className={styles.canvasWrapper}>
          <canvas ref={canvasRef} className={styles.canvas} />
        </div>
        <div className={styles.canvasWrapper}>
          <canvas ref={canvas2Ref} className={styles.canvas} />
        </div>
      </div>
      <ComparisonControls />
    </div>
  );
}

function ComparisonControls() {
  const { t } = useTranslation();
  const comparisonConfig = usePlayerStore((s) => s.comparisonConfig);
  const updateComparisonConfig = usePlayerStore((s) => s.updateComparisonConfig);

  return (
    <div className={styles.controls}>
      <div className={styles.controlGroup}>
        <span className={styles.label}>{t('comparison.splitView')}</span>
        <select
          value={comparisonConfig.splitView}
          onChange={(e) => updateComparisonConfig({ splitView: e.target.value as 'horizontal' | 'vertical' })}
          className={styles.select}
        >
          <option value="horizontal">{t('comparison.horizontal')}</option>
          <option value="vertical">{t('comparison.vertical')}</option>
        </select>
      </div>

      <div className={styles.controlGroup}>
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={comparisonConfig.showDifference}
            onChange={(e) => updateComparisonConfig({ showDifference: e.target.checked })}
          />
          <span>{t('comparison.showDiff')}</span>
        </label>
      </div>
    </div>
  );
}
