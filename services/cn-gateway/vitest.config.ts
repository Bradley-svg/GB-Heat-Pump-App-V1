import baseConfig from "../../shared/configs/vitest.base";
import { mergeConfig } from "vitest/config";

export default mergeConfig(baseConfig, {
  test: {
    root: "./",
    include: ["src/**/*.test.ts"]
  },
});
