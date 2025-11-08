import {
  getStateFromPath as defaultGetStateFromPath,
  type LinkingOptions,
} from "@react-navigation/native";

import type { RootTabsParamList } from "./AppNavigator";

const prefixes = ["greenbro://", "https://app.greenbro.com"];

const linkingConfig: LinkingOptions<RootTabsParamList>["config"] = {
  screens: {
    Dashboard: "",
    Device: "device",
    Alerts: "alerts",
  },
};

const SEGMENT_TO_PATH: Record<string, string> = {
  "": "",
  dashboard: "",
  alerts: "alerts",
  alert: "alerts",
  device: "device",
  devices: "device",
};

const FALLBACK_SEGMENT = "";

export function sanitizeLinkPath(rawPath?: string | null): string {
  if (!rawPath) {
    return FALLBACK_SEGMENT;
  }

  const working = rawPath.trim();
  if (!working) {
    return FALLBACK_SEGMENT;
  }

  const traversalPattern = /(\.\.|%2e%2e)/gi;
  if (traversalPattern.test(working)) {
    return FALLBACK_SEGMENT;
  }

  let pathname = working;

  try {
    // First, try to treat the incoming value as a full URL
    const parsed = new URL(working);
    pathname = parsed.pathname;
  } catch {
    try {
      // If the incoming value was a relative path, coerce it into a valid URL
      const parsed = new URL(
        working.startsWith("/") ? working : `/${working}`,
        "https://link-sanitizer.local",
      );
      pathname = parsed.pathname;
    } catch {
      pathname = working;
    }
  }

  const cleanPath = pathname
    .split("?")[0]!
    .split("#")[0]!
    .replace(/^\/+/, "")
    .toLowerCase();

  const [segment] = cleanPath.split("/");

  return SEGMENT_TO_PATH[segment ?? ""] ?? FALLBACK_SEGMENT;
}

export const linking: LinkingOptions<RootTabsParamList> = {
  prefixes,
  config: linkingConfig,
  getStateFromPath(path, options) {
    const sanitized = sanitizeLinkPath(path);
    return defaultGetStateFromPath(
      sanitized,
      options ?? (linkingConfig as any),
    );
  },
};
