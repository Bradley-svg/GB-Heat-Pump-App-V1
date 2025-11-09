import baseConfig from "../../shared/configs/vitest.base";
import { mergeConfig } from "vitest/config";

export default mergeConfig(baseConfig, {
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"]
  },
});
