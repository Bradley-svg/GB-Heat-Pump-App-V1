# Open Questions

1. **Raw ingest sunset plan:** Can we block `/api/ingest/:profile` behind the WAF today while the pseudonymized batch path is finished, or do we need an interim allowlist for specific factories? Need decision from Product + Ops.
2. **SAFE metric scope:** Should `firmware_version_major_minor` and `alerts` be treated as SAFE metrics? Compliance + CN gateway owners must align so SDK/CN lists match.
3. **Ed25519 public key management:** Where should the overseas Worker fetch `EXPORT_VERIFY_PUBKEY` (Wrangler secret vs KV vs R2) and who owns rotation? Need Platform API + Security sign-off.
4. **Privacy notice refresh:** Legal/Comms to confirm updated Mandarin text and whether docs can continue promising pseudonymized-only exports before the P0 fix ships.
