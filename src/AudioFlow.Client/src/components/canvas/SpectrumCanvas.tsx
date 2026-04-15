import { useRef } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { useVisualizationRenderer } from './useVisualizationRenderer';
import styles from './SpectrumCanvas.module.css';

export function SpectrumCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visualizationMode = usePlayerStore((s) => s.visualizationMode);
  const waterfallConfig = usePlayerStore((s) => s.waterfallConfig);
  const effects = usePlayerStore((s) => s); // For effects when in spectrum mode

  // Use unified renderer for all modes
  useVisualizationRenderer(canvasRef, {
    mode: visualizationMode,
    waterfall: waterfallConfig,
  });

  return (
    <div className={styles.container}>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}
