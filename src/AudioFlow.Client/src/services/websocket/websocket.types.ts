import type { ConnectionStatus, SpectrumFrame } from '@/types/common';

export interface WebSocketService {
  connect(): void;
  disconnect(): void;
  send(data: unknown): void;
  subscribe(
    event: 'message' | 'status' | 'error',
    listener: (data: SpectrumFrame | ConnectionStatus | string) => void
  ): () => void;
  getStatus(): ConnectionStatus;
}
