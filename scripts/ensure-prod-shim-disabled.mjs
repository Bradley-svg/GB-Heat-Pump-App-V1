#!/usr/bin/env node

/**
 * Prevents production deploys when the development access shim flag is enabled.
 *
 * The script checks the default Worker environment plus any additional
 * `--env <name>` arguments by calling `wrangler secret list --json` and fails
 * when `ALLOW_DEV_ACCESS_SHIM` is present. It also surfaces a warning if
 * `DEV_ALLOW_USER` is configured, as that flag only makes sense with the shim.
 */

import { spawnSync } from "node:child_process";

const WRANGLER_BIN = "wrangler";
const WRANGLER_OPTIONS_BASE = {
  stdio: ["ignore", "pipe", "pipe"],
  encoding: "utf8",
};
const WRANGLER_OPTIONS = process.platform === "win32"
  ? { ...WRANGLER_OPTIONS_BASE, shell: true }
  : WRANGLER_OPTIONS_BASE;
const PROHIBITED_SECRET = "ALLOW_DEV_ACCESS_SHIM";
const WARN_ONLY_SECRET = "DEV_ALLOW_USER";

function parseArgs(argv) {
  const envs = [];
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--env") {
      const value = argv[i + 1];
      if (!value) {
        throw new Error("--env requires a value (e.g. --env production)");
      }
      envs.push(value);
      i += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  return envs;
}

function listSecrets(envName) {
  const args = ["secret", "list", "--format", "json"];
  if (envName) {
    args.push("--env", envName);
  }

  const result = spawnSync(WRANGLER_BIN, args, WRANGLER_OPTIONS);

  if (result.status !== 0) {
    const stderr = (result.stderr || "").toString();
    const stdout = (result.stdout || "").toString();
    const combined = `${stderr} ${stdout}`.toLowerCase();
    if (envName && /not\s+found|does\s+not\s+exist|10007/.test(combined)) {
      return { missing: true, secrets: [] };
    }

    const details = stderr.trim() || stdout.trim();
    const suffix = envName ? ` for environment "${envName}"` : "";
    throw new Error(
      `wrangler secret list${suffix} failed (exit ${result.status})${details ? `: ${details}` : ""}`,
    );
  }

  const stdout = (result.stdout || "").toString().trim();
  if (!stdout) {
    return { missing: false, secrets: [] };
  }

  try {
    const parsed = JSON.parse(stdout);
    if (!Array.isArray(parsed)) {
      throw new Error("unexpected response shape");
    }
    return { missing: false, secrets: parsed };
  } catch (error) {
    throw new Error(
      `Unable to parse wrangler secret list output${envName ? ` for "${envName}"` : ""}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function extractNames(secrets) {
  const names = new Set();
  for (const entry of secrets) {
    if (entry && typeof entry === "object" && typeof entry.name === "string") {
      names.add(entry.name);
    } else if (typeof entry === "string") {
      names.add(entry);
    }
  }
  return names;
}

function main() {
  try {
    const requestedEnvs = parseArgs(process.argv.slice(2));
    const targets = [null, ...requestedEnvs];
    const violations = [];
    const warnings = [];

    if (process.env.ALLOW_DEV_ACCESS_SHIM && process.env.ALLOW_DEV_ACCESS_SHIM.trim()) {
      violations.push("pipeline environment variables");
    }

    for (const envName of targets) {
      const { missing, secrets } = listSecrets(envName);
      if (missing) {
        console.warn(
          `[shim-check] Skipping ${envName} because the environment does not exist or has no secrets.`,
        );
        continue;
      }

      const names = extractNames(secrets);
      if (names.has(PROHIBITED_SECRET)) {
        violations.push(envName ?? "default");
      }
      if (names.has(WARN_ONLY_SECRET)) {
        warnings.push(envName ?? "default");
      }
    }

    if (warnings.length > 0) {
      console.warn(
        `[shim-check] ${WARN_ONLY_SECRET} is configured for ${warnings.join(
          ", ",
        )}. Remove it in production environments.`,
      );
    }

    if (violations.length > 0) {
      console.error(
        `[shim-check] ${PROHIBITED_SECRET} is enabled for ${violations.join(
          ", ",
        )}. Disable it before deploying.`,
      );
      process.exit(1);
    }

    console.log("[shim-check] No development shim flags detected in deploy environments.");
  } catch (error) {
    console.error(
      `[shim-check] ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}

main();
