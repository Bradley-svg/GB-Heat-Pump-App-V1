#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const scriptPath = resolve("scripts", "install-frontend.mjs");
const env = { ...process.env, PATH: "" };
const result = spawnSync("node", [scriptPath, "--dry-run"], {
  env,
  encoding: "utf8",
});

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
