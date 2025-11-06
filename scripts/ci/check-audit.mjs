#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { exit } from "node:process";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      continue;
    }
    const key = arg.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : true;
    args[key] = value;
    if (value !== true) {
      i += 1;
    }
  }
  return args;
}

function extractIdentifiers(vulnerability) {
  const ids = new Set();
  if (typeof vulnerability.name === "string") {
    ids.add(vulnerability.name);
  }
  if (Array.isArray(vulnerability.via)) {
    for (const via of vulnerability.via) {
      if (typeof via === "string") {
        ids.add(via);
        continue;
      }
      if (via && typeof via === "object") {
        if (via.id) {
          ids.add(String(via.id));
        }
        if (via.name) {
          ids.add(via.name);
        }
        if (via.url && typeof via.url === "string") {
          const match = via.url.match(/(GHSA-[A-Z0-9-]+|CVE-\d+-\d+)/i);
          if (match) {
            ids.add(match[0].toUpperCase());
          }
        }
        if (via.source) {
          ids.add(String(via.source));
        }
      }
    }
  }
  return Array.from(ids);
}

const args = parseArgs(process.argv.slice(2));
const filePath = args.file;
const thresholdName = (args.threshold || "high").toString().toLowerCase();
const label = args.label || "audit";
const allowlistPath = args.allowlist;

if (!filePath) {
  console.error("check-audit: --file <path> is required");
  exit(1);
}

const severityOrder = {
  info: 0,
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4,
};

if (!(thresholdName in severityOrder)) {
  console.error(`check-audit: unknown threshold "${thresholdName}"`);
  exit(1);
}

const thresholdValue = severityOrder[thresholdName];

let allowlist = new Set();
if (allowlistPath) {
  try {
    const rawAllowlist = readFileSync(allowlistPath, "utf8");
    const parsed = JSON.parse(rawAllowlist);
    if (Array.isArray(parsed)) {
      allowlist = new Set(parsed.map((item) => String(item).toUpperCase()));
    } else {
      console.warn(`check-audit: allowlist at ${allowlistPath} is not an array; ignoring`);
    }
  } catch (error) {
    console.warn(`check-audit: unable to read allowlist at ${allowlistPath}: ${error.message}`);
  }
}

let data;
try {
  const raw = readFileSync(filePath, "utf8");
  const normalizedRaw = raw.replace(/^\uFEFF/, "");
  data = JSON.parse(normalizedRaw);
} catch (error) {
  console.error(`check-audit: failed to read audit report "${filePath}": ${error.message}`);
  exit(1);
}

const vulnerabilities = Object.values(data.vulnerabilities ?? {});
let maxSeverityValue = 0;
const failing = [];

for (const entry of vulnerabilities) {
  const severity = (entry.severity || "info").toString().toLowerCase();
  const severityValue = severityOrder[severity] ?? 0;
  maxSeverityValue = Math.max(maxSeverityValue, severityValue);

  if (severityValue < thresholdValue) {
    continue;
  }

  const identifiers = extractIdentifiers(entry);
  const isAllowlisted = identifiers.some((identifier) => allowlist.has(identifier.toUpperCase()));
  if (isAllowlisted) {
    continue;
  }

  failing.push({
    name: entry.name,
    severity,
    identifiers,
    via: entry.via,
  });
}

const severityNames = Object.entries(severityOrder).reduce((acc, [name, value]) => {
  acc[value] = name;
  return acc;
}, {});

const maxSeverityName = severityNames[maxSeverityValue] || "info";
console.log(
  `[${label}] audit summary: ${vulnerabilities.length} vulnerabilities, max severity ${maxSeverityName}, threshold ${thresholdName}`,
);

if (failing.length > 0) {
  console.error(
    `[${label}] failing vulnerabilities at or above ${thresholdName}: ${failing
      .map((item) => `${item.name} (${item.severity})`)
      .join(", ")}`,
  );
  for (const item of failing) {
    console.error(
      `  • ${item.name} (${item.severity}) identifiers=${item.identifiers.join(", ") || "n/a"}`,
    );
  }
  exit(1);
}

console.log(`[${label}] no vulnerabilities exceeded the ${thresholdName} threshold.`);
