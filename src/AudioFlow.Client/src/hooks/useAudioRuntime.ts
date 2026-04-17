import { useEffect, useState } from 'react';
import { audioRuntime, type AudioStats } from '@/services/audio/audioRuntime';
import { websocketService } from '@/services/websocket/websocketService';
import { useConnectionStore } from '@/stores/connectionStore';
import { useUiStore } from '@/stores/uiStore';
import type { IncomingMessage } from '@/services/websocket/protocol';

/**
 * useAudioRuntime - connects WebSocket to AudioRuntime
 *
 * Key principle (Phase 2):
 * - This hook ONLY handles connection setup
 * - It does NOT return magnitudes (that goes directly to renderer via RAF)
 * - React state only updates for UI-relevant events (stats, connection)
 */
export function useAudioRuntime(): AudioStats {
  const [stats, setStats] = useState<AudioStats>(() => audioRuntime.getSnapshot().stats);
  const setConnectionStatus = useConnectionStore((s) => s.setStatus);
  const setError = useUiStore((s) => s.setError);

  useEffect(() => {
    // Handle incoming messages - only update stats for UI
    const unsubscribeMessage = websocketService.subscribe('message', (data) => {
      if (typeof data === 'object' && data !== null && 'type' in data) {
        const msg = data as IncomingMessage;
        if (msg.type === 'spectrum_frame') {
          // Update stats for UI components (StatsPanel)
          // But magnitudes go directly to runtime for renderer
          const snapshot = audioRuntime.getSnapshot();
          setStats({ ...snapshot.stats });
        } else if (msg.type === 'error') {
          setError((msg as { message: string }).message);
        }
      }
    });

    // Handle connection status changes
    const unsubscribeStatus = websocketService.subscribe('status', (status) => {
      if (typeof status === 'string') {
        setConnectionStatus(status as 'connected' | 'disconnected' | 'reconnecting' | 'error');
        if (status === 'disconnected') {
          audioRuntime.reset();
        }
      }
    });

    // Connect to WebSocket
    websocketService.connect();

    return () => {
      unsubscribeMessage();
      unsubscribeStatus();
      websocketService.disconnect();
    };
  }, [setConnectionStatus, setError]);

  return stats;
}

/**
 * useRendererData - for renderer hook to get latest frame without React re-render
 * This returns a stable reference that renderer reads via RAF
 */
export function useRendererData() {
  return audioRuntime.getSnapshot();
}
