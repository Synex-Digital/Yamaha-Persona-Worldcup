'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_LANGUAGE, LANG_COOKIE_NAME, LANG_STORAGE_KEY, resolveLanguage, translations } from '@/lib/i18n/translations';
import { Language } from '@/lib/i18n/types';

type TranslationDictionary = (typeof translations)[Language];

type LanguageContextValue = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationDictionary;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  children,
  initialLanguage = DEFAULT_LANGUAGE,
}: {
  children: React.ReactNode;
  initialLanguage?: Language;
}) {
  const [language, setLanguageState] = useState<Language>(initialLanguage);

  useEffect(() => {
    const saved = resolveLanguage(window.localStorage.getItem(LANG_STORAGE_KEY));
    if (saved !== language) {
      setLanguageState(saved);
    } else {
      document.cookie = `${LANG_COOKIE_NAME}=${saved}; path=/; max-age=31536000; samesite=lax`;
      window.localStorage.setItem(LANG_STORAGE_KEY, saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    window.localStorage.setItem(LANG_STORAGE_KEY, lang);
    document.cookie = `${LANG_COOKIE_NAME}=${lang}; path=/; max-age=31536000; samesite=lax`;
  };

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: translations[language],
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
