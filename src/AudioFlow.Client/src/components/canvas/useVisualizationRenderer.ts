import { useEffect, useRef, useCallback } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { audioRuntime } from '@/services/audio/audioRuntime';
import { audioPlayer } from '@/services/audio/audioPlayer';
import { audioInput } from '@/services/audio/audioInput';
import { colorSchemes, type VisualizationMode } from '@/types/visualization';

interface RendererConfig {
  mode: VisualizationMode;
  source: 'system' | 'microphone' | 'file';
  waterfall: {
    frameCount: number;
    decay: number;
    colorScheme: 'fire' | 'aurora' | 'tech' | 'ocean';
  };
  polar: {
    type: 'full' | 'half';
    direction: 'cw' | 'ccw';
    minRadius: number;
    maxRadius: number;
  };
}

/**
 * Unified renderer for all visualization modes
 * Supports: spectrum, waterfall, waveform, polar
 */
export function useVisualizationRenderer(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  config: RendererConfig
) {
  const { mode, source, waterfall: waterfallConfig, polar: polarConfig } = config;
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

  const renderPolar = useCallback(
    (ctx: CanvasRenderingContext2D, magnitudes: number[], width: number, height: number) => {
      const { type, direction, minRadius, maxRadius } = polarConfig;
      const mags = magnitudes;
      const centerX = width / 2;
      const centerY = height / 2;

      // Background
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, width, height);

      const barCount = mags.length;
      const angleRange = type === 'full' ? Math.PI * 2 : Math.PI;
      const startAngle = type === 'full' ? 0 : -Math.PI / 2;

      // Calculate total energy for center display
      let totalEnergy = 0;
      for (let i = 0; i < barCount; i++) {
        totalEnergy += Math.max(0, (mags[i] + 60) / 60);
      }
      const avgEnergy = totalEnergy / barCount;

      // Draw grid circles
      ctx.strokeStyle = '#2a2a3a';
      ctx.lineWidth = 1;
      for (let r = minRadius; r <= maxRadius; r += 20) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw radial lines
      const radialLines = 8;
      for (let i = 0; i < radialLines; i++) {
        const angle = startAngle + (Math.PI * 2 * i) / radialLines;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(
          centerX + Math.cos(angle) * maxRadius,
          centerY + Math.sin(angle) * maxRadius
        );
        ctx.stroke();
      }

      // Draw frequency bars in polar coordinates
      for (let i = 0; i < barCount; i++) {
        const normalized = Math.max(0, (mags[i] + 60) / 60);
        const barLength = normalized * (maxRadius - minRadius);

        // Map frequency index to angle
        let angle = startAngle + (i / barCount) * angleRange;
        if (direction === 'ccw') {
          angle = startAngle + angleRange - (i / barCount) * angleRange;
        }

        const x1 = centerX + Math.cos(angle) * minRadius;
        const y1 = centerY + Math.sin(angle) * minRadius;
        const x2 = centerX + Math.cos(angle) * (minRadius + barLength);
        const y2 = centerY + Math.sin(angle) * (minRadius + barLength);

        // Create gradient for bar
        const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
        gradient.addColorStop(0, '#38d9a9');
        gradient.addColorStop(0.5, '#6c5ce7');
        gradient.addColorStop(1, '#e74c3c');

        ctx.strokeStyle = gradient;
        ctx.lineWidth = Math.max(1, (angleRange * minRadius) / barCount - 1);
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Glow effect for high energy
        if (effects.glow && normalized > 0.7) {
          ctx.save();
          ctx.shadowColor = '#38d9a9';
          ctx.shadowBlur = 15;
          ctx.strokeStyle = `rgba(56, 217, 169, ${normalized * 0.5})`;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          ctx.restore();
        }
      }

      // Center circle with energy
      const energyRadius = minRadius * 0.8;
      const energyGradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, energyRadius
      );
      energyGradient.addColorStop(0, `rgba(56, 217, 169, ${avgEnergy * 0.8})`);
      energyGradient.addColorStop(1, 'rgba(56, 217, 169, 0.1)');

      ctx.fillStyle = energyGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, energyRadius, 0, Math.PI * 2);
      ctx.fill();

      // Center text
      ctx.fillStyle = '#38d9a9';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        `${Math.round(avgEnergy * 100)}%`,
        centerX,
        centerY
      );

      // Frequency labels
      ctx.fillStyle = '#666';
      ctx.font = '9px monospace';
      const labels = ['20Hz', '1kHz', '10kHz'];
      const labelAngles = type === 'full'
        ? [startAngle, startAngle + angleRange * 0.35, startAngle + angleRange * 0.65]
        : [startAngle, startAngle + angleRange * 0.5, startAngle + angleRange];

      labels.forEach((label, idx) => {
        const angle = labelAngles[idx];
        const labelRadius = maxRadius + 15;
        const lx = centerX + Math.cos(angle) * labelRadius;
        const ly = centerY + Math.sin(angle) * labelRadius;
        ctx.textAlign = 'center';
        ctx.fillText(label, lx, ly);
      });

      ctx.textAlign = 'start';
    },
    [polarConfig, effects]
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
      let timeData: Uint8Array;
      if (source === 'file' && audioPlayer.getFileName()) {
        timeData = audioPlayer.getTimeDomainData();
      } else if (source === 'microphone' && audioInput.getIsActive()) {
        timeData = audioInput.getTimeDomainData();
      } else {
        timeData = audioPlayer.getTimeDomainData(); // fallback
      }
      renderWaveform(ctx, timeData, width, height);
      return;
    }

    // For spectrum, waterfall, and polar, get frequency data
    if (mode === 'spectrum' || mode === 'waterfall' || mode === 'polar') {
      // Determine data source based on selection
      if (source === 'file' && audioPlayer.getFileName()) {
        magnitudes = Array.from(audioPlayer.getFrequencyData()).map((v) => {
          // Convert 0-255 to dB scale
          return v > 0 ? 20 * Math.log10(v / 255) : -180;
        });
      } else if (source === 'microphone' && audioInput.getIsActive()) {
        magnitudes = Array.from(audioInput.getFrequencyData()).map((v) => {
          return v > 0 ? 20 * Math.log10(v / 255) : -180;
        });
      } else {
        // System audio via WebSocket
        const snapshot = audioRuntime.getSnapshot();
        magnitudes = Array.from(snapshot.magnitudes);
      }

      if (magnitudes.length === 0 || magnitudes.every((m) => m === 0)) {
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
      } else if (mode === 'polar') {
        renderPolar(ctx, magnitudes, width, height);
      } else {
        renderSpectrum(ctx, magnitudes, width, height);
      }
    }
  }, [mode, source, canvasRef, renderSpectrum, renderWaterfall, renderWaveform, renderPolar]);

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
