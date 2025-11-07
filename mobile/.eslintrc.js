module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.json",
    tsconfigRootDir: __dirname,
    ecmaFeatures: { jsx: true },
  },
  extends: ["universe/native", "universe/shared/typescript-analysis", "prettier"],
  plugins: ["prettier", "react-native"],
  rules: {
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "prettier/prettier": "error",
    "import/order": [
      "error",
      {
        groups: [["builtin", "external"], ["internal"], ["parent", "sibling", "index"]],
        "newlines-between": "always",
        alphabetize: { order: "asc", caseInsensitive: true }
      }
    ],
    "react-native/no-inline-styles": "error",
    "no-void": ["error", { allowAsStatement: true }]
  },
};
