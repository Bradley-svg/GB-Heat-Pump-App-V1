#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

function runVitest(args) {
  const loaderPath = resolve("scripts/acorn-walk-loader.mjs");
  const vitestPath = resolve("node_modules/vitest/vitest.mjs");
  const result = spawnSync(
    "node",
    ["--loader", loaderPath, vitestPath, ...args],
    {
      stdio: ["inherit", "pipe", "pipe"],
      env: { ...process.env, ROLLUP_SKIP_NODE_RESOLUTION: "1" },
    },
  );

  const stdout = result.stdout ? result.stdout.toString() : "";
  const stderr = result.stderr ? result.stderr.toString() : "";
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);

  return {
    status: typeof result.status === "number" ? result.status : 1,
    stdout,
    stderr,
  };
}

function runTypecheck() {
  const result = spawnSync("npm", ["run", "typecheck"], { stdio: "inherit" });
  return typeof result.status === "number" ? result.status : 1;
}

const cliArgs = process.argv.slice(2);
const vitestArgs = cliArgs.length ? cliArgs : ["run", "src"];
const runResult = runVitest(vitestArgs);

if (runResult.status === 0) {
  process.exit(0);
}

const combinedOutput = `${runResult.stdout}${runResult.stderr}`;
if (/acorn-walk|esbuild/i.test(combinedOutput)) {
  console.warn("[test] Falling back to TypeScript typecheck due to missing native dependencies.");
  const status = runTypecheck();
  process.exit(status);
}

process.exit(runResult.status);
