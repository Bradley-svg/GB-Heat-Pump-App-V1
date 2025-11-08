import { device } from "detox";
import { spawnSync } from "node:child_process";

function runOrThrow(command: string, args: string[]) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
}

function getDeviceIdentifier(): string | undefined {
  return (
    (device as any).id ??
    (device as any)._deviceId ??
    process.env.DETOX_DEVICE_ID ??
    undefined
  );
}

export async function openAlertsViaUriScheme() {
  const platform = device.getPlatform();
  const args = ["uri-scheme", "open", "greenbro://alerts"];
  if (platform === "ios") {
    args.push("--ios");
  } else {
    args.push("--android");
  }
  runOrThrow("npx", args);
}

export async function setSystemTheme(mode: "light" | "dark") {
  const platform = device.getPlatform();
  const identifier = getDeviceIdentifier();

  if (platform === "ios") {
    if (!identifier) {
      throw new Error("Missing simulator identifier for appearance toggle");
    }
    runOrThrow("xcrun", ["simctl", "ui", identifier, "appearance", mode]);
  } else {
    const nightValue = mode === "dark" ? "2" : "1";
    const baseArgs = [
      "shell",
      "settings",
      "put",
      "secure",
      "ui_night_mode",
      nightValue,
    ];
    const args =
      identifier && identifier.trim().length > 0
        ? ["-s", identifier, ...baseArgs]
        : baseArgs;
    runOrThrow("adb", args);
  }

  await new Promise((resolve) => setTimeout(resolve, 750));
}
