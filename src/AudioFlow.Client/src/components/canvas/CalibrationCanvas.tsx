import { useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlayerStore } from '@/stores/playerStore';
import { audioCalibrator } from '@/services/audio/audioCalibrator';
import styles from './CalibrationCanvas.module.css';

export function CalibrationCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  const calibrationConfig = usePlayerStore((s) => s.calibrationConfig);
  const updateCalibrationConfig = usePlayerStore((s) => s.updateCalibrationConfig);

  const handleSignalToggle = useCallback(() => {
    if (calibrationConfig.isActive) {
      audioCalibrator.stop();
      updateCalibrationConfig({ isActive: false });
    } else {
      const { isActive: _unused, ...calibratorConfig } = calibrationConfig;
      audioCalibrator.start(calibratorConfig);
      updateCalibrationConfig({ isActive: true });
    }
  }, [calibrationConfig, updateCalibrationConfig]);

  const handleSignalTypeChange = useCallback((type: 'pink-noise' | 'white-noise' | 'sine-sweep' | 'sine-static') => {
    const wasActive = calibrationConfig.isActive;
    if (wasActive) {
      audioCalibrator.stop();
    }
    updateCalibrationConfig({ signalType: type, isActive: false });
  }, [calibrationConfig.isActive, updateCalibrationConfig]);

  const handleFrequencyChange = useCallback((frequency: number) => {
    updateCalibrationConfig({ frequency });
    if (calibrationConfig.isActive && calibrationConfig.signalType === 'sine-static') {
      audioCalibrator.stop();
      const { isActive: _unused, ...calibratorConfig } = calibrationConfig;
      audioCalibrator.start({ ...calibratorConfig, frequency });
    }
  }, [calibrationConfig, updateCalibrationConfig]);

  const handleAmplitudeChange = useCallback((amplitude: number) => {
    updateCalibrationConfig({ amplitude });
    audioCalibrator.setAmplitude(amplitude);
  }, [updateCalibrationConfig]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width - 60;
        canvas.height = 320;
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

      // Grid lines
      ctx.strokeStyle = '#1a1a2a';
      ctx.lineWidth = 1;

      // Horizontal grid (dB levels)
      for (let i = 0; i <= 6; i++) {
        const y = (height / 6) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();

        // dB labels
        ctx.fillStyle = '#555';
        ctx.font = '10px monospace';
        const db = -60 + (60 / 6) * (6 - i);
        ctx.fillText(`${db.toFixed(0)} dB`, 5, y - 2);
      }

      // Vertical grid (frequency markers)
      const freqMarkers = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
      ctx.fillStyle = '#555';
      for (const freq of freqMarkers) {
        const x = (Math.log10(freq / 20) / Math.log10(20000 / 20)) * width;
        if (x > 0 && x < width) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
          ctx.fillText(freq >= 1000 ? `${freq / 1000}k` : `${freq}`, x - 10, height - 5);
        }
      }

      // Get frequency data
      const frequencyData = audioCalibrator.getFrequencyData();
      const binCount = frequencyData.length;
      const minFreq = 20;
      const maxFreq = 20000;

      // Draw frequency response curve
      ctx.beginPath();
      ctx.strokeStyle = '#38d9a9';
      ctx.lineWidth = 2;

      let started = false;
      for (let i = 0; i < binCount; i++) {
        const freq = (i / binCount) * (audioCalibrator['audioContext']?.sampleRate || 48000) / 2;
        if (freq < minFreq || freq > maxFreq) continue;

        const x = (Math.log10(freq / minFreq) / Math.log10(maxFreq / minFreq)) * width;
        const dbValue = frequencyData[i];
        const normalizedDb = dbValue / 255;
        const y = height - (normalizedDb * height * 0.9) - 10;

        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      // Fill under curve
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fillStyle = 'rgba(56, 217, 169, 0.1)';
      ctx.fill();

      // Reference line at 0dB (if we had calibration data)
      ctx.strokeStyle = '#ff6b6b';
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(0, height * 0.1);
      ctx.lineTo(width, height * 0.1);
      ctx.stroke();
      ctx.setLineDash([]);

      // Current signal indicator
      if (calibrationConfig.isActive) {
        ctx.fillStyle = '#38d9a9';
        ctx.font = '12px monospace';
        const signalInfo = calibrationConfig.signalType === 'sine-sweep'
          ? `Sweep: ${audioCalibrator.getCurrentSweepFreq().toFixed(0)} Hz`
          : calibrationConfig.signalType === 'sine-static'
            ? `Sine: ${calibrationConfig.frequency} Hz`
            : calibrationConfig.signalType === 'pink-noise'
              ? 'Pink Noise'
              : 'White Noise';
        ctx.fillText(`Playing: ${signalInfo}`, width - 150, 25);

        // Animated indicator
        const time = Date.now() / 1000;
        ctx.beginPath();
        ctx.arc(width - 170, 20, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#38d9a9';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(width - 170, 20, 8 + Math.sin(time * 4) * 2, 0, Math.PI * 2);
        ctx.strokeStyle = '#38d9a9';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Frequency labels title
      ctx.fillStyle = '#888';
      ctx.font = '11px monospace';
      ctx.fillText('20Hz', 5, height - 5);
      ctx.fillText('20kHz', width - 35, height - 5);
      ctx.fillText('Frequency Response', width / 2 - 40, height - 5);

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationRef.current);
    };
  }, [calibrationConfig]);

  return (
    <div className={styles.container}>
      <canvas ref={canvasRef} className={styles.canvas} />
      <CalibrationControls
        config={calibrationConfig}
        onToggle={handleSignalToggle}
        onSignalTypeChange={handleSignalTypeChange}
        onFrequencyChange={handleFrequencyChange}
        onAmplitudeChange={handleAmplitudeChange}
      />
    </div>
  );
}

interface CalibrationControlsProps {
  config: {
    signalType: 'pink-noise' | 'white-noise' | 'sine-sweep' | 'sine-static';
    frequency: number;
    amplitude: number;
    isActive: boolean;
  };
  onToggle: () => void;
  onSignalTypeChange: (type: 'pink-noise' | 'white-noise' | 'sine-sweep' | 'sine-static') => void;
  onFrequencyChange: (frequency: number) => void;
  onAmplitudeChange: (amplitude: number) => void;
}

function CalibrationControls({
  config,
  onToggle,
  onSignalTypeChange,
  onFrequencyChange,
  onAmplitudeChange,
}: CalibrationControlsProps) {
  const { t } = useTranslation();

  return (
    <div className={styles.controls}>
      <div className={styles.controlRow}>
        <div className={styles.controlGroup}>
          <span className={styles.label}>{t('calibration.signalType')}</span>
          <select
            className={styles.select}
            value={config.signalType}
            onChange={(e) => onSignalTypeChange(e.target.value as 'pink-noise' | 'white-noise' | 'sine-sweep' | 'sine-static')}
          >
            <option value="pink-noise">{t('calibration.pinkNoise')}</option>
            <option value="white-noise">{t('calibration.whiteNoise')}</option>
            <option value="sine-sweep">{t('calibration.sineSweep')}</option>
            <option value="sine-static">{t('calibration.sineStatic')}</option>
          </select>
        </div>

        <div className={styles.controlGroup}>
          <span className={styles.label}>{t('calibration.frequency')}</span>
          <input
            type="range"
            className={styles.range}
            min="20"
            max="20000"
            value={config.frequency}
            onChange={(e) => onFrequencyChange(parseInt(e.target.value))}
          />
          <span className={styles.value}>{config.frequency} Hz</span>
        </div>

        <div className={styles.controlGroup}>
          <span className={styles.label}>{t('calibration.amplitude')}</span>
          <input
            type="range"
            className={styles.range}
            min="0"
            max="1"
            step="0.01"
            value={config.amplitude}
            onChange={(e) => onAmplitudeChange(parseFloat(e.target.value))}
          />
          <span className={styles.value}>{(config.amplitude * 100).toFixed(0)}%</span>
        </div>

        <button
          className={`${styles.playButton} ${config.isActive ? styles.playing : ''}`}
          onClick={onToggle}
        >
          {config.isActive ? t('calibration.stop') : t('calibration.start')}
        </button>
      </div>

      <div className={styles.info}>
        <span className={styles.infoText}>{t('calibration.info')}</span>
      </div>
    </div>
  );
}
