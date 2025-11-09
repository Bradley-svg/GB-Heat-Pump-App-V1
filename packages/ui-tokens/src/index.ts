import tokensJson from "../greenbro.tokens.json";

export type Tokens = typeof tokensJson;

export const tokens: Tokens = tokensJson;

export type ThemeMode = "light" | "dark";

export function getColors(mode: ThemeMode = "light") {
  if (mode === "dark") {
    return {
      primary: tokens.color.primary,
      background: tokens.color.dark.background,
      surface: tokens.color.dark.surface,
      text: tokens.color.dark.text,
      border: tokens.color.dark.border,
    };
  }
  return {
    primary: tokens.color.primary,
    background: tokens.color.background,
    surface: tokens.color.background,
    text: tokens.color.text,
    border: tokens.color.border,
  };
}
