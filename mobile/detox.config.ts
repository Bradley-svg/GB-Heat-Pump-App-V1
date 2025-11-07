import type { DetoxConfig } from "detox";

const config: DetoxConfig = {
  testRunner: "jest",
  runnerConfig: "e2e/jest.config.js",
  apps: {
    "ios.sim.debug": {
      type: "ios.app",
      binaryPath:
        "ios/build/Build/Products/Debug-iphonesimulator/greenbro-mobile.app",
      build:
        "EXPO_NO_TELEMETRY=1 expo run:ios --scheme greenbro-mobile --configuration Debug --no-install",
    },
    "android.emu.debug": {
      type: "android.apk",
      binaryPath: "android/app/build/outputs/apk/debug/app-debug.apk",
      build:
        "EXPO_NO_TELEMETRY=1 expo run:android --variant debug --no-install",
    },
  },
  devices: {
    simulator: {
      type: "ios.simulator",
      device: {
        type: "iPhone 15",
      },
    },
    emulator: {
      type: "android.emulator",
      device: {
        avdName: "Pixel_7_API_34",
      },
    },
  },
  configurations: {
    "ios.sim.debug": {
      device: "simulator",
      app: "ios.sim.debug",
    },
    "android.emu.debug": {
      device: "emulator",
      app: "android.emu.debug",
    },
  },
};

export default config;
