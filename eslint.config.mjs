import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

const projectDir = dirname(fileURLToPath(import.meta.url));

const workerGlobals = {
  Blob: "readonly",
  Cache: "readonly",
  caches: "readonly",
  crypto: "readonly",
  CryptoKey: "readonly",
  EventTarget: "readonly",
  fetch: "readonly",
  Headers: "readonly",
  Request: "readonly",
  Response: "readonly",
  URL: "readonly",
  URLSearchParams: "readonly",
};

const nodeGlobals = {
  Buffer: "readonly",
  console: "readonly",
  process: "readonly",
  setTimeout: "readonly",
  clearTimeout: "readonly",
  setInterval: "readonly",
  clearInterval: "readonly",
  URL: "readonly",
};

export default defineConfig([
  {
    ignores: ["dist", "frontend", "node_modules", "docs", "vendor", "src/**/__tests__/**", "scripts/__tests__/**"],
  },
  {
    files: ["src/**/*.ts"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: projectDir,
      },
      globals: workerGlobals,
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/array-type": "off",
    },
  },
  {
    files: ["scripts/**/*.ts"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: projectDir,
      },
      globals: nodeGlobals,
      sourceType: "module",
    },
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/array-type": "off",
    },
  },
  {
    files: ["scripts/**/*.{js,mjs,cjs}"],
    extends: [js.configs.recommended],
    languageOptions: {
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
      globals: nodeGlobals,
    },
    rules: {
      "no-console": "off",
    },
  },
]);
