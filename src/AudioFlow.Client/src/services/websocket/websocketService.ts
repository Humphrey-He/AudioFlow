import type { ConnectionStatus } from '@/types/common';
import type { WebSocketService } from './websocket.types';
import { validateMessage, type IncomingMessage } from './protocol';

type Listener = (data: IncomingMessage | ConnectionStatus) => void;

const HEARTBEAT_INTERVAL = 30000;
const RECONNECT_BASE_DELAY = 1000;
const RECONNECT_MAX_DELAY = 30000;
const MAX_RECONNECT_ATTEMPTS = 10;

export interface ConnectionDiagnostics {
  totalMessages: number;
  invalidMessages: number;
  lastMessageTime: number | null;
  reconnectAttempts: number;
  lastError: string | null;
}

export class WebSocketServiceImpl implements WebSocketService {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<Listener>> = new Map();
  private status: ConnectionStatus = 'disconnected';
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private url: string = '';
  private reconnectAttempts: number = 0;
  private currentDelay: number = RECONNECT_BASE_DELAY;
  private isIntentionallyClosed: boolean = false;

  // Diagnostics
  public diagnostics: ConnectionDiagnostics = {
    totalMessages: 0,
    invalidMessages: 0,
    lastMessageTime: null,
    reconnectAttempts: 0,
    lastError: null,
  };

  connect(url?: string): void {
    this.url = url || this.buildWsUrl();
    this.cleanup();
    this.isIntentionallyClosed = false;
    this.setStatus('connecting');

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.setStatus('connected');
        this.reconnectAttempts = 0;
        this.currentDelay = RECONNECT_BASE_DELAY;
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        this.diagnostics.totalMessages++;
        this.diagnostics.lastMessageTime = Date.now();

        try {
          const raw = JSON.parse(event.data);
          const message = validateMessage(raw);

          if (!message) {
            this.diagnostics.invalidMessages++;
            this.diagnostics.lastError = 'Invalid message format';
            console.warn('[WS] Invalid message rejected:', raw);
            return;
          }

          this.emit('message', message);
        } catch {
          this.diagnostics.invalidMessages++;
          this.diagnostics.lastError = 'JSON parse error';
          console.warn('[WS] Failed to parse message');
        }
      };

      this.ws.onclose = () => {
        this.stopHeartbeat();
        if (this.isIntentionallyClosed) {
          this.setStatus('disconnected');
        } else {
          this.setStatus('disconnected');
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = () => {
        this.diagnostics.lastError = 'WebSocket error';
        this.setStatus('error');
      };
    } catch (err) {
      this.diagnostics.lastError = String(err);
      this.setStatus('error');
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    this.isIntentionallyClosed = true;
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

  getDiagnostics(): ConnectionDiagnostics {
    return { ...this.diagnostics };
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    this.emit('status', status);
  }

  private emit(event: string, data: IncomingMessage | ConnectionStatus): void {
    this.listeners.get(event)?.forEach((listener) => listener(data));
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.isIntentionallyClosed) return;
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this.diagnostics.lastError = 'Max reconnect attempts reached';
      this.setStatus('error');
      return;
    }

    this.reconnectAttempts++;
    this.diagnostics.reconnectAttempts = this.reconnectAttempts;
    this.setStatus('reconnecting');

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect(this.url);
      // Exponential backoff
      this.currentDelay = Math.min(this.currentDelay * 2, RECONNECT_MAX_DELAY);
    }, this.currentDelay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private cleanup(): void {
    this.stopHeartbeat();
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
