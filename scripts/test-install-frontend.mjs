#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const scriptPath = resolve("scripts", "install-frontend.mjs");
const npmrcPath = resolve("frontend", ".npmrc");
const sentinel = "; existing npmrc should be preserved\nregistry=https://custom.invalid/\n";

try {
  writeFileSync(npmrcPath, sentinel, "utf8");
} catch (error) {
  console.error("[install-frontend-test] Unable to seed frontend/.npmrc:", error);
  process.exit(1);
}

const env = { ...process.env, PATH: "" };
let result;
try {
  result = spawnSync("node", [scriptPath, "--dry-run"], {
    env,
    encoding: "utf8",
  });
} finally {
  const restored = readFileSync(npmrcPath, "utf8");
  if (restored !== sentinel) {
    try {
      writeFileSync(npmrcPath, sentinel, "utf8");
    } catch {
      // ignore secondary failure; we'll still report below
    }
    console.error("[install-frontend-test] Installer did not restore the original .npmrc content.");
    process.exit(1);
  }
}

if (result.status === 0) {
  console.error("[install-frontend-test] Expected the installer to fail when npm is unavailable.");
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  process.exit(1);
}

console.log(
  `[install-frontend-test] Installer failed as expected with exit code ${result.status ?? "null"}.`,
);
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
process.exit(0);
