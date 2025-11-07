module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.json",
    tsconfigRootDir: __dirname,
    ecmaFeatures: { jsx: true }
  },
  extends: ["universe/native", "universe/shared/typescript-analysis"],
  rules: {
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "prettier/prettier": "off",
    "import/order": "off",
    "no-void": "off"
  }
};
