# Asset Delivery Runbook

This runbook captures how commissioning reports and other static artifacts are generated, published, and protected when served from Cloudflare R2 behind the Worker in `src/r2.ts`. Use it when reviewing signed URL flows, rotating the signing secret, or validating that new asset producers follow the TTL policy.

## System Overview

- **Asset storage:** Cloudflare R2 bucket bound as `GB_BUCKET`.
- **Delivery worker:** `src/r2.ts` handles `GET/HEAD` reads (optionally signed) plus authenticated `PUT/DELETE`.
- **Signed URL producers:** Currently limited to commissioning report generation in `src/lib/commissioning-report.ts`. Additional producers must register here before launch.

## Signed URL Inventory

| Producer | Path & method | Default TTL | Notes |
| --- | --- | --- | --- |
| `src/lib/commissioning-report.ts` (`generateCommissioningReport`) | `GET /r2/reports/commissioning/<run_id>.pdf` | `7 days` (`DEFAULT_TTL_SECONDS = 604800`) | TTL override available through `options.expiresInSeconds`. URLs only issued for completed runs. |

Verification happens inside `src/r2.ts:97-133`, which checks the `exp` query parameter and recomputes the HMAC with `ASSET_SIGNING_SECRET`. Expired links or signatures automatically yield `401`.

## TTL Policy

- **Maximum expiration window:** `7 days`. This is the hard cap enforced in production today via the commissioning report defaults. New producers **must not** exceed the cap without explicit approval from Product and Firmware leads.
- **Sensitive assets:** Prefer shorter expirations (<= 48 hours) by passing `expiresInSeconds` when calling `generateCommissioningReport` or equivalent helpers.
- **Distribution controls:** Signed URLs are for **one-off sharing**. Never embed long-lived URLs in firmware images or public documentation.
- **Documentation:** Record per-feature TTL decisions in this runbook's inventory table before shipping.

## Signing Secret Rotation

- **Secret:** `ASSET_SIGNING_SECRET` (refer to `docs/secret-management.md` for provisioning commands).
- **Cadence:** Rotate at least **every 90 days** or immediately after suspected compromise.
- **Owners:** Platform Engineering (rotation executor) and Firmware/Device Ops (consumer coordination).
- **Process:**
  1. Generate a new random 256-bit value and store it in the password manager with timestamp and environment tags.
  2. Update all signer services (currently `generateCommissioningReport`) to read the new value from a secret manager or deployment variable.
  3. Run `wrangler secret put ASSET_SIGNING_SECRET --env <target>` for each environment.
  4. Deploy the Worker and verify signed URL issuance plus access (`curl` with `exp` and `sig`) before revoking the previous secret.
  5. Log the rotation in the ops change tracker with links to verification evidence.
- **Dual-key fallback:** If future producers require zero-downtime rotations, implement temporary acceptance of both old and new signatures inside `src/r2.ts`.

## Enforcement & Monitoring

- **Static analysis:** Flag any additions of `expiresInSeconds` greater than 604800 in code review.
- **Runtime telemetry:** Enable Worker request logging for `/r2/` routes and build dashboards that highlight `401` rates and unusually old `exp` timestamps.
- **Integration tests:** `tests/integration/commissioning-reports.integration.test.ts` covers URL issuance. Extend tests when new asset producers appear.
- **Incident response:** On suspected leakage, rotate `ASSET_SIGNING_SECRET`, invalidate exposed links by redeploying the Worker, and notify stakeholders via the security channel.

## Stakeholder Alignment

- **Product:** Confirms that a 7-day cap meets customer sharing requirements and documents exceptions.
- **Firmware:** Ensures device-hosted links obey the TTL cap and can tolerate quarterly secret rotations.
- **Status:** Awaiting confirmation from Product (S. Ortega) and Firmware (L. Bennett). Track follow-up in ticket `OPS-274`.
