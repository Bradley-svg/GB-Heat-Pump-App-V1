#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assetManifest from "../src/assets-manifest.json" assert { type: "json" };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const clientDist = path.join(repoRoot, "dist", "client");
const assetDir = path.join(clientDist, "assets");
const wranglerConfig = path.join(repoRoot, "wrangler.toml");
const workerAssetNames = new Set(Object.keys(assetManifest ?? {}));

const LONG_CACHE = "public,max-age=31536000,immutable";
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
    const filePath = path.join(assetDir, assetName);
    const contentType = contentTypeFor(assetName);
    uploads.push({
      key: `app/assets/${assetName}`,
      file: filePath,
      contentType,
      cacheControl: LONG_CACHE,
    });
    if (workerAssetNames.has(assetName)) {
      uploads.push({
        key: `assets/${assetName}`,
        file: filePath,
        contentType,
        cacheControl: LONG_CACHE,
      });
    }
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

function resolveBucketName() {
  if (process.env.R2_BUCKET_NAME) return process.env.R2_BUCKET_NAME;
  if (process.env.APP_STATIC_BUCKET) return process.env.APP_STATIC_BUCKET;
  if (existsSync(wranglerConfig)) {
    const source = readFileSync(wranglerConfig, "utf8");
    const match = source.match(/\[\[r2_buckets\]\][^\[]*?binding\s*=\s*"APP_STATIC"[^\[]*?bucket_name\s*=\s*"([^"]+)"/);
    if (match) return match[1];
  }
  console.warn("[publish-r2-assets] Warning: falling back to bucket name APP_STATIC. Set R2_BUCKET_NAME env var to override.");
  return "APP_STATIC";
}

if (!existsSync(clientDist)) {
  console.error("[publish-r2-assets] Error: missing frontend build output at %s", clientDist);
  console.error("Run `npm run frontend:build` before publishing assets.");
  process.exit(1);
}

const uploads = collectUploads();
const { env, dryRun } = parseArgs(process.argv);
const defaultWrangler = process.platform === "win32" ? "npx.cmd" : "npx";
const wranglerBin = process.env.WRANGLER_BIN ?? defaultWrangler;
const bucketName = resolveBucketName();
const target = (process.env.R2_TARGET ?? "remote").toLowerCase();
const locationArgs = target === "local" ? ["--local"] : ["--remote"];

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
    `${bucketName}/${asset.key}`,
    "--file",
    asset.file,
    "--content-type",
    asset.contentType,
    "--cache-control",
    asset.cacheControl,
    ...locationArgs,
  ];

  if (env) {
    args.push("--env", env);
  }

  console.log(`[publish-r2-assets] Uploading ${asset.key}`);
  if (dryRun) {
    console.log(`  ${wranglerBin} ${args.join(" ")}`);
    continue;
  }

    const fullArgs = /(npx(?:\.cmd)?|pnpx(?:\.cmd)?|yarn)$/i.test(wranglerBin) ? ["wrangler", ...args] : args;
  const result = spawnSync(wranglerBin, fullArgs, { stdio: "inherit", shell: process.platform === "win32" });
  if (result.error) {
    console.error("[publish-r2-assets] Spawn failed:", result.error);
  }
  if (result.status !== 0) {
    console.error("[publish-r2-assets] Error: upload failed for %s", asset.key);
    process.exit(result.status ?? 1);
  }
}

console.log(`[publish-r2-assets] Uploaded ${uploads.length} assets.`);





