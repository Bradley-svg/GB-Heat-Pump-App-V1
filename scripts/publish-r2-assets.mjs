#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const clientDist = path.join(repoRoot, "dist", "client");
const assetDir = path.join(clientDist, "assets");

const LONG_CACHE = "public, max-age=31536000, immutable";
const CONTENT_TYPES = new Map([
  [".js", "application/javascript"],
  [".css", "text/css"],
  [".json", "application/json"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
  [".map", "application/json"],
  [".ico", "image/x-icon"],
]);

function contentTypeFor(name) {
  const ext = path.extname(name).toLowerCase();
  return CONTENT_TYPES.get(ext) ?? "application/octet-stream";
}

function collectUploads() {
  const uploads = [
    {
      key: "app/index.html",
      file: path.join(clientDist, "index.html"),
      contentType: "text/html",
      cacheControl: "no-store",
    },
  ];

  if (!existsSync(assetDir)) {
    console.warn("[publish-r2-assets] Warning: missing assets directory at %s", assetDir);
    return uploads;
  }

  const entries = readdirSync(assetDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const assetName = entry.name;
    uploads.push({
      key: `app/assets/${assetName}`,
      file: path.join(assetDir, assetName),
      contentType: contentTypeFor(assetName),
      cacheControl: LONG_CACHE,
    });
  }

  uploads.sort((a, b) => a.key.localeCompare(b.key));
  return uploads;
}

function parseArgs(argv) {
  const args = { env: null, dryRun: false };
  for (let i = 2; i < argv.length; i += 1) {
    const current = argv[i];
    if (current === "--env" || current === "-e") {
      args.env = argv[i + 1] ?? null;
      i += 1;
    } else if (current === "--dry-run") {
      args.dryRun = true;
    }
  }
  return args;
}

if (!existsSync(clientDist)) {
  console.error("[publish-r2-assets] Error: missing frontend build output at %s", clientDist);
  console.error("Run `npm run frontend:build` before publishing assets.");
  process.exit(1);
}

const uploads = collectUploads();
const { env, dryRun } = parseArgs(process.argv);
const wranglerBin = process.env.WRANGLER_BIN ?? "wrangler";

for (const asset of uploads) {
  if (!existsSync(asset.file)) {
    console.error("[publish-r2-assets] Error: missing asset %s (expected at %s)", asset.key, asset.file);
    process.exit(1);
  }
}

for (const asset of uploads) {
  const args = [
    "r2",
    "object",
    "put",
    `APP_STATIC/${asset.key}`,
    "--file",
    asset.file,
    "--content-type",
    asset.contentType,
    "--cache-control",
    asset.cacheControl,
  ];

  if (env) {
    args.push("--env", env);
  }

  console.log(`[publish-r2-assets] Uploading ${asset.key}`);
  if (dryRun) {
    console.log(`  ${wranglerBin} ${args.join(" ")}`);
    continue;
  }

  const result = spawnSync(wranglerBin, args, { stdio: "inherit" });
  if (result.status !== 0) {
    console.error("[publish-r2-assets] Error: upload failed for %s", asset.key);
    process.exit(result.status ?? 1);
  }
}

console.log(`[publish-r2-assets] Uploaded ${uploads.length} assets.`);
