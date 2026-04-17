/**
 * Protocol definitions and validation for WebSocket messages.
 * Phase 2: All incoming messages must pass validation.
 */

export interface SpectrumFrame {
  type: 'spectrum_frame';
  frame: number;
  timestamp: string;
  magnitudes: number[];
}

export interface SettingsAck {
  type: 'settings_ack';
  requestId: string;
  success: boolean;
}

export interface Heartbeat {
  type: 'heartbeat';
  timestamp: number;
}

export interface ErrorMessage {
  type: 'error';
  code: string;
  message: string;
}

// Room-related messages
export interface RoomCreated {
  type: 'room_created';
  code: string;
  maxParticipants: number;
}

export interface RoomJoined {
  type: 'room_joined';
  code: string;
  participantCount: number;
}

export type IncomingMessage = SpectrumFrame | SettingsAck | Heartbeat | ErrorMessage | RoomCreated | RoomJoined;

export interface OutgoingSettings {
  type: 'settings';
  requestId: string;
  smoothing: string;
  attack: number;
  decay: number;
  weighting: string;
}

/**
 * Schema validation for incoming messages
 */
export function validateMessage(raw: unknown): IncomingMessage | null {
  if (!raw || typeof raw !== 'object') return null;

  const msg = raw as Record<string, unknown>;

  if (msg.type === 'spectrum_frame') {
    if (typeof msg.frame !== 'number') return null;
    if (typeof msg.timestamp !== 'string') return null;
    if (!Array.isArray(msg.magnitudes)) return null;
    if (msg.magnitudes.length === 0) return null;
    if (!msg.magnitudes.every((m) => typeof m === 'number' && !isNaN(m))) return null;

    return {
      type: 'spectrum_frame',
      frame: msg.frame,
      timestamp: msg.timestamp,
      magnitudes: msg.magnitudes,
    };
  }

  if (msg.type === 'settings_ack') {
    if (typeof msg.requestId !== 'string') return null;
    if (typeof msg.success !== 'boolean') return null;
    return {
      type: 'settings_ack',
      requestId: msg.requestId,
      success: msg.success,
    };
  }

  if (msg.type === 'heartbeat') {
    if (typeof msg.timestamp !== 'number') return null;
    return {
      type: 'heartbeat',
      timestamp: msg.timestamp,
    };
  }

  if (msg.type === 'error') {
    if (typeof msg.code !== 'string') return null;
    if (typeof msg.message !== 'string') return null;
    return {
      type: 'error',
      code: msg.code,
      message: msg.message,
    };
  }

  if (msg.type === 'room_created') {
    if (typeof msg.code !== 'string') return null;
    if (typeof msg.maxParticipants !== 'number') return null;
    return {
      type: 'room_created',
      code: msg.code,
      maxParticipants: msg.maxParticipants,
    };
  }

  if (msg.type === 'room_joined') {
    if (typeof msg.code !== 'string') return null;
    if (typeof msg.participantCount !== 'number') return null;
    return {
      type: 'room_joined',
      code: msg.code,
      participantCount: msg.participantCount,
    };
  }

  return null;
}

/**
 * Create a settings change message
 */
export function createSettingsMessage(
  requestId: string,
  settings: { smoothing: string; attack: number; decay: number; weighting: string }
): OutgoingSettings {
  return {
    type: 'settings',
    requestId,
    ...settings,
  };
}
