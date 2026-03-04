"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export type AcontThemeVars = {
  primary?: string;
  secondary?: string;
  accent1?: string;
  accent2?: string;
  bg?: string;
  surface?: string;
};

const DEFAULT_ACONT: AcontThemeVars = {
  primary: "#D61672",
  secondary: "#FFA901",
  accent1: "#FFC303",
  accent2: "#FFDF01",
  bg: "#f1f5f9",
  surface: "#ffffff",
};

type ThemeContextValue = {
  themeVars: AcontThemeVars;
  setThemeVars: (vars: Partial<AcontThemeVars>) => void;
  applyTheme: (vars: Partial<AcontThemeVars>) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyVarsToDocument(vars: AcontThemeVars) {
  const root = typeof document !== "undefined" ? document.documentElement : null;
  if (!root) return;
  if (vars.primary != null) root.style.setProperty("--acont-primary", vars.primary);
  if (vars.secondary != null) root.style.setProperty("--acont-secondary", vars.secondary);
  if (vars.accent1 != null) root.style.setProperty("--acont-accent1", vars.accent1);
  if (vars.accent2 != null) root.style.setProperty("--acont-accent2", vars.accent2);
  if (vars.bg != null) root.style.setProperty("--acont-bg", vars.bg);
  if (vars.surface != null) root.style.setProperty("--acont-surface", vars.surface);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeVars, setThemeVarsState] = useState<AcontThemeVars>(DEFAULT_ACONT);

  const applyTheme = useCallback((vars: Partial<AcontThemeVars>) => {
    setThemeVarsState((prev) => {
      const next = { ...prev, ...vars };
      applyVarsToDocument(next);
      return next;
    });
  }, []);

  const setThemeVars = useCallback((vars: Partial<AcontThemeVars>) => {
    setThemeVarsState((prev) => {
      const next = { ...prev, ...vars };
      applyVarsToDocument(next);
      return next;
    });
  }, []);

  useEffect(() => {
    applyVarsToDocument(themeVars);
  }, []);

  return (
    <ThemeContext.Provider value={{ themeVars, setThemeVars, applyTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  return ctx ?? { themeVars: DEFAULT_ACONT, setThemeVars: () => {}, applyTheme: () => {} };
}
