import type { ConnectionStatus } from '@/types/common';
import type { IncomingMessage } from './protocol';

export interface WebSocketService {
  connect(): void;
  disconnect(): void;
  send(data: unknown): void;
  subscribe(
    event: 'message' | 'status' | 'error',
    listener: (data: IncomingMessage | ConnectionStatus | string) => void
  ): () => void;
  getStatus(): ConnectionStatus;
}
