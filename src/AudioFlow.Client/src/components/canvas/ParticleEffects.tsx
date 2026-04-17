import { useRef, useEffect, useCallback } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { audioPlayer } from '@/services/audio/audioPlayer';
import { audioInput } from '@/services/audio/audioInput';
import { audioRuntime } from '@/services/audio/audioRuntime';
import styles from './ParticleEffects.module.css';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export interface ParticleConfig {
  enabled: boolean;
  count: number;
  size: number;
  speed: number;
  energyThreshold: number;
  colorFollowBar: boolean;
}

const DEFAULT_CONFIG: ParticleConfig = {
  enabled: false,
  count: 50,
  size: 3,
  speed: 2,
  energyThreshold: 0.5,
  colorFollowBar: true,
};

export function ParticleEffects() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number | null>(null);

  const source = usePlayerStore((s) => s.source);
  const particleConfig = usePlayerStore((s) => s.particleConfig);

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

  const spawnParticle = useCallback(
    (canvas: HTMLCanvasElement, magnitude: number, barHeight: number, barX: number, colors: { low: string; mid: string; high: string }) => {
      const config = particleConfig || DEFAULT_CONFIG;
      const normalized = Math.max(0, (magnitude + 60) / 60);

      // Spawn from top of bar
      const x = barX + Math.random() * 10 - 5;
      const y = canvas.height - barHeight;

      // Velocity - generally upward with some randomness
      const vx = (Math.random() - 0.5) * config.speed;
      const vy = -Math.random() * config.speed * 2 - 1;

      // Color based on frequency position or bar height
      let color: string;
      if (config.colorFollowBar) {
        if (normalized > 0.7) {
          color = colors.high;
        } else if (normalized > 0.4) {
          color = colors.mid;
        } else {
          color = colors.low;
        }
      } else {
        color = colors.low;
      }

      const maxLife = 60 + Math.random() * 30;
      const particle: Particle = {
        x,
        y,
        vx,
        vy,
        life: maxLife,
        maxLife,
        size: config.size * (0.5 + normalized * 0.5),
        color,
      };

      particlesRef.current.push(particle);
    },
    [particleConfig]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const colors = { low: '#38d9a9', mid: '#6c5ce7', high: '#e74c3c' };

    const animate = () => {
      const config = particleConfig || DEFAULT_CONFIG;

      if (!config.enabled) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const magnitudes = getMagnitudes();
      if (magnitudes.length > 0 && !magnitudes.every((m) => m === 0)) {
        const barCount = magnitudes.length;
        const barWidth = canvas.width / barCount;
        const canvasHeight = canvas.height;

        // Spawn new particles based on energy
        for (let i = 0; i < barCount; i++) {
          const magnitude = magnitudes[i];
          const normalized = Math.max(0, (magnitude + 60) / 60);
          const barHeight = normalized * canvasHeight;
          const barX = i * barWidth;

          // Spawn particles if above threshold and not at max count
          if (normalized > config.energyThreshold && particlesRef.current.length < config.count * 2) {
            if (Math.random() < normalized * 0.3) {
              spawnParticle(canvas, magnitude, barHeight, barX, colors);
            }
          }
        }
      }

      // Update and draw particles
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        // Update
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05; // Gravity
        p.life--;

        // Calculate alpha based on life
        const alpha = p.life / p.maxLife;

        // Draw
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Remove dead particles
        if (p.life <= 0) {
          particles.splice(i, 1);
        }
      }

      // Limit total particles
      while (particles.length > config.count) {
        particles.shift();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [particleConfig, getMagnitudes, spawnParticle]);

  if (!particleConfig?.enabled) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      className={styles.canvas}
    />
  );
}
