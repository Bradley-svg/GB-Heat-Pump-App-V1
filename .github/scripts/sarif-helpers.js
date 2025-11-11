'use strict';

const path = require('path');

const LEVEL_MAP = {
  P0: 'error',
  P1: 'error',
  P2: 'warning',
  P3: 'note'
};

function normalizePath(filePath) {
  return filePath.split(path.sep).join('/');
}

function severityToLevel(severity) {
  return LEVEL_MAP[severity] || 'warning';
}

function buildSarif(findings, rulePrefix) {
  const rules = [];
  const ruleIndex = new Map();

  for (const finding of findings) {
    const key = finding.ruleId;
    if (!ruleIndex.has(key)) {
      const rule = {
        id: key,
        name: key,
        shortDescription: { text: `${rulePrefix} ${finding.pattern}` },
        fullDescription: { text: `${rulePrefix} match: ${finding.pattern}` },
        defaultConfiguration: { level: severityToLevel(finding.severity) },
        properties: { severity: finding.severity }
      };
      ruleIndex.set(key, rules.length);
      rules.push(rule);
    }
  }

  const results = findings.map((finding) => ({
    ruleId: finding.ruleId,
    level: severityToLevel(finding.severity),
    message: { text: `${finding.severity} ${rulePrefix} match: ${finding.pattern}` },
    locations: [
      {
        physicalLocation: {
          artifactLocation: { uri: normalizePath(finding.path) },
          region: {
            startLine: finding.line || 1
          }
        }
      }
    ]
  }));

  return {
    version: '2.1.0',
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    runs: [
      {
        tool: {
          driver: {
            name: 'ModeA-Guards',
            rules
          }
        },
        results
      }
    ]
  };
}

module.exports = {
  buildSarif,
  severityToLevel,
  normalizePath
};
