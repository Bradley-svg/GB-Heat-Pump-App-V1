import "../helpers/setup";

import { describe, it, expect } from "vitest";

import { createWorkerEnv } from "../helpers/worker-env";

describe("Ops metrics indexes", () => {
  it("uses composite index for rate-limit query plan", async () => {
    const { env, dispose } = await createWorkerEnv();
    try {
      const nowIso = new Date().toISOString();
      await env.DB.prepare(
        `INSERT INTO ops_metrics (ts, route, status_code, duration_ms, device_id)
         VALUES (?1, ?2, ?3, ?4, ?5)`,
      )
        .bind(nowIso, "/api/ingest", 200, 123, "dev-rate-limited")
        .run();

      const sinceIso = new Date(Date.now() - 60_000).toISOString();
      const planResult = await env.DB
        .prepare(
          `EXPLAIN QUERY PLAN
             SELECT COUNT(*) AS cnt
               FROM ops_metrics
              WHERE route = ?1 AND device_id = ?2 AND ts >= ?3`,
        )
        .bind("/api/ingest", "dev-rate-limited", sinceIso)
        .all<{ detail: string }>();

      expect(
        (planResult.results ?? []).some(
          (row) =>
            typeof row.detail === "string" &&
            (row.detail.includes("ix_ops_metrics_device_route_ts") ||
              row.detail.includes("ix_ops_metrics_route_device_ts")),
        ),
      ).toBe(true);
    } finally {
      dispose();
    }
  });
});
