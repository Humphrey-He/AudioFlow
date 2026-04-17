import type { WebSocketService } from './websocket.types';
import type { ConnectionStatus } from '@/types/common';
import type { IncomingMessage } from './protocol';
import type { SpectrumFrame } from './protocol';

/**
 * MockWebSocketService - generates fake spectrum data for development.
 * Phase 1: This allows frontend to work without backend connection.
 */
export class MockWebSocketService implements WebSocketService {
  private listeners: Map<string, Set<(data: IncomingMessage | ConnectionStatus) => void>> = new Map();
  private status: ConnectionStatus = 'disconnected';
  private timer: ReturnType<typeof setInterval> | null = null;
  private frameCount = 0;

  connect(): void {
    this.setStatus('connecting');
    setTimeout(() => {
      this.setStatus('connected');
      this.startMockData();
    }, 500);
  }

  disconnect(): void {
    this.stopMockData();
    this.setStatus('disconnected');
  }

  send(_data: unknown): void {
    // No-op for mock
  }

  subscribe(
    event: 'message' | 'status' | 'error',
    listener: (data: IncomingMessage | ConnectionStatus) => void
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener as (data: unknown) => void);
    return () => this.listeners.get(event)?.delete(listener as (data: unknown) => void);
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    this.emit('status', status);
  }

  private emit(event: string, data: IncomingMessage | ConnectionStatus): void {
    this.listeners.get(event)?.forEach((listener) => listener(data));
  }

  private startMockData(): void {
    this.timer = setInterval(() => {
      const magnitudes = this.generateMockMagnitudes();
      const frame: SpectrumFrame = {
        type: 'spectrum_frame',
        frame: this.frameCount++,
        timestamp: new Date().toISOString(),
        magnitudes,
      };
      this.emit('message', frame);
    }, 50); // ~20fps
  }

  private stopMockData(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private generateMockMagnitudes(): number[] {
    const magnitudes: number[] = [];
    const time = Date.now() / 1000;

    for (let i = 0; i < 512; i++) {
      // Simulate typical spectrum with bass emphasis
      const freq = i / 512;
      let mag = -60;

      // Bass boost
      if (freq < 0.1) {
        mag = -30 + Math.sin(time * 2 + freq * 20) * 15 + Math.random() * 5;
      }
      // Mids
      else if (freq < 0.4) {
        mag = -40 + Math.sin(time * 3 + freq * 30) * 20 + Math.random() * 8;
      }
      // Highs
      else {
        mag = -50 + Math.sin(time * 4 + freq * 50) * 15 + Math.random() * 10;
      }

      // Add some peaks
      if (Math.random() > 0.95) {
        mag = -15 + Math.random() * 10;
      }

      magnitudes.push(Math.max(-180, Math.min(0, mag)));
    }

    return magnitudes;
  }
}

export const mockWebsocketService = new MockWebSocketService();
