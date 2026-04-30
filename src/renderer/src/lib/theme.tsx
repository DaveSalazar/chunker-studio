import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  mode: ThemeMode;
  /** Resolved value the renderer is actually using right now. */
  resolved: ResolvedTheme;
  setMode: (next: ThemeMode) => void;
  /** Convenience: flip between explicit light and dark, leaving "system" behind. */
  toggleLightDark: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "chunker.theme";
const DEFAULT_MODE: ThemeMode = "system";

function readStored(): ThemeMode {
  if (typeof window === "undefined") return DEFAULT_MODE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
  } catch {
    // ignore
  }
  return DEFAULT_MODE;
}

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true;
}

function resolve(mode: ThemeMode): ResolvedTheme {
  if (mode === "system") return systemPrefersDark() ? "dark" : "light";
  return mode;
}

export interface ThemeProviderProps {
  children: ReactNode;
  /** Override the initial mode (Storybook decorator + tests). */
  initial?: ThemeMode;
}

export function ThemeProvider({ children, initial }: ThemeProviderProps) {
  const [mode, setModeState] = useState<ThemeMode>(() => initial ?? readStored());
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolve(initial ?? readStored()));

  // Persist mode and recompute resolved when mode flips.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // ignore
    }
    setResolved(resolve(mode));
  }, [mode]);

  // Subscribe to system theme changes only while in `system` mode.
  // We don't want to follow OS preference when the user has explicitly
  // chosen light or dark.
  useEffect(() => {
    if (mode !== "system") return;
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setResolved(mq.matches ? "dark" : "light");
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, [mode]);

  // Drive the document class so Tailwind's `dark:` variants pick up.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", resolved === "dark");
  }, [resolved]);

  const setMode = useCallback((next: ThemeMode) => setModeState(next), []);
  const toggleLightDark = useCallback(() => {
    setModeState((m) => {
      const current = resolve(m);
      return current === "dark" ? "light" : "dark";
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, resolved, setMode, toggleLightDark }),
    [mode, resolved, setMode, toggleLightDark],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used inside <ThemeProvider>");
  }
  return ctx;
}
