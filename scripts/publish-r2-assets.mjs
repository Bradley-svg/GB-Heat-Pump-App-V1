#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const clientDist = path.join(repoRoot, "dist", "client");
const assetDir = path.join(clientDist, "assets");
const wranglerConfig = path.join(repoRoot, "wrangler.toml");

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

function formatArg(value) {
  if (process.platform === "win32" && /\s/.test(value)) {
    // Escape any embedded quotes by doubling them
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
  }
  return value;
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

function stripInlineComment(line) {
  let inQuotes = false;
  let result = "";
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && line[i - 1] !== "\\") {
      inQuotes = !inQuotes;
    } else if (char === "#" && !inQuotes) {
      break;
    }
    result += char;
  }
  return result;
}

function parseR2BucketEntries(source) {
  const entries = [];
  let currentBlock = null;
  let currentBinding = null;
  let currentBucket = null;

  const flush = () => {
    if (!currentBlock) return;
    if (!currentBinding || !currentBucket) return;
    entries.push({
      block: currentBlock,
      binding: currentBinding,
      bucket: currentBucket,
    });
  };

  const lines = source.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = stripInlineComment(rawLine).trim();
    if (!line) continue;

    const blockMatch = line.match(/^\[\[(.+)\]\]$/);
    if (blockMatch) {
      flush();
      currentBlock = blockMatch[1].trim();
      currentBinding = null;
      currentBucket = null;
      continue;
    }

    if (!currentBlock) continue;

    const assignmentMatch = line.match(/^([A-Za-z0-9_.-]+)\s*=\s*(.+)$/);
    if (!assignmentMatch) continue;

    const [, key, rawValue] = assignmentMatch;
    let value = rawValue.trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }

    if (key === "binding") {
      currentBinding = value;
    } else if (key === "bucket_name") {
      currentBucket = value;
    }
  }

  flush();
  return entries;
}

function findBucket(entries, blockName, bindingName) {
  const entry = entries.find((candidate) => candidate.block === blockName && candidate.binding === bindingName);
  return entry ? entry.bucket : null;
}

function resolveBucketName({ env, configPath = wranglerConfig, envVars = process.env, configSource } = {}) {
  if (envVars.R2_BUCKET_NAME) return envVars.R2_BUCKET_NAME;
  if (envVars.APP_STATIC_BUCKET) return envVars.APP_STATIC_BUCKET;

  let source = configSource;
  if (source === undefined && existsSync(configPath)) {
    source = readFileSync(configPath, "utf8");
  }

  if (typeof source === "string") {
    const entries = parseR2BucketEntries(source);
    if (env) {
      const envBucket = findBucket(entries, `env.${env}.r2_buckets`, "APP_STATIC");
      if (envBucket) return envBucket;
    }

    const defaultBucket = findBucket(entries, "r2_buckets", "APP_STATIC");
    if (defaultBucket) return defaultBucket;
  }

  console.warn("[publish-r2-assets] Warning: falling back to bucket name APP_STATIC. Set R2_BUCKET_NAME env var to override.");
  return "APP_STATIC";
}

function main() {
  if (!existsSync(clientDist)) {
    console.error("[publish-r2-assets] Error: missing frontend build output at %s", clientDist);
    console.error("Run `npm run frontend:build` before publishing assets.");
    process.exit(1);
  }

  const uploads = collectUploads();
  const { env, dryRun } = parseArgs(process.argv);
  const defaultWrangler = process.platform === "win32" ? "npx.cmd" : "npx";
  const wranglerBin = process.env.WRANGLER_BIN ?? defaultWrangler;
  const bucketName = resolveBucketName({ env });
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
      formatArg(`${bucketName}/${asset.key}`),
      "--file",
      formatArg(asset.file),
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
}

function isMainModule() {
  const entry = process.argv[1];
  if (!entry) return false;
  return path.resolve(entry) === __filename;
}

if (isMainModule()) {
  main();
}

export { resolveBucketName };




