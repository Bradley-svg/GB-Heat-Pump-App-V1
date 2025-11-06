import { defineConfig, configDefaults } from "vitest/config";

const isCi = Boolean(process.env.CI ?? process.env.GITHUB_ACTIONS);
const enableCoverage = isCi || process.env.VITEST_COVERAGE === "true";

export default defineConfig({
  test: {
    environment: "node",
    exclude: [...configDefaults.exclude, "frontend/**"],
    reporters: isCi
      ? [
          "default",
          [
            "junit",
            {
              outputFile: "coverage/vitest-junit.xml",
              suiteName: "worker-tests",
            },
          ],
        ]
      : ["default"],
    coverage: {
      enabled: enableCoverage,
      reporter: ["text", "lcov"],
      reportsDirectory: "coverage",
    },
  },
});
