import { useEffect, useState, useCallback, useRef } from 'react';
import { audioRuntime } from '@/services/audio/audioRuntime';
import { websocketService } from '@/services/websocket/websocketService';
import { useConnectionStore } from '@/stores/connectionStore';
import type { SpectrumFrame } from '@/types/common';

export interface AudioSnapshot {
  magnitudes: Float32Array;
  frameCount: number;
  peakDb: number;
  avgDb: number;
  timestamp: string;
}

export function useAudioRuntime(): AudioSnapshot {
  const [snapshot, setSnapshot] = useState<AudioSnapshot>(() => audioRuntime.getSnapshot());
  const setConnectionStatus = useConnectionStore((s) => s.setStatus);

  useEffect(() => {
    const unsubscribeMessage = websocketService.subscribe('message', (data) => {
      if (data && typeof data === 'object' && 'magnitudes' in data) {
        audioRuntime.updateFrame(data as SpectrumFrame);
      }
    });

    const unsubscribeStatus = websocketService.subscribe('status', (data) => {
      if (typeof data === 'string') {
        setConnectionStatus(data as 'connected' | 'disconnected' | 'error');
      }
    });

    const unsubscribeRuntime = audioRuntime.subscribe(() => {
      setSnapshot(audioRuntime.getSnapshot());
    });

    websocketService.connect();

    return () => {
      unsubscribeMessage();
      unsubscribeStatus();
      unsubscribeRuntime();
      websocketService.disconnect();
    };
  }, [setConnectionStatus]);

  return snapshot;
}
