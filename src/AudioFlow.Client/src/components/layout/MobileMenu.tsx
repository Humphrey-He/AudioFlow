import { useState } from 'react';
import styles from './MobileMenu.module.css';

interface MobileMenuProps {
  children: React.ReactNode;
  title: string;
}

export function MobileMenu({ children, title }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={styles.container}>
      <button
        className={styles.header}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className={styles.title}>{title}</span>
        <span className={styles.icon}>{isOpen ? '▲' : '▼'}</span>
      </button>

      <div className={`${styles.content} ${isOpen ? styles.open : ''}`}>
        {children}
      </div>
    </div>
  );
}
