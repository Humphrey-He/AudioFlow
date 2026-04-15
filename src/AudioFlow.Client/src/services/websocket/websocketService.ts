import type { ConnectionStatus, SpectrumFrame } from '@/types/common';
import type { WebSocketService } from './websocket.types';
import { MockWebSocketService } from './websocket.mock';

type Listener = (data: SpectrumFrame | ConnectionStatus | string) => void;

const USE_MOCK = true; // Toggle for development

export class WebSocketServiceImpl implements WebSocketService {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<Listener>> = new Map();
  private status: ConnectionStatus = 'disconnected';
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private url: string = '';
  private mockService: MockWebSocketService | null = null;

  connect(url?: string): void {
    if (USE_MOCK) {
      this.mockService = new MockWebSocketService();
      const listeners: Record<string, Set<Listener>> = this.listeners as Record<string, Set<Listener>>;
      this.mockService.subscribe('message', (data) => {
        listeners['message']?.forEach((l) => l(data as SpectrumFrame));
      });
      this.mockService.subscribe('status', (data) => {
        listeners['status']?.forEach((l) => l(data as ConnectionStatus));
      });
      this.mockService.connect();
      return;
    }

    this.url = url || this.buildWsUrl();
    this.cleanup();
    this.setStatus('connecting');

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.setStatus('connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as SpectrumFrame;
          this.emit('message', data);
        } catch {
          console.error('Failed to parse WebSocket message');
        }
      };

      this.ws.onclose = () => {
        this.setStatus('disconnected');
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.setStatus('error');
      };
    } catch {
      this.setStatus('error');
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    if (this.mockService) {
      this.mockService.disconnect();
      this.mockService = null;
    }
    this.cleanup();
    this.setStatus('disconnected');
  }

  send(data: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  subscribe(
    event: 'message' | 'status' | 'error',
    listener: Listener
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    return () => this.listeners.get(event)?.delete(listener);
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    this.emit('status', status);
  }

  private emit(event: string, data: SpectrumFrame | ConnectionStatus | string): void {
    this.listeners.get(event)?.forEach((listener) => listener(data));
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.status !== 'connected') {
        this.connect(this.url);
      }
    }, 2000);
  }

  private cleanup(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.close();
      this.ws = null;
    }
  }

  private buildWsUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  }
}

export const websocketService = new WebSocketServiceImpl();
