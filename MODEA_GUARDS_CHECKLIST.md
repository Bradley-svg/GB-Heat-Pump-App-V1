| Guard | Status | Notes / Evidence |
| --- | --- | --- |
| CN gateway DROP/SAFE enforcement | ✅ | `services/cn-gateway/src/modea/drop-safe.ts` + `sanitizeTelemetry` enforce DROP list and SAFE metrics only. |
| Pseudonymization via CN KMS (HMAC-SHA256, 22-char truncation) | ✅ | `services/cn-gateway/src/crypto/pseudo.ts` uses provider adapters + deterministic truncation. |
| Mapping table & re-ID dual control | ⚠️ Needs doc | Code maintains mapping in Postgres, but no Important-Data checklist / dual-control SOP is versioned. |
| Export signing + overseas verification | ✅ | CN signs with Ed25519 (`signBatch`); overseas worker now verifies signatures after Access auth (`services/overseas-api/src/index.ts`). |
| Replay protection (seq ring + ±120s skew) | ✅ | `services/cn-gateway/src/db/replay.ts` enforces 5-entry ring + skew from env. |
| DROP enforcement on overseas ingest/logs | ✅ | Worker only accepts SAFE metrics; logging now redacts `client_ip` and masks operator emails. |
| Forbidden-field/PII scanners | ✅ (tooling ready) | `SCRIPTS/forbidden-fields-lint.js` and `SCRIPTS/pii-regex-scan.js` added; hook into CI next. |
| Privacy notices (bilingual, accurate) | ⚠️ Broken | `docs/privacy-notice/operator-mode-a.md` Mandarin text is mojibake; needs replacement. |
| Important-Data checklist | ❌ Missing | No doc covers custody/rotation for mapping tables, HMAC keys, or Access env values. |
| CI enforcement for guards | ⚠️ Partial | Scripts exist but not yet wired into CI; add to lint workflow to block regressions. |
