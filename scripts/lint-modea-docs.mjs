#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DOCS = [
  {
    file: "docs/mode-a/audit-2025-11-11/mode-a-guardrail-checklist.md",
    label: "Mode A audit checklist",
  },
  {
    file: "docs/guardrails/MODEA_GUARDS_CHECKLIST.md",
    label: "Mode A guard controls",
  },
];

const IGNORE_PREFIXES = [
  "http://",
  "https://",
  "mailto:",
  "DROP_",
  "SAFE_",
  "didPseudo",
  "/",
];

function extractPathRefs(markdown) {
  const refs = [];
  const regex = /`([^`]+)`/g;
  let match;
  while ((match = regex.exec(markdown)) !== null) {
    const token = match[1].trim();
    if (!token) continue;
    if (!token.includes("/")) continue;
    if (IGNORE_PREFIXES.some((prefix) => token.startsWith(prefix))) continue;
    refs.push(token.replace(/^\.\/+/, ""));
  }
  return refs;
}

function resolveTargetPath(docDir, ref) {
  if (ref.startsWith("./") || ref.startsWith("../")) {
    return path.resolve(docDir, ref);
  }
  if (ref.startsWith("..\\")) {
    return path.resolve(docDir, ref);
  }
  return path.resolve(ROOT, ref);
}

const errors = [];

for (const doc of DOCS) {
  const docPath = path.join(ROOT, doc.file);
  if (!fs.existsSync(docPath)) {
    errors.push(`Missing doc: ${doc.file}`);
    continue;
  }
  const content = fs.readFileSync(docPath, "utf8");
  const refs = extractPathRefs(content);
  const docDir = path.dirname(docPath);
  for (const ref of refs) {
    const normalized = path.normalize(ref);
    const targetPath = resolveTargetPath(docDir, ref);
    if (!fs.existsSync(targetPath)) {
      errors.push(
        `${doc.label}: referenced artifact "${ref}" does not exist (expected at ${path.relative(
          ROOT,
          targetPath,
        )})`,
      );
    }
  }
}

if (errors.length) {
  console.error("Mode A documentation lint failed:");
  for (const err of errors) {
    console.error(` - ${err}`);
  }
  process.exit(1);
}

console.log("Mode A documentation lint passed: all referenced artifacts exist.");
