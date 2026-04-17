import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './RecordingButton.module.css';

type RecordingState = 'idle' | 'recording' | 'processing';

export function RecordingButton() {
  const { t } = useTranslation();
  const [state, setState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getCanvas = (): HTMLCanvasElement | null => {
    return document.querySelector('canvas');
  };

  const startRecording = () => {
    const canvas = getCanvas();
    if (!canvas) {
      setError(t('recording.noCanvas'));
      return;
    }

    setError(null);
    recordedChunksRef.current = [];

    try {
      const stream = canvas.captureStream(30);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        downloadBlob(blob, `audioflow-${Date.now()}.webm`);
        setState('idle');
        setDuration(0);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);
      setState('recording');

      // Update duration
      const startTime = Date.now();
      recordingIntervalRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 100);
    } catch (err) {
      setError(t('recording.error'));
      setState('idle');
    }
  };

  const stopRecording = () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    setState('idle');
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={styles.container}>
      {state === 'idle' ? (
        <button
          className={styles.recordButton}
          onClick={startRecording}
          title={t('recording.start')}
        >
          ⏺ {t('recording.start')}
        </button>
      ) : (
        <button
          className={`${styles.recordButton} ${styles.recording}`}
          onClick={stopRecording}
          title={t('recording.stop')}
        >
          ⏹ {t('recording.stop')}
        </button>
      )}

      {state === 'recording' && (
        <span className={styles.duration}>{formatTime(duration)}</span>
      )}

      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}
