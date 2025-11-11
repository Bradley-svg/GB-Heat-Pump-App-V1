| ID | Severity | Owner | 48h Plan | Status |
| --- | --- | --- | --- | --- |
| P0-overseas-auth-bypass | P0 | Platform API | Patch landed (requireAccessJwt + tests). Deploy once pnpm lock is updated; monitor ingest 401 metrics post-push. | Mitigated locally; awaiting lockfile sync & deploy. |
| P1-logging-client-ip | P1 | Worker Platform | Default redaction flipped to true. Roll with next Worker deploy and confirm log samples exclude `client_ip`. | Fixed in code; deploy pending standard pipeline. |
| P1-obs-email-logs | P1 | Worker Platform | Masked logging + updated tests. Ship with next Worker deploy; spot-check log sink for masked emails. | Fixed in code; deployment pending. |
| P1-missing-pii-scans | P1 | Release Engineering | New scripts committed; add them to lint/test workflow within 48h so CI blocks regressions. | Scripts merged; CI wiring outstanding. |
| P1-bilingual-notice-corrupted | P1 | Legal/Comms | Provide UTF-8 Mandarin copy + review. Target: draft replacement within 48h for engineer to commit. | Open. |
| P1-important-data-gap | P1 | Compliance Lead | Draft Important-Data checklist template, review with Ops, and add to docs repo inside 48h. | Open. |
