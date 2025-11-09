# ADR-001: Adopt Mode A Gateway + Shared SDKs

## Status
Accepted — 2025-11-09

## Context
- Regulatory pressure (PIPL/DSL/CSL) requires raw identifiers and mapping secrets remain in mainland China.
- Multiple clients (Cloudflare Worker, dashboard web, Expo mobile) must enforce identical SAFE metric rules and pseudonymization logic.
- Prior ad-hoc SDKs drifted from backend schemas, increasing risk of PII leakage in exports.

## Decision
1. Implement Mode A CN gateway that handles ingest, pseudonymization, export filtering, and dual-controlled re-identification.
2. Build a shared TypeScript core package (`@greenbro/sdk-core`) containing SAFE/DROP lists, zod schemas, and pseudonymization helpers.
3. Layer platform-specific SDKs (`@greenbro/sdk-web`, `@greenbro/sdk-rn`) plus UI kits (`@greenbro/ui-*`) on top of the shared core to keep clients consistent.
4. Host pseudonymized overseas API on Cloudflare Workers to minimize surface area outside CN.

## Consequences
- + Strong compliance posture — schemas + guardrails live in one place and are reused everywhere.
- + Faster client development — UI + SDK packages ship as workspaces with shared tooling.
- − Higher upfront investment to maintain monorepo + workspaces.
- − Requires rigorous release process (changesets, versioning) to avoid clients lagging behind SAFE schema updates.

## References
- `docs/mode-a-operational-guidance.md`
- `packages/sdk-core`
- `services/cn-gateway`
