import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUiStore } from '@/stores/uiStore';
import styles from './Header.module.css';

interface HeaderProps {
  preset: string;
  onPresetChange: (preset: string) => void;
}

export function Header({ preset, onPresetChange }: HeaderProps) {
  const { t, i18n } = useTranslation();
  const setLanguage = useUiStore((s) => s.setLanguage);

  const handleLangChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value;
    i18n.changeLanguage(lang);
    setLanguage(lang);
  };

  return (
    <header className={styles.header}>
      <h1 className={styles.title}>{t('app.title')}</h1>
      <div className={styles.headerRight}>
        <select
          className={styles.select}
          value={preset}
          onChange={(e) => onPresetChange(e.target.value)}
        >
          <option value="default">{t('preset.default')}</option>
          <option value="bassic">{t('preset.bassic')}</option>
          <option value="vivid">{t('preset.vivid')}</option>
          <option value="minimal">{t('preset.minimal')}</option>
          <option value="custom">{t('preset.custom')}</option>
        </select>
        <select className={styles.select} value={i18n.language} onChange={handleLangChange}>
          <option value="en">English</option>
          <option value="zh">中文</option>
          <option value="ja">日本語</option>
        </select>
      </div>
    </header>
  );
}
