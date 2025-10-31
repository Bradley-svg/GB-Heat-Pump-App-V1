export interface AppConfig {
  apiBase: string;
  assetBase: string;
  returnDefault: string;
}

const DEFAULT_APP_CONFIG: AppConfig = {
  apiBase: "",
  assetBase: "/assets/",
  returnDefault: "/",
};

declare global {
  interface Window {
    __APP_CONFIG__?: Partial<AppConfig>;
  }
}

export function readAppConfig(): AppConfig {
  if (typeof window === "undefined") {
    return DEFAULT_APP_CONFIG;
  }
  const raw = window.__APP_CONFIG__ ?? {};
  return {
    apiBase: typeof raw.apiBase === "string" ? raw.apiBase : DEFAULT_APP_CONFIG.apiBase,
    assetBase: typeof raw.assetBase === "string" ? raw.assetBase : DEFAULT_APP_CONFIG.assetBase,
    returnDefault:
      typeof raw.returnDefault === "string" ? raw.returnDefault : DEFAULT_APP_CONFIG.returnDefault,
  };
}

export function resolveReturnUrl(config: AppConfig): string {
  if (typeof window === "undefined") {
    return config.returnDefault;
  }
  const search = new URLSearchParams(window.location.search);
  return search.get("return") ?? config.returnDefault;
}
