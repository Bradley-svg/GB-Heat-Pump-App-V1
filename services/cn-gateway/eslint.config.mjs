import baseConfig from "../../shared/configs/eslint.base.mjs";

export default [
  {
    ignores: ["dist", "migrations/**/*.d.ts", "test/**/*.d.ts"],
  },
  ...baseConfig,
];
