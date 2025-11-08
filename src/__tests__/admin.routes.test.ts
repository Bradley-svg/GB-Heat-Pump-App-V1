import { afterEach, describe, expect, it, vi } from "vitest";

import type { Env } from "../env";
import * as access from "../lib/access";
import { handleAdminOverview } from "../routes/admin";

const mockEnv: Env = {
  DB: { prepare: vi.fn() } as unknown as Env["DB"],
  ACCESS_JWKS_URL: "https://access.example.com/certs",
  ACCESS_AUD: "aud",
  APP_BASE_URL: "https://app.example.com/app",
  RETURN_DEFAULT: "/",
  CURSOR_SECRET: "cursor-secret",
  INGEST_ALLOWED_ORIGINS: "https://devices.example.com",
  INGEST_RATE_LIMIT_PER_MIN: "120",
  INGEST_SIGNATURE_TOLERANCE_SECS: "300",
  CLIENT_EVENT_TOKEN_SECRET: "test-telemetry-token-secret-rotate-1234567890",
  CLIENT_EVENT_TOKEN_TTL_SECONDS: "900",
};

describe("handleAdminOverview", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 403 when the caller lacks the admin role", async () => {
    vi.spyOn(access, "requireAccessUser").mockResolvedValue({
      email: "client@example.com",
      roles: ["client"],
      clientIds: ["tenant-a"],
    });

    const res = await handleAdminOverview(
      new Request("https://example.com/api/admin/overview"),
      mockEnv,
    );

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: "Forbidden" });
  });
});
