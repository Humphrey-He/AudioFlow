import { useRef } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { useVisualizationRenderer } from './useVisualizationRenderer';
import styles from './SpectrumCanvas.module.css';

export function SpectrumCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visualizationMode = usePlayerStore((s) => s.visualizationMode);
  const waterfallConfig = usePlayerStore((s) => s.waterfallConfig);
  const polarConfig = usePlayerStore((s) => s.polarConfig);
  const source = usePlayerStore((s) => s.source);

  // Use unified renderer for all modes
  useVisualizationRenderer(canvasRef, {
    mode: visualizationMode,
    waterfall: waterfallConfig,
    polar: polarConfig,
    source,
  });

  return (
    <div className={styles.container}>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}
