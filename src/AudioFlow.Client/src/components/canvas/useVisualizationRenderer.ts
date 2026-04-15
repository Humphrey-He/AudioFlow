import { useEffect, useRef, useCallback } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { audioRuntime } from '@/services/audio/audioRuntime';
import { audioPlayer } from '@/services/audio/audioPlayer';
import { colorSchemes, type VisualizationMode } from '@/types/visualization';

interface RendererConfig {
  mode: VisualizationMode;
  waterfall: {
    frameCount: number;
    decay: number;
    colorScheme: 'fire' | 'aurora' | 'tech' | 'ocean';
  };
}

/**
 * Unified renderer for all visualization modes
 * Supports: spectrum, waterfall, waveform
 */
export function useVisualizationRenderer(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  config: RendererConfig
) {
  const { mode, waterfall: waterfallConfig } = config;
  const effects = useSettingsStore((s) => s.effects);

  // Refs for rendering state
  const peakValuesRef = useRef<number[]>(new Array(512).fill(-180));
  const peakHoldTimesRef = useRef<number[]>(new Array(512).fill(0));
  const lowFreqEnergyRef = useRef(0);
  const pulsePhaseRef = useRef(0);
  const fpsRef = useRef({ count: 0, lastTime: performance.now(), fps: 0 });

  // Waterfall-specific state
  const waterfallHistoryRef = useRef<number[][]>([]);

  const renderSpectrum = useCallback(
    (ctx: CanvasRenderingContext2D, magnitudes: number[], width: number, height: number) => {
      const mags = magnitudes;
      const barCount = mags.length;
      const barWidth = width / barCount;

      // Background pulse
      if (effects.pulse && mags.length > 0) {
        const lowFreqCount = Math.floor(mags.length * 0.1);
        let lowSum = 0;
        for (let i = 0; i < lowFreqCount; i++) {
          lowSum += Math.max(0, (mags[i] + 60) / 60);
        }
        lowFreqEnergyRef.current = lowSum / lowFreqCount;
        pulsePhaseRef.current = (pulsePhaseRef.current + 0.05) % (Math.PI * 2);
        const pulseIntensity = 0.15 * lowFreqEnergyRef.current * (0.5 + 0.5 * Math.sin(pulsePhaseRef.current));
        const r = Math.floor(0x0a + pulseIntensity * 0x08);
        const g = Math.floor(0x0a + pulseIntensity * 0x0a);
        const b = Math.floor(0x0f + pulseIntensity * 0x08);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(0, 0, width, height);
      } else {
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, width, height);
      }

      // Draw reflections
      if (effects.reflection) {
        ctx.save();
        ctx.globalAlpha = 0.15;
        for (let i = 0; i < barCount; i++) {
          const normalized = Math.max(0, (mags[i] + 60) / 60);
          const barHeight = normalized * height;
          const reflectionHeight = barHeight * 0.3;
          const x = i * barWidth;

          const gradient = ctx.createLinearGradient(0, height, 0, height + reflectionHeight);
          gradient.addColorStop(0, '#38d9a9');
          gradient.addColorStop(1, 'transparent');
          ctx.fillStyle = gradient;
          ctx.fillRect(x, height + 10, barWidth - 1, reflectionHeight);
        }
        ctx.restore();
      }

      // Draw bars
      for (let i = 0; i < barCount; i++) {
        const magnitude = mags[i];
        const normalized = Math.max(0, (magnitude + 60) / 60);
        const barHeight = normalized * height;
        const x = i * barWidth;

        const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
        gradient.addColorStop(0, '#38d9a9');
        gradient.addColorStop(0.5, '#6c5ce7');
        gradient.addColorStop(1, '#e74c3c');
        ctx.fillStyle = gradient;

        ctx.beginPath();
        ctx.roundRect(x, height - barHeight, barWidth - 1, barHeight, 3);
        ctx.fill();

        // Glow effect
        if (effects.glow && magnitude > -20) {
          const glowIntensity = Math.min(1, (magnitude + 20) / 40);
          ctx.save();
          ctx.shadowColor = '#38d9a9';
          ctx.shadowBlur = 15 * glowIntensity;
          ctx.fillStyle = `rgba(56, 217, 169, ${glowIntensity * 0.8})`;
          ctx.fillRect(x, height - barHeight, barWidth - 1, 4);
          ctx.restore();
        }

        // Peak hold
        if (effects.peak) {
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

            ctx.save();
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#38d9a9';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(x + (barWidth - 1) / 2, peakY, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
      }

      // Center line
      if (effects.centerLine) {
        ctx.save();
        ctx.strokeStyle = 'rgba(108, 92, 231, 0.6)';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#6c5ce7';
        ctx.shadowBlur = 10;
        ctx.beginPath();

        for (let i = 0; i < barCount; i++) {
          const normalized = Math.max(0, (mags[i] + 60) / 60);
          const barHeight = normalized * height;
          const y = height - barHeight / 2;
          const x = i * barWidth + (barWidth - 1) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
        ctx.restore();
      }

      // Grid and labels
      ctx.strokeStyle = '#2a2a3a';
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        const y = (height / 5) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      ctx.fillStyle = '#666';
      ctx.font = '10px monospace';
      const labels = ['20Hz', '100Hz', '1kHz', '10kHz', '20kHz'];
      labels.forEach((label, i) => {
        const x = (width / 4) * i;
        ctx.fillText(label, x, height - 5);
      });
    },
    [effects]
  );

  const renderWaterfall = useCallback(
    (ctx: CanvasRenderingContext2D, magnitudes: number[], width: number, height: number) => {
      const { frameCount, decay, colorScheme } = waterfallConfig;
      const scheme = colorSchemes[colorScheme];
      const mags = magnitudes;

      // Shift existing history down
      const history = waterfallHistoryRef.current;
      if (history.length >= frameCount) {
        history.shift();
      }

      // Normalize current frame and add to history
      const normalizedFrame = mags.map((m) => Math.max(0, Math.min(1, (m + 60) / 60)));
      history.push(normalizedFrame);

      // Clear canvas
      ctx.fillStyle = scheme.bg;
      ctx.fillRect(0, 0, width, height);

      // Draw waterfall from bottom (oldest) to top (newest)
      const rowHeight = height / frameCount;

      for (let row = 0; row < history.length; row++) {
        const frame = history[row];
        const y = height - (row + 1) * rowHeight;

        // Apply decay based on age (older = more faded)
        const age = history.length - row - 1;
        const ageDecay = Math.pow(decay, age);

        for (let i = 0; i < frame.length; i++) {
          const x = (i / frame.length) * width;
          const barWidth = width / frame.length;
          const value = frame[i] * ageDecay;

          if (value > 0.05) {
            // Color based on value
            let color;
            if (value > 0.7) {
              color = scheme.high;
            } else if (value > 0.4) {
              color = scheme.mid;
            } else {
              color = scheme.low;
            }

            ctx.fillStyle = color;
            ctx.globalAlpha = value * 0.8;
            ctx.fillRect(x, y, barWidth, rowHeight + 1);
          }
        }
      }

      ctx.globalAlpha = 1;

      // Frequency labels
      ctx.fillStyle = '#666';
      ctx.font = '10px monospace';
      const labels = ['20Hz', '100Hz', '1kHz', '10kHz', '20kHz'];
      labels.forEach((label, i) => {
        const x = (width / 4) * i;
        ctx.fillText(label, x, height - 5);
      });

      // Time indicator
      ctx.fillStyle = '#444';
      ctx.font = '9px monospace';
      ctx.fillText(`${frameCount}f history`, 5, 15);
    },
    [waterfallConfig]
  );

  const renderWaveform = useCallback(
    (ctx: CanvasRenderingContext2D, timeData: Uint8Array, width: number, height: number) => {
      const data = timeData;

      // Background
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, width, height);

      // Draw center line
      ctx.strokeStyle = '#2a2a3a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      // Draw waveform
      ctx.strokeStyle = '#38d9a9';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#38d9a9';
      ctx.shadowBlur = 10;
      ctx.beginPath();

      const sliceWidth = width / data.length;
      let x = 0;

      for (let i = 0; i < data.length; i++) {
        const v = data[i] / 128.0;
        const y = (v * height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.stroke();
      ctx.shadowBlur = 0;

      // Grid
      ctx.strokeStyle = '#2a2a3a';
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
      ctx.fillText('Time Domain', 5, height - 5);
    },
    []
  );

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // FPS calculation
    const now = performance.now();
    fpsRef.current.count++;
    if (now - fpsRef.current.lastTime >= 1000) {
      fpsRef.current.fps = Math.round(
        (fpsRef.current.count * 1000) / (now - fpsRef.current.lastTime)
      );
      fpsRef.current.count = 0;
      fpsRef.current.lastTime = now;
    }

    // Get data based on mode and source
    let magnitudes: number[] = [];

    if (mode === 'waveform') {
      const timeData = audioPlayer.getTimeDomainData();
      renderWaveform(ctx, timeData, width, height);
      return;
    }

    // For spectrum and waterfall, get frequency data
    if (mode === 'spectrum' || mode === 'waterfall') {
      // Try audio player first (for file playback)
      if (audioPlayer.getFileName()) {
        magnitudes = Array.from(audioPlayer.getFrequencyData()).map((v) => {
          // Convert 0-255 to dB scale
          return v > 0 ? 20 * Math.log10(v / 255) : -180;
        });
      } else {
        // Fall back to runtime data
        const snapshot = audioRuntime.getSnapshot();
        magnitudes = Array.from(snapshot.magnitudes);
      }

      if (mags.length === 0 || mags.every((m) => m === 0)) {
        // Placeholder
        ctx.fillStyle = '#2a2a3a';
        for (let i = 0; i < 60; i++) {
          const x = i * (width / 60);
          const barHeight = height * 0.1;
          ctx.fillRect(x, height - barHeight, width / 60 - 2, barHeight);
        }
        return;
      }

      if (mode === 'waterfall') {
        renderWaterfall(ctx, magnitudes, width, height);
      } else {
        renderSpectrum(ctx, magnitudes, width, height);
      }
    }
  }, [mode, canvasRef, renderSpectrum, renderWaterfall, renderWaveform]);

  useEffect(() => {
    let animationId: number;

    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width - 60;
        canvas.height = 300;
      }
      // Reset waterfall history on resize
      waterfallHistoryRef.current = [];
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const render = () => {
      drawFrame();
      animationId = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [drawFrame, canvasRef]);

  return { fps: fpsRef.current.fps };
}
