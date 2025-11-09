import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    reporters: ["default"],
    coverage: {
      provider: "v8",
      all: true,
      reporter: ["text", "lcov"],
    },
    environment: "node",
  },
});
