import type { SpectrumFrame } from '../websocket/protocol';

/**
 * AudioRuntime holds high-frequency audio frame data.
 * This is NOT part of React state - it uses plain references with version tracking.
 *
 * Key design principles (Phase 2):
 * - Reuse typed arrays to avoid GC pressure
 * - Version counter for render loop to detect new frames
 * - Only keep latest frame (drop old frames on backlog)
 * - No React dependencies
 */

const DEFAULT_BIN_COUNT = 512;

export interface AudioStats {
  frameCount: number;
  peakDb: number;
  avgDb: number;
  timestamp: string;
}

export interface RuntimeSnapshot {
  magnitudes: Float32Array;
  stats: AudioStats;
  version: number;
}

export class AudioRuntime {
  // Pre-allocated buffer - reused every frame
  private magnitudesBuffer: Float32Array;
  private stats: AudioStats = {
    frameCount: 0,
    peakDb: -180,
    avgDb: -180,
    timestamp: '',
  };

  // Version increments on each update, renderer can check without subscribing
  private version: number = 0;

  // Subscribers for UI updates (low frequency)
  private listeners: Set<(runtime: AudioRuntime) => void> = new Set();

  constructor(binCount: number = DEFAULT_BIN_COUNT) {
    this.magnitudesBuffer = new Float32Array(binCount);
  }

  /**
   * Get current snapshot for rendering
   * Returns immutable-like data (copies reference to magnitudes)
   */
  getSnapshot(): RuntimeSnapshot {
    return {
      magnitudes: this.magnitudesBuffer,
      stats: { ...this.stats },
      version: this.version,
    };
  }

  /**
   * Get magnitudes as regular array for Canvas rendering
   * This is what the renderer actually uses
   */
  getMagnitudesArray(): number[] {
    return Array.from(this.magnitudesBuffer);
  }

  /**
   * Update with new frame from WebSocket
   * Only keeps latest frame, drops old ones
   */
  updateFrame(frame: SpectrumFrame): void {
    const mags = frame.magnitudes;
    const len = Math.min(mags.length, this.magnitudesBuffer.length);

    // Copy data into existing buffer (no allocation)
    for (let i = 0; i < len; i++) {
      this.magnitudesBuffer[i] = mags[i];
    }

    // Pad remaining with -180 if needed
    for (let i = len; i < this.magnitudesBuffer.length; i++) {
      this.magnitudesBuffer[i] = -180;
    }

    // Update stats
    this.stats.frameCount = frame.frame;
    this.stats.timestamp = frame.timestamp;

    if (mags.length > 0) {
      let max = -180;
      let sum = 0;
      for (let i = 0; i < mags.length; i++) {
        if (mags[i] > max) max = mags[i];
        sum += mags[i];
      }
      this.stats.peakDb = max;
      this.stats.avgDb = sum / mags.length;
    }

    this.version++;
    this.notifySubscribers();
  }

  /**
   * Subscribe to runtime updates (for UI components that need low-freq updates)
   */
  subscribe(listener: (runtime: AudioRuntime) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Reset runtime state
   */
  reset(): void {
    this.magnitudesBuffer.fill(-180);
    this.stats = {
      frameCount: 0,
      peakDb: -180,
      avgDb: -180,
      timestamp: '',
    };
    this.version++;
    this.notifySubscribers();
  }

  /**
   * Get current version - renderer can check if frame updated
   */
  getVersion(): number {
    return this.version;
  }

  private notifySubscribers(): void {
    this.listeners.forEach((listener) => listener(this));
  }
}

// Singleton instance
export const audioRuntime = new AudioRuntime();
