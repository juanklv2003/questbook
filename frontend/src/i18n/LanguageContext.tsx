import * as React from "react";
import { es } from "./es";
import { en } from "./en";

export type Locale = "es" | "en";
export type Dict = typeof es;
export type TranslationKey = keyof Dict;

const STORAGE_KEY = "andel-lang";
const DEFAULT_LOCALE: Locale = "es";

const dictionaries: Record<Locale, Record<TranslationKey, string>> = { es, en };

function isLocale(value: unknown): value is Locale {
  return value === "es" || value === "en";
}

/** Reads the persisted locale (localStorage). Defaults to Spanish. */
export function getInitialLocale(): Locale {
  if (typeof window !== "undefined") {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (isLocale(saved)) return saved;
    } catch {
      // Private mode may block storage: fall through to the default.
    }
  }
  return DEFAULT_LOCALE;
}

/** Applies the locale to <html lang>. Safe to call before paint. */
export function applyLocaleToDocument(locale: Locale): void {
  if (typeof document !== "undefined") {
    document.documentElement.lang = locale;
  }
}

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  /** Typed lookup with {var} interpolation. Falls back to Spanish, then the key. */
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const LanguageContext = React.createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = React.useState<Locale>(getInitialLocale);

  const setLocale = React.useCallback((next: Locale) => {
    setLocaleState(next);
  }, []);

  const toggleLocale = React.useCallback(() => {
    setLocaleState((prev) => (prev === "es" ? "en" : "es"));
  }, []);

  // Persist + reflect on <html> before paint to avoid lang flashes.
  React.useLayoutEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // Storage unavailable: locale still applies to this session.
    }
    applyLocaleToDocument(locale);
  }, [locale]);

  const t = React.useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>): string => {
      let text: string = dictionaries[locale][key] ?? dictionaries.es[key] ?? key;
      if (vars) {
        for (const [name, value] of Object.entries(vars)) {
          text = text.split(`{${name}}`).join(String(value));
        }
      }
      return text;
    },
    [locale]
  );

  const value = React.useMemo(
    () => ({ locale, setLocale, toggleLocale, t }),
    [locale, setLocale, toggleLocale, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = React.useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
