import { createContext, useContext, useMemo, type PropsWithChildren } from "react";
import { getColors, tokens, type ThemeMode } from "@greenbro/ui-tokens";

interface ThemeContextValue {
  mode: ThemeMode;
  colors: ReturnType<typeof getColors>;
  tokens: typeof tokens;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export interface ThemeProviderProps {
  mode?: ThemeMode;
}

export function ThemeProvider({ children, mode = "light" }: PropsWithChildren<ThemeProviderProps>) {
  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      colors: getColors(mode),
      tokens,
    }),
    [mode],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
