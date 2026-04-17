import { useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlayerStore } from '@/stores/playerStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { audioRuntime } from '@/services/audio/audioRuntime';
import { audioPlayer } from '@/services/audio/audioPlayer';
import { audioInput } from '@/services/audio/audioInput';
import styles from './MixCanvas.module.css';

export function MixCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const peakValuesRef = useRef<Map<string, number[]>>(new Map());
  const peakHoldTimesRef = useRef<Map<string, number[]>>(new Map());

  const visualizationMode = usePlayerStore((s) => s.visualizationMode);
  const mixConfig = usePlayerStore((s) => s.mixConfig);
  const source = usePlayerStore((s) => s.source);
  const effects = useSettingsStore((s) => s.effects);

  const getMagnitudes = useCallback((sourceType: string) => {
    let magnitudes: number[] = [];
    if (sourceType === 'file' && audioPlayer.getFileName()) {
      magnitudes = Array.from(audioPlayer.getFrequencyData()).map((v) => {
        return v > 0 ? 20 * Math.log10(v / 255) : -180;
      });
    } else if (sourceType === 'microphone' && audioInput.getIsActive()) {
      magnitudes = Array.from(audioInput.getFrequencyData()).map((v) => {
        return v > 0 ? 20 * Math.log10(v / 255) : -180;
      });
    } else {
      const snapshot = audioRuntime.getSnapshot();
      magnitudes = Array.from(snapshot.magnitudes);
    }
    return magnitudes;
  }, []);

  useEffect(() => {
    if (visualizationMode !== 'mix') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width - 60;
        canvas.height = 300;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const animate = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Background
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, width, height);

      const visibleSources = mixConfig.sources.filter((s) => s.visible);
      const barCount = 64;
      const barWidth = width / barCount;

      // Initialize peak tracking for each source
      for (const src of visibleSources) {
        if (!peakValuesRef.current.has(src.id)) {
          peakValuesRef.current.set(src.id, new Array(barCount).fill(-180));
        }
        if (!peakHoldTimesRef.current.has(src.id)) {
          peakHoldTimesRef.current.set(src.id, new Array(barCount).fill(0));
        }
      }

      // Draw bars for each source
      for (const src of visibleSources) {
        const magnitudes = getMagnitudes(src.type);
        if (magnitudes.length === 0) continue;

        const step = Math.max(1, Math.floor(magnitudes.length / barCount));
        const sampledMags: number[] = [];
        for (let i = 0; i < barCount; i++) {
          const idx = Math.min(i * step, magnitudes.length - 1);
          sampledMags.push(magnitudes[idx] || -180);
        }

        const peaks = peakValuesRef.current.get(src.id)!;
        const peakTimes = peakHoldTimesRef.current.get(src.id)!;

        for (let i = 0; i < barCount; i++) {
          const magnitude = sampledMags[i];
          const normalized = Math.max(0, (magnitude + 60) / 60);
          const barHeight = normalized * height;
          const x = i * barWidth;

          // Draw bar
          const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
          gradient.addColorStop(0, src.color);
          gradient.addColorStop(1, 'transparent');
          ctx.fillStyle = gradient;
          ctx.globalAlpha = mixConfig.layout === 'overlay' ? 0.7 : 1;
          ctx.beginPath();
          ctx.roundRect(x, height - barHeight, barWidth - 1, barHeight, 2);
          ctx.fill();

          // Peak hold
          if (effects.peak) {
            const currentTime = performance.now();
            if (magnitude > peaks[i]) {
              peaks[i] = magnitude;
              peakTimes[i] = currentTime;
            }

            const holdTime = currentTime - peakTimes[i];
            let displayPeak = peaks[i];
            if (holdTime > 1500) {
              const decayProgress = Math.min(1, (holdTime - 1500) / 500);
              displayPeak = peaks[i] + (magnitude - peaks[i]) * decayProgress;
              if (decayProgress >= 1) {
                peaks[i] = magnitude;
              }
            }

            if (displayPeak > -180) {
              const peakNormalized = Math.max(0, (displayPeak + 60) / 60);
              const peakY = height - peakNormalized * height;
              ctx.globalAlpha = 1;
              ctx.fillStyle = src.color;
              ctx.beginPath();
              ctx.arc(x + (barWidth - 1) / 2, peakY, 2, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }

      ctx.globalAlpha = 1;

      // Grid
      ctx.strokeStyle = '#2a2a3a';
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        const y = (height / 5) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Labels
      ctx.fillStyle = '#666';
      ctx.font = '10px monospace';
      const labels = ['20Hz', '100Hz', '1kHz', '10kHz', '20kHz'];
      labels.forEach((label, i) => {
        const x = (width / 4) * i;
        ctx.fillText(label, x, height - 5);
      });

      // Source legend
      let legendX = 5;
      for (const src of visibleSources) {
        ctx.fillStyle = src.color;
        ctx.fillRect(legendX, 5, 12, 12);
        ctx.fillStyle = '#888';
        ctx.font = '10px monospace';
        ctx.fillText(src.name, legendX + 16, 15);
        legendX += 80;
      }

      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [visualizationMode, mixConfig, source, effects, getMagnitudes]);

  if (visualizationMode !== 'mix') {
    return null;
  }

  return (
    <div className={styles.container}>
      <canvas ref={canvasRef} className={styles.canvas} />
      <MixControls />
    </div>
  );
}

function MixControls() {
  const { t } = useTranslation();
  const mixConfig = usePlayerStore((s) => s.mixConfig);
  const updateMixConfig = usePlayerStore((s) => s.updateMixConfig);

  const toggleSourceVisibility = (id: string) => {
    const sources = mixConfig.sources.map((s) =>
      s.id === id ? { ...s, visible: !s.visible } : s
    );
    updateMixConfig({ sources });
  };

  const changeLayout = (layout: 'stacked' | 'side-by-side' | 'overlay') => {
    updateMixConfig({ layout });
  };

  return (
    <div className={styles.controls}>
      <div className={styles.controlGroup}>
        <span className={styles.label}>{t('mix.sources')}</span>
        <div className={styles.sourceList}>
          {mixConfig.sources.map((source) => (
            <label
              key={source.id}
              className={`${styles.sourceItem} ${!source.visible ? styles.inactive : ''}`}
            >
              <input
                type="checkbox"
                checked={source.visible}
                onChange={() => toggleSourceVisibility(source.id)}
              />
              <span
                className={styles.sourceColor}
                style={{ backgroundColor: source.color }}
              />
              <span className={styles.sourceName}>{source.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div className={styles.controlGroup}>
        <span className={styles.label}>{t('mix.layout')}</span>
        <select
          className={styles.select}
          value={mixConfig.layout}
          onChange={(e) => changeLayout(e.target.value as 'stacked' | 'side-by-side' | 'overlay')}
        >
          <option value="overlay">{t('mix.overlay')}</option>
          <option value="side-by-side">{t('mix.sideBySide')}</option>
        </select>
      </div>
    </div>
  );
}
