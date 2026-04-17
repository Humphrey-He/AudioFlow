import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlayerStore } from '@/stores/playerStore';
import { audioInput } from '@/services/audio/audioInput';
import styles from './SourceSelector.module.css';

export function SourceSelector() {
  const { t } = useTranslation();
  const source = usePlayerStore((s) => s.source);
  const setSource = usePlayerStore((s) => s.setSource);
  const [isActivating, setIsActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSourceChange = async (newSource: 'system' | 'microphone' | 'file') => {
    if (newSource === source) return;

    // Stop microphone if switching away
    if (source === 'microphone') {
      audioInput.stop();
    }

    // Activate new source
    if (newSource === 'microphone') {
      setIsActivating(true);
      setError(null);
      try {
        await audioInput.start();
        setSource('microphone');
      } catch (err) {
        setError(t('source.micError'));
        setSource('system');
      } finally {
        setIsActivating(false);
      }
    } else {
      setSource(newSource);
    }
  };

  const sourceOptions: { key: 'system' | 'microphone' | 'file'; icon: string; label: string }[] = [
    { key: 'system', icon: '🔊', label: t('source.system') },
    { key: 'microphone', icon: '🎤', label: t('source.microphone') },
    { key: 'file', icon: '📁', label: t('source.file') },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.selector}>
        {sourceOptions.map((option) => (
          <button
            key={option.key}
            className={`${styles.button} ${source === option.key ? styles.active : ''}`}
            onClick={() => handleSourceChange(option.key)}
            disabled={isActivating}
            title={option.label}
          >
            <span className={styles.icon}>{option.icon}</span>
            <span className={styles.label}>{option.label}</span>
          </button>
        ))}
      </div>
      {isActivating && <span className={styles.status}>{t('source.activating')}...</span>}
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}
