import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const rootDir = dirname(fileURLToPath(import.meta.url));
const reactNativeStub = resolve(rootDir, "../../tests/react-native-stub.ts");

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
  resolve: {
    alias: [{ find: /^react-native$/, replacement: reactNativeStub }],
  },
});
