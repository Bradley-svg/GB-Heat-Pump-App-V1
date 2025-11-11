'use strict';

const fs = require('fs');
const path = require('path');
const fg = require('fast-glob');
const minimatchLib = require('minimatch');
const minimatch =
  typeof minimatchLib === 'function' ? minimatchLib : minimatchLib.minimatch;
const { execSync } = require('child_process');
const { buildSarif } = require('./sarif-helpers');

const ROOT = process.cwd();
const CONFIG_PATH = path.join(ROOT, '.modea.guard.json');
const RESULTS_DIR = path.join(ROOT, 'guard-results');
const OUTPUT_JSON = path.join(RESULTS_DIR, 'forbidden.json');
const OUTPUT_SARIF = path.join(RESULTS_DIR, 'forbidden.sarif');
const SUMMARY_CACHE = path.join(RESULTS_DIR, 'summary.json');

const args = new Set(process.argv.slice(2));
const stagedOnly = args.has('--staged');
const printJson = args.has('--json');

ensureDir(RESULTS_DIR);
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const baseline = loadBaseline('forbidden');
const allowlist = config.allowlist || [];
const safeIdentifiers = new Set(
  (config.whitelistSafeIdentifiers || []).map((s) => s.toLowerCase())
);

const severityMap = createSeverityMap(config.severityMap || {});
const terms = config.forbiddenTerms || [];
const termPatterns = terms.map((term) => ({
  term,
  regex: buildTokenRegex(term)
}));

const filesToScan = resolveFiles();

const findings = [];
const topCounts = new Map();
const counts = { P0: 0, P1: 0, P2: 0, P3: 0 };

for (const filePath of filesToScan) {
  const fullPath = path.join(ROOT, filePath);
  if (!fs.existsSync(fullPath)) continue;
  const stats = fs.statSync(fullPath);
  if (!stats.isFile()) continue;
  if (stats.size > 2 * 1024 * 1024) continue;
  const buffer = fs.readFileSync(fullPath);
  if (buffer.includes(0)) continue;
  let text = buffer.toString('utf8');
  const ignoredLines = computeIgnoredLines(filePath, text);
  const lines = text.split(/\r?\n/);

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    if (ignoredLines.has(lineIndex)) continue;
    const line = lines[lineIndex];
    for (const { term, regex } of termPatterns) {
      regex.lastIndex = 0;
      let match;
      while ((match = regex.exec(line)) !== null) {
        const raw = match[0];
        const lower = raw.replace(/[^A-Za-z0-9_]/g, '').toLowerCase();
        if (!lower) continue;
        if (safeIdentifiers.has(lower)) continue;
        if (isAllowlisted(filePath, term)) continue;
        const severity = applyBaseline(
          filePath,
          term,
          determineSeverity(term),
          baseline
        );
        if (!severity) continue;
        counts[severity] += 1;
        topCounts.set(filePath, (topCounts.get(filePath) || 0) + 1);
        findings.push({
          path: filePath,
          line: lineIndex + 1,
          column: match.index + 1,
          pattern: term,
          severity,
          excerpt: line.trim().slice(0, 240),
          ruleId: `MA-FORB-${term.toLowerCase()}`
        });
      }
    }
  }
}

const output = {
  type: 'forbidden',
  counts,
  findings,
  topOffenders: buildTopOffenders(topCounts),
  scannedFiles: filesToScan.length
};

fs.writeFileSync(OUTPUT_JSON, JSON.stringify(output, null, 2));
fs.writeFileSync(
  OUTPUT_SARIF,
  JSON.stringify(buildSarif(findings, 'Forbidden field'), null, 2)
);
updateSummaryCache('forbidden', output);

printConsoleSummary('Forbidden Fields', output);
if (printJson) {
  console.log(JSON.stringify(output, null, 2));
}

if (counts.P0 > 0 || counts.P1 > 0) {
  process.exitCode = 1;
}

function resolveFiles() {
  if (stagedOnly) {
    const staged = getStagedFiles();
    if (staged.length) {
      return staged.filter((file) => fileMatches(file));
    }
  }
  const entries = fg.sync(config.includeGlobs || ['**/*'], {
    cwd: ROOT,
    ignore: config.excludeGlobs || [],
    onlyFiles: true,
    dot: true
  });
  return entries.filter((file) => fileMatches(file));
}

function fileMatches(filePath) {
  const ignored =
    config.excludeGlobs &&
    config.excludeGlobs.some((pattern) => minimatch(filePath, pattern, { dot: true }));
  if (ignored) return false;
  return true;
}

function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only --diff-filter=ACM', {
      encoding: 'utf8'
    });
    return output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function determineSeverity(term) {
  const key = term.toLowerCase();
  return severityMap.get(key) || 'P2';
}

function createSeverityMap(map) {
  const severityMap = new Map();
  for (const [key, value] of Object.entries(map)) {
    severityMap.set(key.toLowerCase(), value);
  }
  return severityMap;
}

function buildTokenRegex(term) {
  const escaped = escapeRegex(term);
  return new RegExp(`(?<![A-Za-z0-9])${escaped}(?![a-z0-9])`, 'gi');
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function computeIgnoredLines(filePath, text) {
  const ignored = new Set();
  if (!/\.mdx?$/i.test(filePath)) {
    return ignored;
  }
  const lines = text.split(/\r?\n/);
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!inFence && trimmed.startsWith('```guard:ignore')) {
      inFence = true;
      ignored.add(i);
      continue;
    }
    if (inFence) {
      ignored.add(i);
      if (trimmed.startsWith('```')) {
        inFence = false;
      }
    }
  }
  return ignored;
}

function isAllowlisted(filePath, pattern) {
  if (!Array.isArray(allowlist)) return false;
  const lowerPattern = pattern.toLowerCase();
  return allowlist.some((entry) => {
    if (!entry || !entry.path || !entry.pattern) return false;
    if (!minimatch(filePath, entry.path, { dot: true })) return false;
    return entry.pattern.toLowerCase() === lowerPattern;
  });
}

function applyBaseline(filePath, pattern, severity, baselineEntries) {
  if (severity === 'P0') return severity;
  const shouldDowngrade = baselineEntries.some(
    (entry) =>
      minimatch(filePath, entry.path, { dot: true }) &&
      entry.pattern.toLowerCase() === pattern.toLowerCase()
  );
  if (!shouldDowngrade) {
    return severity;
  }
  if (severity === 'P1') return 'P2';
  return severity;
}

function loadBaseline(section) {
  try {
    const baselinePath = path.join(
      ROOT,
      config.baselineFile || 'guard-results/baseline.json'
    );
    if (!fs.existsSync(baselinePath)) {
      return [];
    }
    const parsed = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return parsed?.[section] || [];
  } catch {
    return [];
  }
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function buildTopOffenders(map) {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([pathName, count]) => ({ path: pathName, count }));
}

function printConsoleSummary(title, summary) {
  console.log(`\n=== ${title} ===`);
  console.table(summary.counts);
  if (summary.topOffenders.length) {
    console.log('Top offenders:');
    summary.topOffenders.forEach((item) => {
      console.log(`- ${item.path} (${item.count})`);
    });
  }
}

function updateSummaryCache(key, data) {
  let summary = {};
  if (fs.existsSync(SUMMARY_CACHE)) {
    try {
      summary = JSON.parse(fs.readFileSync(SUMMARY_CACHE, 'utf8'));
    } catch {
      summary = {};
    }
  }
  summary[key] = {
    counts: data.counts,
    topOffenders: data.topOffenders
  };
  fs.writeFileSync(SUMMARY_CACHE, JSON.stringify(summary, null, 2));
}
