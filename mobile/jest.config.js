module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  collectCoverageFrom: ["src/components/**/*.tsx", "src/theme/**/*.tsx"],
  coverageThreshold: { global: { statements: 20, branches: 10, functions: 20, lines: 20 } },
  transformIgnorePatterns: []
};
