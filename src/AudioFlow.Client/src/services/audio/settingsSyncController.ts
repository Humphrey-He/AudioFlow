import { websocketService } from '../websocket/websocketService';
import { createSettingsMessage, type OutgoingSettings } from '../websocket/protocol';
import type { AudioSettings } from '@/types/common';

/**
 * SettingsSyncController handles bidirectional settings synchronization.
 *
 * Responsibilities:
 * - Listen to local settings changes
 * - Apply settings locally (immediate feedback)
 * - Send settings to server with requestId for ack tracking
 * - Handle ack success/failure
 *
 * This prevents UI components from directly calling websocket.send()
 */
export class SettingsSyncController {
  private pendingRequests: Map<string, { resolve: () => void; reject: (err: Error) => void; timeout: ReturnType<typeof setTimeout> }> = new Map();
  private currentSettings: AudioSettings | null = null;

  /**
   * Apply settings locally AND send to server
   */
  applySettings(settings: AudioSettings): Promise<void> {
    // Immediately apply locally for responsive UI
    this.currentSettings = settings;

    // Generate request ID for ack tracking
    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Send to server
    const message: OutgoingSettings = createSettingsMessage(requestId, {
      smoothing: settings.smoothing,
      attack: settings.attack,
      decay: settings.decay,
      weighting: settings.weighting,
    });

    return this.sendWithAck(requestId, message);
  }

  /**
   * Send message and wait for ack with timeout
   */
  private sendWithAck(requestId: string, message: OutgoingSettings): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        console.warn(`[SettingsSync] Request ${requestId} timed out`);
        // Don't reject - allow local settings to work offline
        resolve();
      }, 5000);

      this.pendingRequests.set(requestId, { resolve, reject, timeout });

      // Send the message
      websocketService.send(message);

      // Subscribe to ack
      const unsubscribe = websocketService.subscribe('message', (data) => {
        if (typeof data === 'object' && data !== null && 'type' in data && (data as { type: string }).type === 'settings_ack') {
          const msg = data as { requestId: string; success: boolean };
          if (msg.requestId === requestId) {
            unsubscribe();
            const pending = this.pendingRequests.get(requestId);
            if (pending) {
              clearTimeout(pending.timeout);
              this.pendingRequests.delete(requestId);
              if (msg.success) {
                pending.resolve();
              } else {
                pending.reject(new Error('Server rejected settings'));
              }
            }
          }
        }
      });
    });
  }

  /**
   * Cancel all pending requests (e.g., on disconnect)
   */
  cancelPending(): void {
    this.pendingRequests.forEach((pending) => {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Connection lost'));
    });
    this.pendingRequests.clear();
  }

  /**
   * Get current settings
   */
  getCurrentSettings(): AudioSettings | null {
    return this.currentSettings;
  }
}

export const settingsSyncController = new SettingsSyncController();
