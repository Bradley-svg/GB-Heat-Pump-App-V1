#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const clientDist = path.join(repoRoot, "dist", "client");

const uploads = [
  {
    key: "app/index.html",
    file: path.join(clientDist, "index.html"),
    contentType: "text/html",
    cacheControl: "no-store",
  },
  {
    key: "app/assets/index.js",
    file: path.join(clientDist, "assets", "index.js"),
    contentType: "application/javascript",
    cacheControl: "public, max-age=31536000, immutable",
  },
  {
    key: "app/assets/index.css",
    file: path.join(clientDist, "assets", "index.css"),
    contentType: "text/css",
    cacheControl: "public, max-age=31536000, immutable",
  },
];

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

const { env, dryRun } = parseArgs(process.argv);
const wranglerBin = process.env.WRANGLER_BIN ?? "wrangler";

if (!existsSync(clientDist)) {
  console.error("✖ Unable to find frontend build output at %s", clientDist);
  console.error("  Run `npm run frontend:build` before publishing assets.");
  process.exit(1);
}

for (const asset of uploads) {
  if (!existsSync(asset.file)) {
    console.error("✖ Missing asset %s (expected at %s)", asset.key, asset.file);
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

  console.log(`→ Uploading ${asset.key}`);
  if (dryRun) {
    console.log(`  ${wranglerBin} ${args.join(" ")}`);
    continue;
  }

  const result = spawnSync(wranglerBin, args, { stdio: "inherit" });
  if (result.status !== 0) {
    console.error(`✖ Upload failed for ${asset.key}`);
    process.exit(result.status ?? 1);
  }
}

console.log("✓ R2 assets uploaded successfully.");
