#!/usr/bin/env node

/**
 * Automates binding required Cloudflare Worker secrets so `validateEnv` passes.
 *
 * Usage examples:
 *   ACCESS_AUD=... CURSOR_SECRET=... node scripts/bind-cloudflare-secrets.mjs --env production
 *   CF_SECRET_ACCESS_JWKS_URL=... node scripts/bind-cloudflare-secrets.mjs --env staging --dry-run
 *
 * Each secret value can be provided via either $NAME or $CF_SECRET_NAME. Required
 * secrets must be present unless --allow-missing option is passed (not recommended).
 * Optional development shim flags (ALLOW_DEV_ACCESS_SHIM, DEV_ALLOW_USER) are populated
 * when supplied.
 */

import { spawnSync } from "node:child_process";

const OPTION_PARSERS = {
  "--env": (ctx, value) => {
    if (!value) {
      throw new Error("--env requires a value (e.g. --env production)");
    }
    ctx.env = value;
  },
  "--dry-run": (ctx) => {
    ctx.dryRun = true;
  },
  "--allow-missing": (ctx) => {
    ctx.allowMissing = true;
  },
};

const REQUIRED_SECRETS = [
  {
    name: "ACCESS_AUD",
    description: "Cloudflare Access audience tag issued to the Worker",
  },
  {
    name: "ACCESS_JWKS_URL",
    description: "Cloudflare Access JWKS endpoint used to validate tokens",
  },
  {
    name: "CURSOR_SECRET",
    description: "Secret for cursor HMAC signatures (min length 16 characters)",
    validate: (value) => {
      if (value.length < 16) {
        throw new Error("CURSOR_SECRET must be at least 16 characters long");
      }
    },
  },
  {
    name: "INGEST_ALLOWED_ORIGINS",
    description: "Comma separated list of approved ingest origins",
  },
  {
    name: "INGEST_RATE_LIMIT_PER_MIN",
    description: "Maximum ingest calls per minute (numeric string)",
    validate: (value) => {
      if (!/^\d+$/.test(value)) {
        throw new Error("INGEST_RATE_LIMIT_PER_MIN must be a number");
      }
    },
  },
  {
    name: "INGEST_SIGNATURE_TOLERANCE_SECS",
    description: "Maximum allowed ingest signature age in seconds (numeric string)",
    validate: (value) => {
      if (!/^\d+$/.test(value)) {
        throw new Error("INGEST_SIGNATURE_TOLERANCE_SECS must be a number");
      }
    },
  },
  {
    name: "ASSET_SIGNING_SECRET",
    description: "Shared secret for signed R2 asset URLs",
  },
];

const OPTIONAL_SECRETS = [
  {
    name: "ALLOW_DEV_ACCESS_SHIM",
    description: "Enable Access shim for development (truthy string)",
  },
  {
    name: "DEV_ALLOW_USER",
    description: "JSON payload used when Access shim is enabled",
  },
];

function parseOptions(argv) {
  const context = {
    env: undefined,
    dryRun: false,
    allowMissing: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const parser = OPTION_PARSERS[token];
    if (!parser) {
      throw new Error(`Unknown option: ${token}`);
    }

    const next = argv[i + 1];
    if (parser.length === 2) {
      parser(context, next);
      i += 1;
    } else {
      parser(context);
    }
  }

  return context;
}

function resolveSecretValue(name) {
  const primary = process.env[name];
  if (primary && primary.length > 0) {
    return primary;
  }

  const prefixed = process.env[`CF_SECRET_${name}`];
  if (prefixed && prefixed.length > 0) {
    return prefixed;
  }

  return undefined;
}

function runWranglerPut(secretName, value, env, dryRun) {
  if (dryRun) {
    console.log(`[dry-run] wrangler secret put ${secretName}${env ? ` --env ${env}` : ""}`);
    return;
  }

  const args = ["secret", "put", secretName];
  if (env) {
    args.push("--env", env);
  }

  const result = spawnSync("wrangler", args, {
    input: `${value}\n`,
    stdio: ["pipe", "inherit", "inherit"],
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`wrangler secret put ${secretName} failed with exit code ${result.status}`);
  }
}

function ensureSecrets(entries, ctx, { required }) {
  for (const entry of entries) {
    const value = resolveSecretValue(entry.name);

    if (!value || value.length === 0) {
      if (required && !ctx.allowMissing) {
        throw new Error(
          `Missing value for ${entry.name}. Provide it via environment variable ${entry.name} or CF_SECRET_${entry.name}.`
        );
      }

      if (value === undefined) {
        console.warn(
          `Skipping ${entry.name}; no value found in environment. (${entry.description})`
        );
      }
      continue;
    }

    if (entry.validate) {
      entry.validate(value);
    }

    runWranglerPut(entry.name, value, ctx.env, ctx.dryRun);
  }
}

function main() {
  try {
    const ctx = parseOptions(process.argv.slice(2));

    console.log("Binding required Cloudflare secrets...");
    ensureSecrets(REQUIRED_SECRETS, ctx, { required: true });

    console.log("Binding optional development secrets (if provided)...");
    ensureSecrets(OPTIONAL_SECRETS, ctx, { required: false });

    console.log("Secrets have been processed.");
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
