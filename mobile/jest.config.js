module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  collectCoverageFrom: ["src/components/**/*.tsx", "src/theme/**/*.tsx"],
  coverageThreshold: {
    global: { statements: 60, branches: 45, functions: 60, lines: 60 },
  },
  transformIgnorePatterns: [],
};
