#!/usr/bin/env node
import { createWriteStream, existsSync, mkdirSync, copyFileSync } from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import tar from "tar";

async function main() {
  const rootDir = path.dirname(fileURLToPath(import.meta.url));
  const require = (await import("node:module")).createRequire(import.meta.url);

  let betterSqlitePkg;
  try {
    betterSqlitePkg = require("better-sqlite3/package.json");
  } catch {
    console.warn("[better-sqlite3] package not installed; skipping prebuilt fetch.");
    return;
  }

  const betterSqliteDir = path.dirname(require.resolve("better-sqlite3/package.json"));
  const bindingPath = path.join(betterSqliteDir, "build", "Release", "better_sqlite3.node");
  if (existsSync(bindingPath)) {
    return;
  }

  if (process.platform !== "win32") {
    console.warn(
      "[better-sqlite3] Native binding missing. Install platform build tools or run on Windows to download a prebuilt binary."
    );
    return;
  }

  const version = betterSqlitePkg.version;
  const abi = process.versions.modules;
  const arch = process.arch;
  const url = `https://github.com/WiseLibs/better-sqlite3/releases/download/v${version}/better-sqlite3-v${version}-node-v${abi}-${process.platform}-${arch}.tar.gz`;
  const tmpDir = path.join(rootDir, "..", ".tmp", "better-sqlite3");
  mkdirSync(tmpDir, { recursive: true });
  const archivePath = path.join(tmpDir, "prebuilt.tar.gz");

  console.info(`[better-sqlite3] Downloading ${url}`);
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }
  await pipeline(response.body, createWriteStream(archivePath));

  await tar.x({ file: archivePath, cwd: tmpDir });
  const extractedBinding = path.join(tmpDir, "build", "Release", "better_sqlite3.node");
  if (!existsSync(extractedBinding)) {
    throw new Error("[better-sqlite3] Extracted archive did not contain build/Release/better_sqlite3.node");
  }

  mkdirSync(path.dirname(bindingPath), { recursive: true });
  copyFileSync(extractedBinding, bindingPath);
  console.info(`[better-sqlite3] Installed prebuilt binding to ${bindingPath}`);
}

main().catch((error) => {
  console.warn("[better-sqlite3] Unable to install prebuilt binding:", error.message ?? error);
});
