import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

import type { Env, User } from "../../env";
import * as accessModule from "../../lib/access";
import { handleClientErrorReport, handleClientEventReport } from "../observability";
import * as loggingModule from "../../utils/logging";

type LoggerMock = {
  debug: ReturnType<typeof vi.fn>;
  info: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
  with: ReturnType<typeof vi.fn>;
};

function createEnv(overrides: Partial<Env> = {}): Env {
  return {
    DB: { prepare: vi.fn() } as any,
    ACCESS_JWKS_URL: "https://access.example/.well-known/jwks.json",
    ACCESS_AUD: "test-aud",
    APP_BASE_URL: "https://app.example",
    RETURN_DEFAULT: "/app",
    CURSOR_SECRET: "integration-secret-observability",
    INGEST_ALLOWED_ORIGINS: "https://devices.example.com",
    INGEST_RATE_LIMIT_PER_MIN: "120",
    INGEST_SIGNATURE_TOLERANCE_SECS: "300",
    ...overrides,
  };
}

const ADMIN_USER: User = {
  email: "admin@example.com",
  roles: ["admin"],
  clientIds: [],
};

const requireAccessUserMock = vi.spyOn(accessModule, "requireAccessUser");
const loggerForRequestMock = vi.spyOn(loggingModule, "loggerForRequest");

function createLoggerStub(): LoggerMock {
  const stub: LoggerMock = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    with: vi.fn(),
  };
  stub.with.mockReturnValue(stub);
  return stub;
}

afterEach(() => {
  requireAccessUserMock.mockReset();
  loggerForRequestMock.mockReset();
});

afterAll(() => {
  requireAccessUserMock.mockRestore();
  loggerForRequestMock.mockRestore();
});

describe("handleClientErrorReport", () => {
  it("rejects unauthenticated requests", async () => {
    requireAccessUserMock.mockResolvedValueOnce(null);
    loggerForRequestMock.mockReturnValue(createLoggerStub() as unknown as loggingModule.Logger);

    const env = createEnv();
    const req = new Request("https://app.example/api/observability/client-errors", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await handleClientErrorReport(req, env);
    expect(res.status).toBe(401);
  });

  it("returns 400 for malformed JSON", async () => {
    requireAccessUserMock.mockResolvedValueOnce(ADMIN_USER);
    loggerForRequestMock.mockReturnValue(createLoggerStub() as unknown as loggingModule.Logger);

    const env = createEnv();
    const req = new Request("https://app.example/api/observability/client-errors", {
      method: "POST",
      body: "{",
    });

    const res = await handleClientErrorReport(req, env);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid JSON" });
  });

  it("returns validation errors when payload is invalid", async () => {
    requireAccessUserMock.mockResolvedValueOnce(ADMIN_USER);
    loggerForRequestMock.mockReturnValue(createLoggerStub() as unknown as loggingModule.Logger);

    const env = createEnv();
    const req = new Request("https://app.example/api/observability/client-errors", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ stack: 12345 }),
    });

    const res = await handleClientErrorReport(req, env);
    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.error).toBe("Validation failed");
  });

  it("logs the report and returns 202 for valid payloads", async () => {
    requireAccessUserMock.mockResolvedValueOnce(ADMIN_USER);
    const logger = createLoggerStub();
    loggerForRequestMock.mockReturnValueOnce(logger as unknown as loggingModule.Logger);

    const env = createEnv();
    const payload = {
      name: "TypeError",
      message: "Boom",
      stack: "TypeError: Boom\n  at Component (App.tsx:10)",
      componentStack: "in ProblemChild\n in ErrorBoundary",
      userAgent: "UnitTest/1.0",
      url: "https://app.example/app",
      release: "v1.2.3",
      reporterId: "uuid-123",
      tags: { build: "abc123" },
      extras: { foo: "bar" },
      user: { email: "reporter@example.com", roles: ["observer"] },
    };

    const req = new Request("https://app.example/api/observability/client-errors", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    const res = await handleClientErrorReport(req, env);
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ ok: true });

    const errorMock = logger.error;
    expect(errorMock).toHaveBeenCalledTimes(1);
    const [eventName, fields] = errorMock.mock.calls[0] as [string, any];
    expect(eventName).toBe("ui.error_boundary");
    expect(fields).toMatchObject({
      source: "frontend",
      user: {
        email: ADMIN_USER.email,
        roles: ADMIN_USER.roles,
        client_ids: ADMIN_USER.clientIds,
      },
    });
    expect(fields.report).toMatchObject({
      name: payload.name,
      message: payload.message,
      component_stack: payload.componentStack,
      user_agent: payload.userAgent,
      url: payload.url,
      release: payload.release,
      tags: payload.tags,
      extras: payload.extras,
      reporter_user: payload.user,
    });
    expect(typeof fields.report.timestamp).toBe("string");
    expect(fields.truncated_fields ?? []).toEqual([]);
  });

  it("rejects payloads that exceed configured byte limit", async () => {
    requireAccessUserMock.mockResolvedValueOnce(ADMIN_USER);
    loggerForRequestMock.mockReturnValue(createLoggerStub() as unknown as loggingModule.Logger);

    const env = createEnv({ OBSERVABILITY_MAX_BYTES: "20" });
    const payload = { message: "A".repeat(50) };
    const req = new Request("https://app.example/api/observability/client-errors", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    const res = await handleClientErrorReport(req, env);
    expect(res.status).toBe(413);
    expect(await res.json()).toEqual({ error: "Payload too large" });
  });

  it("truncates oversized extras while logging a truncation marker", async () => {
    requireAccessUserMock.mockResolvedValueOnce(ADMIN_USER);
    const logger = createLoggerStub();
    loggerForRequestMock.mockReturnValueOnce(logger as unknown as loggingModule.Logger);

    const env = createEnv();
    const payload = {
      message: "Something broke",
      extras: { blob: "x".repeat(6000) },
    };

    const req = new Request("https://app.example/api/observability/client-errors", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    const res = await handleClientErrorReport(req, env);
    expect(res.status).toBe(202);

    const [, fields] = logger.error.mock.calls[0] as [string, any];
    expect(fields.truncated_fields).toContain("extras");
    expect(fields.report.extras).toMatchObject({
      truncated: true,
      note: expect.stringContaining("extras truncated"),
    });
    expect(typeof fields.report.extras.bytes).toBe("number");
  });
});

describe("handleClientEventReport", () => {
  it("accepts anonymous payloads and logs info", async () => {
    requireAccessUserMock.mockResolvedValueOnce(null);
    const logger = createLoggerStub();
    loggerForRequestMock.mockReturnValueOnce(logger as unknown as loggingModule.Logger);

    const env = createEnv();
    const payload = {
      event: "signup_flow.result",
      source: "web",
      properties: { status: "pending_email" },
    };
    const req = new Request("https://app.example/api/observability/client-events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    const res = await handleClientEventReport(req, env);
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ ok: true });
    expect(logger.info).toHaveBeenCalledWith("client.event", {
      event: payload.event,
      source: payload.source,
      properties: payload.properties,
      user_email: null,
    });
  });

  it("validates payloads", async () => {
    loggerForRequestMock.mockReturnValue(createLoggerStub() as unknown as loggingModule.Logger);
    requireAccessUserMock.mockResolvedValue(null);
    const env = createEnv();
    const req = new Request("https://app.example/api/observability/client-events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ event: "" }),
    });

    const res = await handleClientEventReport(req, env);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
  });
});
