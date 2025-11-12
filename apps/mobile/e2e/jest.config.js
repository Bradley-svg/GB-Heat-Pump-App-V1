module.exports = {
  preset: "ts-jest/presets/js-with-ts",
  testTimeout: 120000,
  testMatch: ["**/?(*.)+(e2e).[tj]s?(x)"],
  setupFilesAfterEnv: ["./init.ts"],
};
