import baseConfig from "../../shared/configs/vitest.base";
import { mergeConfig } from "vitest/config";

export default mergeConfig(baseConfig, {
  test: {
    include: ["src/**/*.test.tsx"],
  },
});
