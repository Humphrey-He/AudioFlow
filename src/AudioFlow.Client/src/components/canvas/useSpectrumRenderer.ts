import { useEffect, useRef, useCallback } from 'react';
import { audioRuntime } from '@/services/audio/audioRuntime';
import type { EffectsState } from '@/stores/settingsStore';

interface RendererOptions {
  effects: EffectsState;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

/**
 * useSpectrumRenderer - manages Canvas rendering loop
 *
 * Key principle (Phase 2):
 * - Renderer reads directly from audioRuntime via RAF
 * - Does NOT go through React state
 * - Returns FPS via ref for external polling
 */
export function useSpectrumRenderer({ effects, canvasRef }: RendererOptions) {
  const peakValuesRef = useRef<number[]>(new Array(512).fill(-180));
  const peakHoldTimesRef = useRef<number[]>(new Array(512).fill(0));
  const lowFreqEnergyRef = useRef(0);
  const pulsePhaseRef = useRef(0);
  const fpsRef = useRef<{ count: number; lastTime: number; fps: number }>({ count: 0, lastTime: 0, fps: 0 });

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Read directly from runtime (no React state involved)
    const snapshot = audioRuntime.getSnapshot();
    const mags = Array.from(snapshot.magnitudes);
    const version = snapshot.version;

    // FPS calculation
    const now = performance.now();
    fpsRef.current.count = (fpsRef.current.count || 0) + 1;
    fpsRef.current.lastTime = fpsRef.current.lastTime || now;
    if (now - fpsRef.current.lastTime >= 1000) {
      fpsRef.current.fps = Math.round(
        (fpsRef.current.count * 1000) / (now - fpsRef.current.lastTime)
      );
      fpsRef.current.count = 0;
      fpsRef.current.lastTime = now;
    }

    const width = canvas.width;
    const height = canvas.height;

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

    if (mags.length === 0 || (version === 0 && mags.every((m) => m === 0))) {
      // Draw placeholder bars
      ctx.fillStyle = '#2a2a3a';
      for (let i = 0; i < 60; i++) {
        const x = i * (width / 60);
        const barHeight = height * 0.1;
        ctx.fillRect(x, height - barHeight, width / 60 - 2, barHeight);
      }
      return;
    }

    const barCount = mags.length;
    const barWidth = width / barCount;

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

      // Main bar gradient
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

    // Grid lines
    ctx.strokeStyle = '#2a2a3a';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const y = (height / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Frequency labels
    ctx.fillStyle = '#666';
    ctx.font = '10px monospace';
    const labels = ['20Hz', '100Hz', '1kHz', '10kHz', '20kHz'];
    labels.forEach((label, i) => {
      const x = (width / 4) * i;
      ctx.fillText(label, x, height - 5);
    });
  }, [effects, canvasRef]);

  useEffect(() => {
    let animationId: number;
    let lastVersion = -1;

    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width - 60;
        canvas.height = 300;
        // Reset peak tracking on resize
        peakValuesRef.current = new Array(512).fill(-180);
        peakHoldTimesRef.current = new Array(512).fill(0);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const render = () => {
      const currentVersion = audioRuntime.getVersion();
      if (currentVersion !== lastVersion) {
        lastVersion = currentVersion;
        drawFrame();
      }
      animationId = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [drawFrame, canvasRef]);

  return {
    fps: fpsRef.current.fps,
    fpsRef,
  };
}
