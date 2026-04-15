import type { SpectrumFrame } from '@/types/common';

/**
 * AudioRuntime holds high-frequency audio frame data.
 * This is NOT part of React state - it uses plain references.
 * Phase 1: This runs with mock data. Phase 2 will connect to real WebSocket.
 */
export class AudioRuntime {
  private magnitudes: Float32Array = new Float32Array(512);
  private frameCount: number = 0;
  private peakDb: number = -180;
  private avgDb: number = -180;
  private timestamp: string = '';
  private listeners: Set<(runtime: AudioRuntime) => void> = new Set();

  getSnapshot() {
    return {
      magnitudes: this.magnitudes,
      frameCount: this.frameCount,
      peakDb: this.peakDb,
      avgDb: this.avgDb,
      timestamp: this.timestamp,
    };
  }

  updateFrame(frame: SpectrumFrame): void {
    const mags = frame.magnitudes;
    this.magnitudes = new Float32Array(mags);
    this.frameCount = frame.frame;
    this.timestamp = frame.timestamp;

    if (mags.length > 0) {
      const max = Math.max(...mags);
      const sum = mags.reduce((a, b) => a + b, 0);
      this.peakDb = max;
      this.avgDb = sum / mags.length;
    }

    this.notify();
  }

  reset(): void {
    this.magnitudes = new Float32Array(512);
    this.frameCount = 0;
    this.peakDb = -180;
    this.avgDb = -180;
    this.timestamp = '';
    this.notify();
  }

  subscribe(listener: (runtime: AudioRuntime) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener(this));
  }
}

export const audioRuntime = new AudioRuntime();
