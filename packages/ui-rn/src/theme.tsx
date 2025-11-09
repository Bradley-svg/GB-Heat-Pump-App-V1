import { createContext, useContext, useMemo, type PropsWithChildren } from "react";
import { getColors, tokens, type ThemeMode } from "@greenbro/ui-tokens";

interface ThemeContextValue {
  mode: ThemeMode;
  tokens: typeof tokens;
  colors: ReturnType<typeof getColors>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export interface ThemeProviderProps {
  mode?: ThemeMode;
}

export function ThemeProvider({ children, mode = "light" }: PropsWithChildren<ThemeProviderProps>) {
  const value = useMemo(
    () => ({
      mode,
      tokens,
      colors: getColors(mode),
    }),
    [mode],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
