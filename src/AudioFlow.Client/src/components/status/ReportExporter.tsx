import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlayerStore } from '@/stores/playerStore';
import { ReportGenerator } from '@/services/audio/reportGenerator';
import styles from './ReportExporter.module.css';

export function ReportExporter() {
  const { t } = useTranslation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [notes, setNotes] = useState('');

  const visualizationMode = usePlayerStore((s) => s.visualizationMode);

  const handlePrint = useCallback(() => {
    setIsGenerating(true);

    const data = {
      title: `AudioFlow ${visualizationMode} Report`,
      timestamp: new Date().toISOString(),
      measurements: {
        notes: notes || undefined,
      },
      screenshots: [],
    };

    try {
      ReportGenerator.printReport(data);
    } finally {
      setIsGenerating(false);
    }
  }, [visualizationMode, notes]);

  const handleDownload = useCallback(() => {
    setIsGenerating(true);

    const data = {
      title: `AudioFlow ${visualizationMode} Report`,
      timestamp: new Date().toISOString(),
      measurements: {
        notes: notes || undefined,
      },
      screenshots: [],
    };

    try {
      ReportGenerator.downloadReport(data);
    } finally {
      setIsGenerating(false);
    }
  }, [visualizationMode, notes]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>{t('report.title')}</span>
      </div>

      <div className={styles.content}>
        <div className={styles.field}>
          <label className={styles.label}>{t('report.notes')}</label>
          <textarea
            className={styles.textarea}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('report.notesPlaceholder')}
            rows={3}
          />
        </div>

        <div className={styles.actions}>
          <button
            className={styles.printButton}
            onClick={handlePrint}
            disabled={isGenerating}
          >
            {isGenerating ? t('report.generating') : t('report.print')}
          </button>

          <button
            className={styles.downloadButton}
            onClick={handleDownload}
            disabled={isGenerating}
          >
            {isGenerating ? t('report.generating') : t('report.download')}
          </button>
        </div>
      </div>

      <div className={styles.info}>
        <span className={styles.infoText}>{t('report.info')}</span>
      </div>
    </div>
  );
}
