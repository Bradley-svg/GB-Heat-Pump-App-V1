# Mode A Guardrail Suite

## Why
Mode A deployments must prove that no personal identifiers leave the CN boundary. The guard suite enforces the DROP list (“forbidden terms”) and PII heuristics (IP/MAC/IMEI/GPS, etc.) across apps, services, SDKs, configs, and docs. Every PR and local commit is scanned so regressions are caught before they can ship.

## Running locally
- Full repo scan: `pnpm guard:all`
- Individual rules: `pnpm guard:forbidden` or `pnpm guard:pii`
- Pre-commit: Husky + lint-staged automatically run both scanners against staged files (`*.ts,*.tsx,*.js,*.jsx,*.json,*.md,*.yml,*.yaml`). To bypass (not recommended) set `HUSKY=0`.

## Baseline policy
- Baseline file: `guard-results/baseline.json`
- Downgrade rules: P1→P2, P2→P3 **only** when a corresponding entry exists. P0 findings can **never** be baselined. P2 findings cannot be downgraded below P2.
- Baseline entries must include an issue/ticket reference in commit notes. Example entry:
  ```json
  {
    "forbidden": [
      { "path": "docs/**", "pattern": "email", "reason": "DOC-123 existing sample" }
    ]
  }
  ```

## Allowlist entries
Use `.modea.guard.json` → `"allowlist"`. Each entry must specify `path`, `pattern`, and `reason` (with ticket/incident). Example:
```json
{
  "path": "scripts/**",
  "pattern": "hostname",
  "reason": "DEVOPS-555 – hostname literal required for stub"
}
```

## CI behavior
- Workflow: `.github/workflows/modea-guards.yml`
- Trigger: every PR and push to `main` (binary assets ignored).
- Steps: install deps, run forbidden + PII scanners, upload JSON + SARIF, comment on PR with counts/top offenders, and publish alerts to **Security → Code scanning alerts**.
- Severity handling:
  - **P0 / P1**: pipeline fails (merge blocked).
  - **P2 / P3**: pipeline succeeds but comment + SARIF warnings.

## Performance & exclusions
- 2 MB ceiling per file; binary files or minified bundles are skipped.
- Markdown code fences tagged ```guard:ignore``` are excluded.
- Files declaring front-matter `guard: allow: true` (PII scan only) are skipped.
- Pre-commit scans only staged files for speed; CI scans the entire repo.

## Outputs
- JSON + SARIF for forbidden (`guard-results/forbidden.*`) and PII (`guard-results/pii.*`)
- Aggregated summary: `guard-results/comment.md`
- Baseline file (if used): `guard-results/baseline.json`
