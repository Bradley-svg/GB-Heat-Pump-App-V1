import React, { createContext, useContext, useMemo } from "react";
import {
  ColorSchemeName,
  Platform,
  ViewStyle,
  useColorScheme as useNativeColorScheme,
} from "react-native";

import tokens from "../../../shared/theme/greenbro.tokens.json";

type Palette = typeof tokens.colors.light;

interface Theme {
  colors: Palette;
  spacing: typeof tokens.spacing;
  radii: typeof tokens.radii;
  typeScale: typeof tokens.typeScale;
  motion: typeof tokens.motion;
  colorScheme: ColorSchemeName;
}

const ThemeContext = createContext<Theme | null>(null);

const mapScheme = (scheme: ColorSchemeName): Palette =>
  scheme === "dark" ? tokens.colors.dark : tokens.colors.light;

export const GBThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const scheme = useNativeColorScheme() ?? "light";

  const value = useMemo<Theme>(
    () => ({
      colors: mapScheme(scheme),
      spacing: tokens.spacing,
      radii: tokens.radii,
      typeScale: tokens.typeScale,
      motion: tokens.motion,
      colorScheme: scheme,
    }),
    [scheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within GBThemeProvider");
  return ctx;
}

export function useColorScheme(): ColorSchemeName {
  return useTheme().colorScheme;
}

export function elevation(level: 1 | 2 = 1): ViewStyle {
  const isAndroid = Platform.OS === "android";
  return isAndroid
    ? { elevation: level === 1 ? 2 : 6 }
    : {
        shadowColor: "rgba(0,0,0,0.4)",
        shadowOpacity: level === 1 ? 0.12 : 0.18,
        shadowRadius: level === 1 ? 6 : 12,
        shadowOffset: { width: 0, height: level === 1 ? 3 : 6 },
      };
}
