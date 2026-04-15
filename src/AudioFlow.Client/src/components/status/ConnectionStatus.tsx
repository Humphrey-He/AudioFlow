import { useTranslation } from 'react-i18next';
import { useConnectionStore } from '@/stores/connectionStore';
import styles from './ConnectionStatus.module.css';

export function ConnectionStatus() {
  const { t } = useTranslation();
  const status = useConnectionStore((s) => s.status);

  return (
    <div className={styles.status}>
      <span className={`${styles.dot} ${styles[status]}`} />
      <span>{t(`status.${status}`)}</span>
    </div>
  );
}
