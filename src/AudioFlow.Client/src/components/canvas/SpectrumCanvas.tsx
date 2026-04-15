import { useRef } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { useVisualizationRenderer } from './useVisualizationRenderer';
import styles from './SpectrumCanvas.module.css';

export function SpectrumCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visualizationMode = usePlayerStore((s) => s.visualizationMode);

  // Use unified renderer for all modes
  useVisualizationRenderer(canvasRef, {
    mode: visualizationMode,
    waterfall: {
      frameCount: 80,
      decay: 0.92,
      colorScheme: 'fire',
    },
    effects: {
      glow: false,
      reflection: false,
      peak: false,
      pulse: false,
      centerLine: false,
    },
  });

  return (
    <div className={styles.container}>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}
