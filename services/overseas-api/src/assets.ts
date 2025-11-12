import manifest from "./assets-manifest.json" assert { type: "json" };
import { STATIC_BUNDLE } from "./frontend/static-bundle";
import { SVG_CT } from "./utils/responses";

type AssetManifest = Record<string, string>;

const MANIFEST = manifest as AssetManifest;

function bundledAssetBody(name: string): string | null {
  const key = `assets/${name}`;
  const bundled = (STATIC_BUNDLE as Record<string, string | undefined>)[key];
  return typeof bundled === "string" ? bundled : null;
}

export const ASSETS: Record<string, { ct: string; body: string }> = Object.fromEntries(
  Object.entries(MANIFEST).map(([name, fallback]) => {
    const body = bundledAssetBody(name) ?? fallback;
    return [name, { ct: SVG_CT, body }];
  }),
);
