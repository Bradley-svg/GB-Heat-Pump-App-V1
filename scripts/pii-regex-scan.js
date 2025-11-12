#!/usr/bin/env node
/**
 * Repo-wide heuristic scan for embedded identifiers (IP, MAC, IMEI, GPS, etc).
 * Usage: node SCRIPTS/pii-regex-scan.js
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const repoUrl = new URL("../", import.meta.url);
const repoRoot = fileURLToPath(repoUrl);
const watchPrefixes = [
  "apps/",
  "services/",
  "packages/",
  "scripts/",
  "SCRIPTS/",
  "shared/",
  "docs/",
  "ops/",
];

const patterns = [
  { label: "IPv4", regex: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d?\d)(?:\.|$)){4}\b/g },
  { label: "MAC", regex: /\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b/g },
  { label: "IMEI", regex: /\b\d{14,16}\b/g },
  { label: "GPS", regex: /\b-?\d{1,2}\.\d{4,}\s*,\s*-?\d{1,3}\.\d{4,}\b/g },
];

const ignorePatterns = [
  /^node_modules\//,
  /^\.git\//,
  /^\.tmp\//,
  /^dist\//,
  /\.png$/i,
  /\.jpg$/i,
  /\.jpeg$/i,
  /\.ico$/i,
  /\.svg$/i,
  /\.md$/i,
  /\.mdx$/i,
  /package(?:-lock)?\.json$/i,
  /pnpm-lock\.yaml$/i,
];

const files = listFiles();
const hits = [];

for (const file of files) {
  if (!watchPrefixes.some((prefix) => file.startsWith(prefix))) continue;
  if (ignorePatterns.some((pattern) => pattern.test(file))) continue;
  let buffer;
  try {
    buffer = readFileSync(new URL(file, repoUrl));
  } catch {
    continue;
  }
  if (isBinary(buffer)) continue;
  const text = buffer.toString("utf8");
  const lines = text.split(/\r?\n/);
  patterns.forEach(({ label, regex }) => {
    lines.forEach((line, idx) => {
      regex.lastIndex = 0;
      if (regex.test(line)) {
        hits.push({
          file,
          line: idx + 1,
          label,
          snippet: line.trim().slice(0, 200),
        });
      }
    });
  });
}

if (hits.length) {
  console.error("Potential embedded identifiers detected:");
  hits.forEach(({ file, line, label, snippet }) => {
    console.error(`- ${file}:${line} [${label}] ${snippet}`);
  });
  process.exit(1);
}

function listFiles() {
  try {
    const output = execSync("git ls-files", { cwd: repoRoot });
    return output
      .toString("utf8")
      .split(/\r?\n/)
      .filter(Boolean)
      .map((file) => file.replace(/\\/g, "/"));
  } catch {
    return [];
  }
}

function isBinary(buffer) {
  const sample = buffer.subarray(0, 1024);
  return sample.includes(0);
}
