#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const FRONTEND_NODE_MODULES = resolve("apps", "dashboard-web", "node_modules");
const LINT_COMMAND = ["--prefix", "apps/dashboard-web", "run", "lint"];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env,
    ...options,
  });
  return typeof result.status === "number" ? result.status : 1;
}

function runFrontendLint() {
  if (!existsSync(FRONTEND_NODE_MODULES)) {
    console.warn("[lint] Frontend dependencies are not installed; skipping frontend lint.");
    return null;
  }

  const result = spawnSync("npm", LINT_COMMAND, {
    env: process.env,
    encoding: "utf8",
  });

  if (typeof result.status === "number" && result.status === 0) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    return 0;
  }

  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  if (/Cannot find package ["'][^"']*eslint-plugin[^"']*["']/.test(output)) {
    console.warn("[lint] Missing ESLint plugins; falling back to typecheck.");
    return null;
  }

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  return typeof result.status === "number" ? result.status : 1;
}

const frontendResult = runFrontendLint();
if (frontendResult === 0) {
  process.exit(0);
}
if (frontendResult === null) {
  const typecheckStatus = run("npm", ["run", "typecheck"]);
  process.exit(typecheckStatus);
}
process.exit(frontendResult);
