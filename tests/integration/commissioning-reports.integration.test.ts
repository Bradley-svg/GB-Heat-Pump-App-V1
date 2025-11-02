import "../helpers/setup";

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

import workerApp from "../../src/app";
import type { User } from "../../src/env";
import { createWorkerEnv } from "../helpers/worker-env";
import { createMockR2Bucket } from "../helpers/mock-r2";

const ADMIN_USER: User = {
  email: "reports.integration@example.com",
  roles: ["admin"],
  clientIds: ["profile-west", "profile-east"],
};

describe.sequential("Commissioning report generation", () => {
  let requireAccessUserSpy: ReturnType<typeof vi.spyOn> | null = null;

  beforeAll(async () => {
    const accessModule = await import("../../src/lib/access");
    requireAccessUserSpy = vi.spyOn(accessModule, "requireAccessUser").mockImplementation(async () => ADMIN_USER);
  });

  afterAll(() => {
    requireAccessUserSpy?.mockRestore();
  });

  it("uploads a PDF report and returns a signed URL for completed runs", async () => {
    const bucket = createMockR2Bucket();
    const { env, dispose } = await createWorkerEnv({
      GB_BUCKET: bucket.bucket,
      ASSET_SIGNING_SECRET: "commissioning-report-secret",
    });

    try {
      const payload = {
        run_id: "integration-run-001",
        device_id: "dev-1001",
        status: "completed",
        started_at: "2025-02-01T10:00:00.000Z",
        completed_at: "2025-02-01T11:30:00.000Z",
        checklist: ["power-on", "flow-verification"],
        notes: "Integration test run coverage",
        performed_by: "qa.engineer@example.com",
      };

      const createRes = await workerApp.fetch(
        new Request("https://example.com/api/commissioning/runs", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        }),
        env,
      );

      expect(createRes.status).toBe(201);
      const createBody = (await createRes.json()) as {
        ok: boolean;
        run: { run_id: string; report_url: string | null };
      };
      expect(createBody.ok).toBe(true);
      expect(createBody.run.run_id).toBe(payload.run_id);
      expect(createBody.run.report_url).toBeTruthy();
      expect(createBody.run.report_url).toContain("/r2/reports/commissioning/integration-run-001.pdf");
      expect(createBody.run.report_url).toMatch(/exp=\d+/);
      expect(createBody.run.report_url).toMatch(/sig=[0-9a-f]+/);

      const stored = bucket.metadata("reports/commissioning/integration-run-001.pdf");
      expect(stored).toBeTruthy();
      expect(stored?.httpMetadata?.contentType).toBe("application/pdf");
      expect(stored?.value.length).toBeGreaterThan(200);
      const prefix = new TextDecoder().decode(stored?.value.slice(0, 8));
      expect(prefix.startsWith("%PDF")).toBe(true);

      const listRes = await workerApp.fetch(
        new Request("https://example.com/api/commissioning/runs?status=completed&limit=5"),
        env,
      );
      expect(listRes.status).toBe(200);
      const listBody = (await listRes.json()) as {
        runs: Array<{ run_id: string; report_url: string | null }>;
      };
      const match = listBody.runs.find((run) => run.run_id === payload.run_id);
      expect(match?.report_url).toBe(createBody.run.report_url);
    } finally {
      dispose();
    }
  });
});
