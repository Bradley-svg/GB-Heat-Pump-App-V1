import { device } from "detox";
import { spawnSync } from "node:child_process";

const isWindows = process.platform === "win32";

function runOrThrow(
  command: string,
  args: string[],
  options: { windowsCmd?: boolean } = {},
) {
  const needsCmd = options.windowsCmd === true && isWindows;
  const resolvedCommand =
    needsCmd && !command.toLowerCase().endsWith(".cmd") ? `${command}.cmd` : command;
  const result = spawnSync(resolvedCommand, args, { stdio: "inherit" });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`Command failed: ${resolvedCommand} ${args.join(" ")}`);
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
  runOrThrow("npx", args, { windowsCmd: true });
}

export async function setSystemTheme(mode: "light" | "dark") {
  const platform = device.getPlatform();
  const identifier = getDeviceIdentifier();

  if (platform === "ios") {
    if (!identifier) {
      throw new Error("Missing simulator identifier for appearance toggle");
    }
    runOrThrow("xcrun", ["simctl", "ui", identifier, "appearance", mode], {
      windowsCmd: false,
    });
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
    runOrThrow("adb", args, { windowsCmd: false });
  }

  await new Promise((resolve) => setTimeout(resolve, 750));
}
