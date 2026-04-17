import { useRef, useEffect, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { splMeter, SplReading } from '@/services/audio/splMeter';
import styles from './SplMeter.module.css';

export function SplMeterCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const [isActive, setIsActive] = useState(false);
  const [reading, setReading] = useState<SplReading | null>(null);
  const splHistoryRef = useRef<number[]>([]);

  const handleStartStop = useCallback(async () => {
    if (isActive) {
      splMeter.stop();
      setIsActive(false);
    } else {
      try {
        await splMeter.start();
        setIsActive(true);
      } catch (err) {
        console.error('Failed to start SPL meter:', err);
      }
    }
  }, [isActive]);

  const handleReset = useCallback(() => {
    splMeter.reset();
    splHistoryRef.current = [];
    setReading(null);
  }, []);

  useEffect(() => {
    splMeter.onUpdate = (newReading) => {
      setReading(newReading);

      // Update history for visualization
      splHistoryRef.current.push(newReading.current);
      if (splHistoryRef.current.length > 300) {
        splHistoryRef.current.shift();
      }
    };

    return () => {
      splMeter.onUpdate = undefined;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width - 60;
        canvas.height = 250;
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

      // SPL scale on left
      const minDb = 30;
      const maxDb = 120;
      const dbRange = maxDb - minDb;

      // Draw scale
      ctx.fillStyle = '#555';
      ctx.font = '10px monospace';
      for (let db = minDb; db <= maxDb; db += 10) {
        const y = height - ((db - minDb) / dbRange) * height;
        ctx.beginPath();
        ctx.moveTo(40, y);
        ctx.lineTo(50, y);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillText(`${db}`, 25, y + 3);
      }

      // Color zones (background)
      // Green zone (safe)
      ctx.fillStyle = 'rgba(56, 217, 169, 0.1)';
      const greenY = height - ((85 - minDb) / dbRange) * height;
      const greenH = height - ((120 - minDb) / dbRange) * height - greenY;
      ctx.fillRect(55, greenY, width - 55, greenH);

      // Yellow zone (warning)
      ctx.fillStyle = 'rgba(255, 193, 7, 0.1)';
      const yellowY = height - ((70 - minDb) / dbRange) * height;
      const yellowH = greenY - yellowY;
      ctx.fillRect(55, yellowY, width - 55, yellowH);

      // Red zone (danger)
      ctx.fillStyle = 'rgba(255, 87, 87, 0.1)';
      const redY = height - ((30 - minDb) / dbRange) * height;
      const redH = yellowY - redY;
      ctx.fillRect(55, redY, width - 55, redH);

      // Draw history
      const history = splHistoryRef.current;
      if (history.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = '#38d9a9';
        ctx.lineWidth = 2;

        for (let i = 0; i < history.length; i++) {
          const x = 55 + (i / 300) * (width - 55);
          const db = Math.max(minDb, Math.min(maxDb, history[i]));
          const y = height - ((db - minDb) / dbRange) * height;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();

        // Fill under curve
        ctx.lineTo(55 + ((history.length - 1) / 300) * (width - 55), height);
        ctx.lineTo(55, height);
        ctx.closePath();
        ctx.fillStyle = 'rgba(56, 217, 169, 0.2)';
        ctx.fill();
      }

      // Current level indicator
      if (reading) {
        const currentY = height - ((Math.max(minDb, reading.current) - minDb) / dbRange) * height;

        // Animated indicator
        const time = Date.now() / 200;
        const pulseRadius = 8 + Math.sin(time) * 2;

        ctx.beginPath();
        ctx.arc(width - 40, currentY, pulseRadius, 0, Math.PI * 2);
        ctx.fillStyle = reading.current > 85 ? '#ff6b6b' : reading.current > 70 ? '#ffc107' : '#38d9a9';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(width - 40, currentY, 12, 0, Math.PI * 2);
        ctx.strokeStyle = reading.current > 85 ? '#ff6b6b' : reading.current > 70 ? '#ffc107' : '#38d9a9';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Scale labels
      ctx.fillStyle = '#38d9a9';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('dB(A)', 5, 15);

      ctx.fillStyle = '#888';
      ctx.font = '10px monospace';
      ctx.fillText('120', 25, 12);
      ctx.fillText('30', 25, height - 3);

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationRef.current);
    };
  }, [reading]);

  return (
    <div className={styles.container}>
      <canvas ref={canvasRef} className={styles.canvas} />
      <SplControls
        isActive={isActive}
        reading={reading}
        onStartStop={handleStartStop}
        onReset={handleReset}
      />
    </div>
  );
}

interface SplControlsProps {
  isActive: boolean;
  reading: SplReading | null;
  onStartStop: () => void;
  onReset: () => void;
}

function SplControls({ isActive, reading, onStartStop, onReset }: SplControlsProps) {
  const { t } = useTranslation();

  const getLevelColor = (db: number) => {
    if (db > 85) return styles.danger;
    if (db > 70) return styles.warning;
    return styles.safe;
  };

  return (
    <div className={styles.controls}>
      <div className={styles.readings}>
        <div className={styles.readingItem}>
          <span className={styles.readingLabel}>{t('spl.current')}</span>
          <span className={`${styles.readingValue} ${reading ? getLevelColor(reading.current) : ''}`}>
            {reading ? reading.current.toFixed(1) : '--'}
          </span>
          <span className={styles.readingUnit}>dB</span>
        </div>

        <div className={styles.readingItem}>
          <span className={styles.readingLabel}>{t('spl.peak')}</span>
          <span className={`${styles.readingValue} ${reading ? getLevelColor(reading.peak) : ''}`}>
            {reading ? reading.peak.toFixed(1) : '--'}
          </span>
          <span className={styles.readingUnit}>dB</span>
        </div>

        <div className={styles.readingItem}>
          <span className={styles.readingLabel}>Leq</span>
          <span className={styles.readingValue}>
            {reading ? reading.average.toFixed(1) : '--'}
          </span>
          <span className={styles.readingUnit}>dB</span>
        </div>

        <div className={styles.readingItem}>
          <span className={styles.readingLabel}>{t('spl.min')}</span>
          <span className={styles.readingValue}>
            {reading ? reading.min.toFixed(1) : '--'}
          </span>
          <span className={styles.readingUnit}>dB</span>
        </div>

        <div className={styles.readingItem}>
          <span className={styles.readingLabel}>{t('spl.max')}</span>
          <span className={styles.readingValue}>
            {reading ? reading.max.toFixed(1) : '--'}
          </span>
          <span className={styles.readingUnit}>dB</span>
        </div>
      </div>

      <div className={styles.actions}>
        <button
          className={`${styles.button} ${isActive ? styles.stop : styles.start}`}
          onClick={onStartStop}
        >
          {isActive ? t('spl.stop') : t('spl.start')}
        </button>
        <button className={styles.resetButton} onClick={onReset}>
          {t('spl.reset')}
        </button>
      </div>

      <div className={styles.info}>
        <span className={styles.infoText}>
          {t('spl.info')}
        </span>
      </div>
    </div>
  );
}
