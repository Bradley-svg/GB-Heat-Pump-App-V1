#!/usr/bin/env node
/**
 * CI/Pre-commit guard that scans tracked files for forbidden PII field names.
 * Usage: node SCRIPTS/forbidden-fields-lint.js
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoUrl = new URL("../", import.meta.url);
const repoRoot = fileURLToPath(repoUrl);
const allowFiles = new Set([
  "packages/sdk-core/src/constants.ts",
  "services/cn-gateway/src/modea/drop-safe.ts",
  "shared/theme/greenbro.tokens.json",
]);
const noisyFields = ["name", "notes", "photo", "image", "city"];
const forbiddenFields = [
  "fullName",
  "address",
  "street",
  "province",
  "postal",
  "phone",
  "email",
  "ip",
  "mac",
  "serial",
  "imei",
  "imsi",
  "meid",
  "gps",
  "lat",
  "lng",
  "geohash",
  "ssid",
  "bssid",
  "hostname",
  "ssid_password",
  "router_mac",
  "freeText",
  "rawPayload",
];

const watchPrefixes = [
  "packages/sdk-core/",
  "packages/sdk-web/",
  "packages/sdk-rn/",
  "services/cn-gateway/",
  "services/overseas-api/",
  "shared/",
  "src/",
];

const ignorePatterns = [
  /^node_modules\//,
  /^\.git\//,
  /^\.tmp\//,
  /^dist\//,
  /^apps\/dashboard-web\/dist\//,
  /^mobile\/ios\//,
  /^mobile\/android\//,
  /^docs\//,
  /^README/i,
  /^CHANGELOG/i,
  /\.md$/i,
  /\.mdx$/i,
  /package(?:-lock)?\.json$/i,
  /\.png$/i,
  /\.jpg$/i,
  /\.jpeg$/i,
  /\.ico$/i,
  /\.svg$/i,
  /\.lock$/i,
  /pnpm-lock\.yaml$/,
];

const regexCache = [
  ...forbiddenFields.map((term) => ({
    term,
    regex: new RegExp(`["'\\\`]${escapeRegExp(term)}["'\\\`]`, "i"),
  })),
  ...noisyFields.map((term) => ({
    term,
    regex: new RegExp(`["']${escapeRegExp(term)}["']\\s*:`, "i"),
  })),
];

const files = listFiles();
const findings = [];

for (const file of files) {
  if (allowFiles.has(file)) continue;
  if (!watchPrefixes.some((prefix) => file.startsWith(prefix))) continue;
  if (ignorePatterns.some((pattern) => pattern.test(file))) continue;
  let content;
  try {
    content = readFileSync(new URL(file, repoUrl));
  } catch {
    continue;
  }
  if (isBinary(content)) continue;
  const text = content.toString("utf8");
  const lines = text.split(/\r?\n/);
  lines.forEach((line, idx) => {
    regexCache.forEach(({ term, regex }) => {
      if (regex.test(line)) {
        findings.push({
          file,
          line: idx + 1,
          term,
          snippet: line.trim().slice(0, 200),
        });
      }
    });
  });
}

if (findings.length) {
  console.error("Forbidden field names detected:");
  findings.forEach(({ file, line, term, snippet }) => {
    console.error(`- ${file}:${line} => "${term}" :: ${snippet}`);
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
