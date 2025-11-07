module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  collectCoverageFrom: ["src/components/**/*.tsx", "src/theme/**/*.tsx"],
  coverageThreshold: {
    global: { statements: 80, branches: 55, functions: 85, lines: 85 },
  },
  testPathIgnorePatterns: ["<rootDir>/e2e/"],
  transformIgnorePatterns: [],
};
