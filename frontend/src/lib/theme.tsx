"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  setTheme: () => {},
});

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

const STORAGE_KEY = "ssp-portal-theme";

function resolveApplied(theme: Theme): "light" | "dark" {
  if (theme !== "system") return theme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", resolveApplied(theme));
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");

  // Hydrate from localStorage once on mount.
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    const valid = stored === "light" || stored === "dark" || stored === "system";
    const initial: Theme = valid ? stored : "system";
    setThemeState(initial);
    applyTheme(initial);
  }, []);

  // Re-apply whenever theme changes; also listen for OS changes when in "system" mode.
  useEffect(() => {
    applyTheme(theme);
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => applyTheme("system");
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEY, t);
  }, []);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}
