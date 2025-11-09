import { FlatCompat } from "@eslint/eslintrc";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import baseConfig from "./eslint.base.mjs";

const compat = new FlatCompat({
  baseDirectory: new URL(".", import.meta.url).pathname,
});

export default [
  ...baseConfig,
  {
    files: ["**/*.{ts,tsx,jsx}"],
    plugins: {
      react,
      "react-hooks": reactHooks,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      "react/jsx-uses-react": "off",
      "react/react-in-jsx-scope": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
    },
  },
  ...compat.config({
    extends: ["plugin:react/jsx-runtime"],
  }),
];
