# Open Questions
1. **Overseas ingest target** – Should sanitized batches land in the existing `src` worker/D1 schema or a new data store? The answer drives how we model `records` downstream.
2. **Pseudonymization cut-over date** – When can the raw `/api/ingest` path be permanently disabled, and who signs off on the data migration to `did_pseudo`? The plan affects dashboard/mobile timelines.
3. **Authentication contract** – Do we standardize on Cloudflare Access service tokens for exporter->worker auth, or is mTLS preferred? Need a documented decision before implementing.
4. **Observability payload policy** – Can client UIs still emit arbitrary `extras` once guards tighten, or should we introduce an allowlisted event schema maintained by Product?
5. **Docs scanning** – Should compliance-owned markdown (runbooks, notices) live under a different guard profile, or do we simply remove the ignore rules and accept CI noise?
