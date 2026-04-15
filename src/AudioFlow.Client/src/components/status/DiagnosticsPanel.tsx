import { useState, useEffect } from 'react';
import { websocketService, type ConnectionDiagnostics } from '@/services/websocket/websocketService';
import { audioRuntime } from '@/services/audio/audioRuntime';
import styles from './DiagnosticsPanel.module.css';

export function DiagnosticsPanel() {
  const [diagnostics, setDiagnostics] = useState<ConnectionDiagnostics | null>(null);
  const [runtimeVersion, setRuntimeVersion] = useState(0);

  useEffect(() => {
    // Update diagnostics every second
    const interval = setInterval(() => {
      setDiagnostics(websocketService.getDiagnostics());
      setRuntimeVersion(audioRuntime.getVersion());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!diagnostics) return null;

  const formatTime = (ts: number | null) =>
    ts ? new Date(ts).toLocaleTimeString() : 'N/A';

  const invalidRate = diagnostics.totalMessages > 0
    ? ((diagnostics.invalidMessages / diagnostics.totalMessages) * 100).toFixed(1)
    : '0';

  return (
    <div className={styles.panel}>
      <div className={styles.title}>Diagnostics</div>
      <div className={styles.grid}>
        <div className={styles.item}>
          <span className={styles.label}>Messages</span>
          <span className={styles.value}>{diagnostics.totalMessages}</span>
        </div>
        <div className={styles.item}>
          <span className={styles.label}>Invalid</span>
          <span className={`${styles.value} ${diagnostics.invalidMessages > 0 ? styles.error : ''}`}>
            {diagnostics.invalidMessages} ({invalidRate}%)
          </span>
        </div>
        <div className={styles.item}>
          <span className={styles.label}>Reconnects</span>
          <span className={`${styles.value} ${diagnostics.reconnectAttempts > 0 ? styles.warning : ''}`}>
            {diagnostics.reconnectAttempts}
          </span>
        </div>
        <div className={styles.item}>
          <span className={styles.label}>Last Msg</span>
          <span className={styles.value}>{formatTime(diagnostics.lastMessageTime)}</span>
        </div>
        <div className={styles.item}>
          <span className={styles.label}>Runtime Ver</span>
          <span className={styles.value}>{runtimeVersion}</span>
        </div>
        <div className={styles.item}>
          <span className={styles.label}>Last Error</span>
          <span className={`${styles.value} ${diagnostics.lastError ? styles.error : ''}`}>
            {diagnostics.lastError || 'None'}
          </span>
        </div>
      </div>
    </div>
  );
}
