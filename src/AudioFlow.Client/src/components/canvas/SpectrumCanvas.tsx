import { useRef } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { useSpectrumRenderer } from './useSpectrumRenderer';
import styles from './SpectrumCanvas.module.css';
import type { AudioSnapshot } from '@/hooks/useAudioRuntime';

interface SpectrumCanvasProps {
  audio: AudioSnapshot;
}

export function SpectrumCanvas({ audio }: SpectrumCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const effects = useSettingsStore((s) => s.effects);
  const { fps } = useSpectrumRenderer({
    magnitudes: audio.magnitudes,
    effects,
    canvasRef,
  });

  return (
    <div className={styles.container}>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}
