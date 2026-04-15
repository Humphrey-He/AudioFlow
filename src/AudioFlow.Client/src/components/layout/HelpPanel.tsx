import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './HelpPanel.module.css';

export function HelpPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();

  if (!isOpen) {
    return (
      <button className={styles.helpButton} onClick={() => setIsOpen(true)}>
        ? {t('help.title')}
      </button>
    );
  }

  return (
    <div className={styles.modal} onClick={() => setIsOpen(false)}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{t('help.title')}</h2>
          <button className={styles.closeButton} onClick={() => setIsOpen(false)}>
            ×
          </button>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>{t('help.gettingStarted')}</h3>
          <p className={styles.sectionText}>{t('help.gettingStartedText')}</p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>{t('frequency.title')}</h3>
          <div className={styles.frequencyGuide}>
            <div className={styles.freqCard}>
              <div className={styles.freqLabel}>{t('frequency.low')}</div>
            </div>
            <div className={styles.freqCard}>
              <div className={styles.freqLabel}>{t('frequency.mid')}</div>
            </div>
            <div className={styles.freqCard}>
              <div className={styles.freqLabel}>{t('frequency.high')}</div>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>{t('help.about')}</h3>
          <p className={styles.sectionText}>{t('help.aboutText')}</p>
        </div>
      </div>
    </div>
  );
}
