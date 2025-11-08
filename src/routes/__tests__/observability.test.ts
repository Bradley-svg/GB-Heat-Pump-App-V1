import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";



import type { Env, User } from "../../env";

import * as accessModule from "../../lib/access";

import { handleClientErrorReport, handleClientEventReport } from "../observability";

import * as loggingModule from "../../utils/logging";

import { checkIpRateLimit } from "../../lib/ip-rate-limit";

import * as clientEventsModule from "../../lib/client-events";
import * as telemetryTokenModule from "../../lib/auth/telemetry-token";
import { createTestKvNamespace } from "../../../tests/helpers/kv";






vi.mock("../../lib/ip-rate-limit", () => ({

  checkIpRateLimit: vi.fn(),

}));



vi.mock("../../lib/client-events", () => ({

  recordClientEvent: vi.fn(),

}));



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
    CLIENT_EVENT_TOKEN_SECRET: "test-telemetry-token-secret-rotate-1234567890",
    CLIENT_EVENT_TOKEN_TTL_SECONDS: "900",
    CLIENT_EVENT_LIMIT_PER_MIN: "0",
    CLIENT_EVENT_BLOCK_SECONDS: "60",
    CLIENT_EVENT_IP_BUCKETS: createTestKvNamespace(),

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

const mockedRateLimit = vi.mocked(checkIpRateLimit);

const recordClientEventMock = vi.mocked(clientEventsModule.recordClientEvent);
const authenticateTelemetryRequestMock = vi.spyOn(telemetryTokenModule, "authenticateTelemetryRequest");

beforeEach(() => {
  authenticateTelemetryRequestMock.mockResolvedValue(null);
});





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

  mockedRateLimit.mockReset();

  recordClientEventMock.mockReset();

  authenticateTelemetryRequestMock.mockReset();



});



afterAll(() => {

  requireAccessUserMock.mockRestore();

  loggerForRequestMock.mockRestore();

  mockedRateLimit.mockRestore();

  recordClientEventMock.mockRestore();

  authenticateTelemetryRequestMock.mockRestore();



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

    expect(recordClientEventMock).not.toHaveBeenCalled();

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

  it("rejects unauthenticated requests", async () => {

    requireAccessUserMock.mockResolvedValueOnce(null);

    const env = createEnv();

    const req = new Request("https://app.example/api/observability/client-events", {

      method: "POST",

      headers: { "content-type": "application/json" },

      body: JSON.stringify({ event: "test", properties: {} }),

    });



    const res = await handleClientEventReport(req, env);

    expect(res.status).toBe(401);

    expect(await res.json()).toEqual({ error: "Unauthorized" });

    expect(recordClientEventMock).not.toHaveBeenCalled();

    expect(requireAccessUserMock).toHaveBeenCalledWith(

      expect.any(Request),

      env,

      { allowSession: false },

    );

  });



  it("enforces AUTH_IP rate limits", async () => {

    mockedRateLimit.mockResolvedValueOnce({

      limited: true,

      retryAfterSeconds: 12,

      remaining: 0,

      limit: 60,

      ip: "198.51.100.1",

    });

    requireAccessUserMock.mockResolvedValueOnce(ADMIN_USER);



    const env = createEnv();

    const req = new Request("https://app.example/api/observability/client-events", {

      method: "POST",

      headers: { "content-type": "application/json" },

      body: JSON.stringify({ event: "signup_flow.result" }),

    });



    const res = await handleClientEventReport(req, env);

    expect(res.status).toBe(429);



    expect(res.headers.get("Retry-After")).toBe("12");



    expect(await res.json()).toEqual({ error: "Rate limit exceeded" });



    expect(authenticateTelemetryRequestMock).not.toHaveBeenCalled();



    expect(requireAccessUserMock).not.toHaveBeenCalled();



    expect(mockedRateLimit).toHaveBeenCalledWith(
      expect.any(Request),
      env,
      "/api/observability/client-events",
      expect.objectContaining({
        limitEnvKey: "CLIENT_EVENT_LIMIT_PER_MIN",
        blockEnvKey: "CLIENT_EVENT_BLOCK_SECONDS",
        kvBindingKey: "CLIENT_EVENT_IP_BUCKETS",
      }),
    );
  });



  it("logs client events when authorized", async () => {

    requireAccessUserMock.mockResolvedValueOnce(ADMIN_USER);

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



      dimension: "pending_email",



      has_properties: true,



      property_keys: ["status"],



      user_email: "a***n@example.com",



    });



    expect(requireAccessUserMock).toHaveBeenCalledWith(

      expect.any(Request),

      env,

      { allowSession: false },

    );

    expect(recordClientEventMock).toHaveBeenCalledWith(

      expect.any(Object),

      expect.objectContaining({

        event: "signup_flow.result",

        source: payload.source,

        userEmail: ADMIN_USER.email,

        dimension: "pending_email",

      }),

    );

  });



  it("validates payloads", async () => {

    loggerForRequestMock.mockReturnValue(createLoggerStub() as unknown as loggingModule.Logger);

    requireAccessUserMock.mockResolvedValue(ADMIN_USER);

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

    expect(requireAccessUserMock).toHaveBeenCalledWith(

      expect.any(Request),

      env,

      { allowSession: false },

    );

  });



  it("emits alert metrics when pending logout flush fails", async () => {

    const logger = createLoggerStub();

    loggerForRequestMock.mockReturnValueOnce(logger as unknown as loggingModule.Logger);

    requireAccessUserMock.mockResolvedValueOnce(ADMIN_USER);

    const env = createEnv();

    const payload = {

      event: "auth.pending_logout.flush_failed",

      source: "mobile",

      properties: { message: "network down" },

    };

    const req = new Request("https://app.example/api/observability/client-events", {

      method: "POST",

      headers: { "content-type": "application/json" },

      body: JSON.stringify(payload),

    });

    const res = await handleClientEventReport(req, env);

    expect(res.status).toBe(202);

    expect(logger.warn).toHaveBeenCalledWith(

      "auth.pending_logout.flush_failed",

      expect.objectContaining({

        metric: "greenbro.mobile.pending_logout.flush_failed",

        metric_key: "mobile.pending_logout.flush_failed",

        count: 1,

        source: "mobile",

        user_email: "a***n@example.com",

        reason: "network down",

      }),

    );

    expect(recordClientEventMock).toHaveBeenCalledWith(

      expect.any(Object),

      expect.objectContaining({

        event: "auth.pending_logout.flush_failed",

        dimension: "flush_failed",

      }),

    );

  });

  it("accepts telemetry tokens without requiring Access context", async () => {

    const logger = createLoggerStub();

    loggerForRequestMock.mockReturnValueOnce(logger as unknown as loggingModule.Logger);

    authenticateTelemetryRequestMock.mockResolvedValueOnce(ADMIN_USER);

    const env = createEnv();

    const req = new Request("https://app.example/api/observability/client-events", {

      method: "POST",

      headers: { "content-type": "application/json" },

      body: JSON.stringify({ event: "signup_flow.result" }),

    });

    const res = await handleClientEventReport(req, env);

    expect(res.status).toBe(202);

    expect(requireAccessUserMock).not.toHaveBeenCalled();

    expect(recordClientEventMock).toHaveBeenCalled();

  });



});

