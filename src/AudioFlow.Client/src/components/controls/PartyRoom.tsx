import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlayerStore } from '@/stores/playerStore';
import { audioRuntime } from '@/services/audio/audioRuntime';
import type { RoomCreated, RoomJoined, ErrorMessage } from '@/services/websocket/protocol';
import styles from './PartyRoom.module.css';

type PartyMode = 'idle' | 'hosting' | 'joined';

export function PartyRoom() {
  const { t } = useTranslation();
  const [partyMode, setPartyMode] = useState<PartyMode>('idle');
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [participantCount, setParticipantCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

  const setSource = usePlayerStore((s) => s.setSource);

  const handleCreateRoom = useCallback(() => {
    setError(null);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?mode=host`;

    const webSocket = new WebSocket(wsUrl);

    webSocket.onopen = () => {
      console.log('[Party] WebSocket connected');
    };

    webSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'room_created') {
          const msg = data as RoomCreated;
          setRoomCode(msg.code);
          setPartyMode('hosting');
          setSource('system'); // Host uses system audio
        } else if (data.type === 'spectrum_frame') {
          // Update audio runtime with shared data
          audioRuntime.updateFrame({
            type: 'spectrum_frame',
            frame: data.frame,
            timestamp: data.timestamp,
            magnitudes: data.magnitudes,
          });
        } else if (data.type === 'error') {
          const err = data as ErrorMessage;
          setError(err.message);
        }
      } catch (e) {
        console.error('[Party] Failed to parse message:', e);
      }
    };

    webSocket.onerror = () => {
      setError('Connection error');
      setPartyMode('idle');
    };

    webSocket.onclose = () => {
      console.log('[Party] WebSocket closed');
      setPartyMode('idle');
      setRoomCode('');
      setWs(null);
    };

    setWs(webSocket);
  }, [setSource]);

  const handleJoinRoom = useCallback(() => {
    if (!joinCode || joinCode.length !== 6) {
      setError('Please enter a valid 6-character room code');
      return;
    }

    setError(null);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?mode=participant&room=${joinCode.toUpperCase()}`;

    const webSocket = new WebSocket(wsUrl);

    webSocket.onopen = () => {
      console.log('[Party] Joined WebSocket connected');
    };

    webSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'room_joined') {
          const msg = data as RoomJoined;
          setRoomCode(msg.code);
          setParticipantCount(msg.participantCount);
          setPartyMode('joined');
          setSource('system'); // Use shared audio data
        } else if (data.type === 'spectrum_frame') {
          // Update audio runtime with shared data
          audioRuntime.updateFrame({
            type: 'spectrum_frame',
            frame: data.frame,
            timestamp: data.timestamp,
            magnitudes: data.magnitudes,
          });
        } else if (data.type === 'error') {
          const err = data as ErrorMessage;
          setError(err.message);
        }
      } catch (e) {
        console.error('[Party] Failed to parse message:', e);
      }
    };

    webSocket.onerror = () => {
      setError('Connection error');
      setPartyMode('idle');
    };

    webSocket.onclose = () => {
      console.log('[Party] Joined WebSocket closed');
      setPartyMode('idle');
      setRoomCode('');
      setWs(null);
    };

    setWs(webSocket);
  }, [joinCode, setSource]);

  const handleLeaveRoom = useCallback(() => {
    if (ws) {
      ws.close();
    }
    setPartyMode('idle');
    setRoomCode('');
    setJoinCode('');
    setParticipantCount(0);
  }, [ws]);

  useEffect(() => {
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [ws]);

  if (partyMode === 'hosting') {
    return (
      <div className={styles.container}>
        <div className={styles.roomInfo}>
          <h3>{t('party.hosting')}</h3>
          <div className={styles.codeDisplay}>
            <span className={styles.codeLabel}>{t('party.roomCode')}</span>
            <span className={styles.code}>{roomCode}</span>
          </div>
          <button onClick={handleLeaveRoom} className={styles.leaveButton}>
            {t('party.leave')}
          </button>
        </div>
      </div>
    );
  }

  if (partyMode === 'joined') {
    return (
      <div className={styles.container}>
        <div className={styles.roomInfo}>
          <h3>{t('party.watching')}</h3>
          <div className={styles.codeDisplay}>
            <span className={styles.codeLabel}>{t('party.roomCode')}</span>
            <span className={styles.code}>{roomCode}</span>
          </div>
          <p className={styles.participantCount}>
            {t('party.viewers', { count: participantCount })}
          </p>
          <button onClick={handleLeaveRoom} className={styles.leaveButton}>
            {t('party.leave')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.controls}>
        <div className={styles.createSection}>
          <h3>{t('party.createRoom')}</h3>
          <p className={styles.description}>{t('party.createDesc')}</p>
          <button onClick={handleCreateRoom} className={styles.createButton}>
            {t('party.create')}
          </button>
        </div>

        <div className={styles.divider}>
          <span>{t('party.or')}</span>
        </div>

        <div className={styles.joinSection}>
          <h3>{t('party.joinRoom')}</h3>
          <p className={styles.description}>{t('party.joinDesc')}</p>
          <div className={styles.inputGroup}>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder={t('party.enterCode')}
              className={styles.codeInput}
              maxLength={6}
            />
            <button
              onClick={handleJoinRoom}
              className={styles.joinButton}
              disabled={joinCode.length !== 6}
            >
              {t('party.join')}
            </button>
          </div>
        </div>

        {error && <p className={styles.error}>{error}</p>}
      </div>
    </div>
  );
}