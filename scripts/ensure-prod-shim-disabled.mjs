#!/usr/bin/env node

/**
 * Prevents production deploys when the development access shim flag is enabled.
 *
 * The script checks the default Worker environment plus any additional
 * `--env <name>` arguments by calling `wrangler secret list --json` and fails
 * when shim-related secrets or flags are present outside local development.
 * It also validates wrangler.toml so the shim cannot be enabled for non-local
 * environments via committed configuration.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const WRANGLER_BIN = "wrangler";
const WRANGLER_OPTIONS_BASE = {
  stdio: ["ignore", "pipe", "pipe"],
  encoding: "utf8",
};
const WRANGLER_OPTIONS = process.platform === "win32"
  ? { ...WRANGLER_OPTIONS_BASE, shell: true }
  : WRANGLER_OPTIONS_BASE;
const WRANGLER_CONFIG_PATH = new URL("../services/overseas-api/wrangler.toml", import.meta.url);
const PROHIBITED_ITEMS = [
  {
    name: "ALLOW_DEV_ACCESS_SHIM",
    description: "development access shim flag",
  },
  {
    name: "DEV_ALLOW_USER",
    description: "development shim user override",
  },
  {
    name: "ALLOW_RAW_INGEST",
    description: "raw CN bypass flag",
  },
];
const LOCAL_SECTION_PREFIX = "env.local";

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

function hasWranglerAuth() {
  return Boolean(
    process.env.CLOUDFLARE_API_TOKEN
      || process.env.WRANGLER_API_TOKEN
      || process.env.WRANGLER_AUTH_TOKEN
      || (process.env.CLOUDFLARE_API_KEY && process.env.CLOUDFLARE_EMAIL),
  );
}

function stripTomlInlineComment(line) {
  const hashIndex = line.indexOf("#");
  if (hashIndex === -1) {
    return line;
  }
  return line.slice(0, hashIndex);
}

function isAllowedLocalSection(section) {
  if (!section) {
    return false;
  }
  if (section === LOCAL_SECTION_PREFIX || section === `${LOCAL_SECTION_PREFIX}.vars`) {
    return true;
  }
  return section.startsWith(`${LOCAL_SECTION_PREFIX}.`);
}

function inspectWranglerConfig() {
  const findings = [];
  if (!existsSync(WRANGLER_CONFIG_PATH)) {
    return findings;
  }

  const contents = readFileSync(WRANGLER_CONFIG_PATH, "utf8");
  const lines = contents.split(/\r?\n/);
  let currentSection = "";

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const noComment = stripTomlInlineComment(trimmed).trim();
    if (!noComment) {
      continue;
    }

    if (/^\[\[.*\]\]$/.test(noComment)) {
      currentSection = noComment.slice(2, -2).trim();
      continue;
    }

    if (/^\[.*\]$/.test(noComment)) {
      currentSection = noComment.slice(1, -1).trim();
      continue;
    }

    for (const { name } of PROHIBITED_ITEMS) {
      if (new RegExp(`^${name}\\s*=`).test(noComment) && !isAllowedLocalSection(currentSection)) {
        findings.push({ name, section: currentSection || "root" });
      }
    }
  }

  return findings;
}

function addViolation(map, name, context) {
  if (!map.has(name)) {
    map.set(name, new Set());
  }
  map.get(name).add(context);
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
    const violationMap = new Map();
    const hasAuth = hasWranglerAuth();

    for (const { name } of PROHIBITED_ITEMS) {
      if (process.env[name] && process.env[name].trim()) {
        addViolation(violationMap, name, "CI environment variables");
      }
    }

    const configFindings = inspectWranglerConfig();
    for (const finding of configFindings) {
      addViolation(
        violationMap,
        finding.name,
        `wrangler.toml [${finding.section}]`,
      );
    }

    if (hasAuth) {
      const targets = [null, ...requestedEnvs];
      for (const envName of targets) {
        const { missing, secrets } = listSecrets(envName);
        if (missing) {
          console.warn(
            `[shim-check] Skipping ${envName ?? "default"} because the environment does not exist or has no secrets.`,
          );
          continue;
        }

        const names = extractNames(secrets);
        for (const { name } of PROHIBITED_ITEMS) {
          if (names.has(name)) {
            addViolation(
              violationMap,
              name,
              `Cloudflare secret (${envName ?? "default"})`,
            );
          }
        }
      }
    } else {
      console.warn(
        "[shim-check] Cloudflare API credentials were not provided. Skipping remote secret inspection.",
      );
    }

    if (violationMap.size > 0) {
      console.error("[shim-check] Development shim configuration detected:");
      for (const item of PROHIBITED_ITEMS) {
        if (!violationMap.has(item.name)) {
          continue;
        }
        const contexts = Array.from(violationMap.get(item.name)).join(", ");
        console.error(
          ` - ${item.name} (${item.description}) present in ${contexts}`,
        );
      }
      console.error(
        "[shim-check] Remove the shim secrets or flags from non-local environments and rerun.",
      );
      process.exit(1);
    }

    console.log(
      "[shim-check] No development shim secrets detected in deploy environments.",
    );
  } catch (error) {
    console.error(
      `[shim-check] ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}

main();
