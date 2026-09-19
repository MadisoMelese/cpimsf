import { createContext, useContext, useState, useCallback } from 'react';
import { en, am } from '../i18n/index.js';

const DICTIONARIES = { en, am };
const STORAGE_KEY  = 'cpims_lang';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'am' ? 'am' : 'en';
  });

  const switchLang = useCallback((l) => {
    const next = l || (lang === 'en' ? 'am' : 'en');
    localStorage.setItem(STORAGE_KEY, next);
    setLang(next);
  }, [lang]);

  /**
   * t('purchases.title') → looks up dictionary path
   * t('common.save')     → 'Save' / 'አስቀምጥ'
   */
  const t = useCallback((key) => {
    const parts = key.split('.');
    let val = DICTIONARIES[lang];
    for (const p of parts) {
      if (val == null) break;
      val = val[p];
    }
    // Fallback to English
    if (val == null) {
      let fb = DICTIONARIES.en;
      for (const p of parts) {
        if (fb == null) break;
        fb = fb[p];
      }
      return fb ?? key;
    }
    return val;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, switchLang, t, isAmharic: lang === 'am' }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside <LanguageProvider>');
  return ctx;
}
