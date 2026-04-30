import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { en, type Translations } from "./en";
import { es } from "./es";

export type Locale = "en" | "es";

const DICTIONARIES: Record<Locale, Translations> = { en, es };
const STORAGE_KEY = "chunker.locale";
const DEFAULT_LOCALE: Locale = "en";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  /**
   * Look up a translation by dotted path. Unknown keys fall through to
   * the path itself so the UI never renders blank — easier to spot a
   * missing key during development. Optional `params` interpolate
   * `{name}` placeholders.
   */
  t: (key: TranslationPath, params?: Record<string, string | number>) => string;
  available: { value: Locale; label: string }[];
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export type TranslationPath = NestedPaths<Translations>;

// Recursively derives `"a.b.c"` string-literal paths from the dictionary
// shape. Keeps `t("…")` autocomplete-driven without a separate enum.
type NestedPaths<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string
    ? P extends ""
      ? K
      : `${P}.${K}`
    : T[K] extends object
      ? NestedPaths<T[K], P extends "" ? K : `${P}.${K}`>
      : never;
}[keyof T & string];

function readPath(dict: unknown, path: string): string | null {
  const parts = path.split(".");
  let node: unknown = dict;
  for (const part of parts) {
    if (node && typeof node === "object" && part in (node as Record<string, unknown>)) {
      node = (node as Record<string, unknown>)[part];
    } else {
      return null;
    }
  }
  return typeof node === "string" ? node : null;
}

function format(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = params[key];
    return value === undefined ? match : String(value);
  });
}

function readStored(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "en" || raw === "es") return raw;
  } catch {
    // ignore — quota or privacy mode
  }
  // Fall back to navigator.language so a Spanish-set machine starts in es.
  const lang = window.navigator?.language?.toLowerCase();
  if (lang?.startsWith("es")) return "es";
  return DEFAULT_LOCALE;
}

export interface LocaleProviderProps {
  children: ReactNode;
  /** Override the initial locale; useful from Storybook decorators + tests. */
  initial?: Locale;
}

export function LocaleProvider({ children, initial }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(() => initial ?? readStored());

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // ignore
    }
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => setLocaleState(next), []);

  const value = useMemo<LocaleContextValue>(() => {
    const dict = DICTIONARIES[locale];
    return {
      locale,
      setLocale,
      t: (key, params) => {
        const raw = readPath(dict, key);
        if (raw === null) return key;
        return format(raw, params);
      },
      available: [
        { value: "en", label: "English" },
        { value: "es", label: "Español" },
      ],
    };
  }, [locale, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used inside <LocaleProvider>");
  }
  return ctx;
}

/** Shorthand `t(key)` hook — most call-sites only need translation. */
export function useT() {
  return useLocale().t;
}
