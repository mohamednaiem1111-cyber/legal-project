'use client';
// Minimal AR/EN switch. UI text is written as tr('عربي', 'English') next to where it is used.
// The language is remembered in localStorage (per browser) and flips <html dir/lang>.
import { createContext, useContext, useEffect, useState } from 'react';

export type Lang = 'ar' | 'en';
type Ctx = { lang: Lang; setLang: (l: Lang) => void; tr: (ar: string, en: string) => string };
const I18n = createContext<Ctx>({ lang: 'ar', setLang: () => {}, tr: (ar) => ar });

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ar');
  useEffect(() => {
    try { const s = localStorage.getItem('maat_lang'); if (s === 'en' || s === 'ar') setLangState(s); } catch { /* storage blocked */ }
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);
  const setLang = (l: Lang) => { setLangState(l); try { localStorage.setItem('maat_lang', l); } catch { /* ignore */ } };
  const tr = (ar: string, en: string) => (lang === 'ar' ? ar : en);
  return <I18n.Provider value={{ lang, setLang, tr }}>{children}</I18n.Provider>;
}

export const useI18n = () => useContext(I18n);

export function LangToggle({ className = 'btn ghost small' }: { className?: string }) {
  const { lang, setLang } = useI18n();
  return (
    <button type="button" className={className} onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} aria-label="Switch language">
      {lang === 'ar' ? 'English' : 'العربية'}
    </button>
  );
}
