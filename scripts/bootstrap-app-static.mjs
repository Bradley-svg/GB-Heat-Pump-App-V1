#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveBucketName } from "./publish-r2-assets.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

function formatArg(value) {
  if (process.platform === "win32" && /\s/.test(value)) {
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
  }
  return value;
}

function parseArgs(argv) {
  const args = { env: null, dryRun: false, skipSeed: false };
  for (let i = 2; i < argv.length; i += 1) {
    const current = argv[i];
    if (current === "--env" || current === "-e") {
      args.env = argv[i + 1] ?? null;
      i += 1;
    } else if (current === "--dry-run") {
      args.dryRun = true;
    } else if (current === "--skip-seed") {
      args.skipSeed = true;
    } else if (current === "--help" || current === "-h") {
      printHelp();
      process.exit(0);
    }
  }
  return args;
}

function printHelp() {
  console.log(`Usage: node scripts/bootstrap-app-static.mjs [options]

Ensures the APP_STATIC bucket exists and seeds it with the latest frontend build.

Options:
  --env, -e <name>   Override the wrangler environment (for example: production)
  --dry-run          Skip mutations; print the commands that would run
  --skip-seed        Create the bucket but do not upload assets
  --help, -h         Show this help message`);
}

function runWrangler(bin, args, { dryRun } = {}) {
  if (dryRun) {
    console.log(`[bootstrap-app-static] dry-run: ${bin} ${args.join(" ")}`);
    return { status: 0 };
  }
  const result = spawnSync(bin, args, {
    stdio: "pipe",
    shell: process.platform === "win32",
    cwd: repoRoot,
  });
  if (result.stdout?.length) process.stdout.write(result.stdout);
  if (result.stderr?.length) process.stderr.write(result.stderr);
  return result;
}

function ensureBucket({ wranglerBin, bucketName, env, dryRun }) {
  const args = ["r2", "bucket", "create", formatArg(bucketName)];
  if (env) args.push("--env", env);

  console.log(`[bootstrap-app-static] Ensuring bucket ${bucketName} exists...`);
  const result = runWrangler(wranglerBin, args, { dryRun });
  if (dryRun) return;
  if (result.status === 0) return;

  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.toLowerCase();
  if (output.includes("already exists") || output.includes("409")) {
    console.log(`[bootstrap-app-static] Bucket ${bucketName} already exists; continuing.`);
    return;
  }

  throw new Error(`[bootstrap-app-static] Failed to create bucket ${bucketName}. Inspect wrangler output above.`);
}

function runPublish({ env, dryRun }) {
  const npmBin = process.platform === "win32" ? "npm.cmd" : "npm";
  const publishArgs = ["run", "publish:r2", "--"];
  if (env) publishArgs.push("--env", env);
  if (dryRun) publishArgs.push("--dry-run");

  console.log(`[bootstrap-app-static] Seeding assets via npm run publish:r2 ${env ? `-- --env ${env}` : ""}${dryRun ? " --dry-run" : ""}`);
  const result = spawnSync(npmBin, publishArgs, { stdio: "inherit", cwd: repoRoot, shell: process.platform === "win32" });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error("[bootstrap-app-static] Asset publish failed. See logs above.");
  }
}

function main() {
  const args = parseArgs(process.argv);
  const defaultWrangler = process.platform === "win32" ? "npx.cmd" : "npx";
  const wranglerBin = process.env.WRANGLER_BIN ?? defaultWrangler;
  const bucketName = resolveBucketName({ env: args.env });

  ensureBucket({ wranglerBin, bucketName, env: args.env, dryRun: args.dryRun });
  if (!args.skipSeed) {
    runPublish({ env: args.env, dryRun: args.dryRun });
  } else {
    console.log("[bootstrap-app-static] Skipping asset upload (per --skip-seed).");
  }
  console.log("[bootstrap-app-static] Completed.");
}

if (import.meta.url === `file://${__filename}`) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
