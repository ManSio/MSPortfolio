import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

/**
 * Minimal language switcher (EN default, RU optional).
 *
 * Deliberately dependency-free: a React context + localStorage + a `lang`
 * attribute on <html> is all a two-language static portfolio needs. The
 * alternative (i18next) would add a runtime dependency for ~20 keys.
 *
 * Data files ship per-language as sibling JSON (`projects.ru.json`,
 * `lab/experiments.ru.json`, ...); components pick the file by `lang`.
 * UI labels (nav, section titles, lab chrome) come from `ui.ts`.
 */

export type Lang = 'en' | 'ru';

const STORAGE_KEY = 'msportfolio-lang';

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Shorthand used by components to pick per-language data. */
  isRu: boolean;
}

const Ctx = createContext<LangCtx>({ lang: 'en', setLang: () => {}, isRu: false });

function readInitial(): Lang {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'ru' ? 'ru' : 'en';
  } catch {
    return 'en';
  }
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readInitial);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* private mode — in-memory only */
    }
  };

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<LangCtx>(() => ({ lang, setLang, isRu: lang === 'ru' }), [lang]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang(): LangCtx {
  return useContext(Ctx);
}
