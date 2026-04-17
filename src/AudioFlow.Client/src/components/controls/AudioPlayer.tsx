import { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlayerStore } from '@/stores/playerStore';
import { audioPlayer } from '@/services/audio/audioPlayer';
import styles from './AudioPlayer.module.css';

export function AudioPlayer() {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    isPlaying,
    currentTime,
    duration,
    fileName,
    volume,
    setPlaying,
    setCurrentTime,
    setDuration,
    setFileName,
    setVolume,
    setSource,
  } = usePlayerStore();

  useEffect(() => {
    audioPlayer.onTimeUpdate = (time, dur) => {
      setCurrentTime(time);
      setDuration(dur);
    };

    audioPlayer.onEnded = () => {
      setPlaying(false);
      setCurrentTime(0);
    };

    audioPlayer.onError = (error) => {
      console.error('Audio player error:', error);
    };

    return () => {
      audioPlayer.dispose();
    };
  }, [setCurrentTime, setDuration, setPlaying]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { duration, name } = await audioPlayer.loadFile(file);
      setFileName(name);
      setDuration(duration);
      setPlaying(false);
      setCurrentTime(0);
      setSource('file');
    } catch (err) {
      console.error('Failed to load file:', err);
    }
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      audioPlayer.pause();
      setPlaying(false);
    } else {
      if (fileName) {
        audioPlayer.play();
        setPlaying(true);
      }
    }
  };

  const handleStop = () => {
    audioPlayer.stop();
    setPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;
    audioPlayer.seek(newTime);
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    audioPlayer.setVolume(vol);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={styles.playerContainer}>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className={styles.uploadInput}
        onChange={handleFileChange}
      />

      <button
        className={styles.playButton}
        onClick={handlePlayPause}
        disabled={!fileName}
        title={fileName ? (isPlaying ? 'Pause' : 'Play') : 'Load file first'}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>

      <div className={styles.controls}>
        <button className={styles.controlButton} onClick={handleStop} disabled={!fileName} title="Stop">
          ⏹
        </button>
        <button
          className={styles.uploadButton}
          onClick={() => fileInputRef.current?.click()}
          title="Upload audio file"
        >
          📁 {t('player.upload')}
        </button>
      </div>

      <div className={styles.progressContainer}>
        <div className={styles.progressBar} onClick={handleSeek}>
          <div
            className={styles.progressFill}
            style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
          />
        </div>
        <span className={styles.time}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      <div className={styles.volumeContainer}>
        <span className={styles.volumeIcon}>🔊</span>
        <input
          type="range"
          className={styles.volumeSlider}
          min="0"
          max="1"
          step="0.05"
          value={volume}
          onChange={handleVolumeChange}
        />
      </div>

      {fileName && (
        <span className={styles.fileName} title={fileName}>
          {fileName}
        </span>
      )}
    </div>
  );
}
