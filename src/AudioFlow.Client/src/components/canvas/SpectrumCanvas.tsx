import { useRef } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { useSpectrumRenderer } from './useSpectrumRenderer';
import styles from './SpectrumCanvas.module.css';

export function SpectrumCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const effects = useSettingsStore((s) => s.effects);

  // Renderer manages its own RAF loop, reads from audioRuntime directly
  useSpectrumRenderer({
    effects,
    canvasRef,
  });

  return (
    <div className={styles.container}>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}
