'use client';

import { languageLabels } from '@/lib/i18n/translations';
import { Language } from '@/lib/i18n/types';
import { useLanguage } from './LanguageProvider';
import styles from './language-switcher.module.css';

const languages: Language[] = ['en', 'bn'];

export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className={styles.wrapper} aria-label={t.switcher.label}>
      <span className={styles.label}>{t.switcher.label}</span>
      <div className={styles.pill}>
        {languages.map((lang) => (
          <button
            key={lang}
            type="button"
            onClick={() => setLanguage(lang)}
            className={`${styles.option} ${language === lang ? styles.active : ''}`}
            aria-pressed={language === lang}
          >
            {languageLabels[lang]}
          </button>
        ))}
      </div>
    </div>
  );
}

