import { Router } from "itty-router";

import type { Env } from "./env";
import { json } from "./utils/responses";
import { safeDecode } from "./utils";
import { handleAlertsFeed, handleCreateAlertRecord, handleListAlertRecords } from "./routes/alerts";
import { handleArchive } from "./routes/archive";
import { handleClientCompact } from "./routes/client";
import { handleDeviceHistory, handleLatest, handleListDevices } from "./routes/devices";
import { handleFleetSummary } from "./routes/fleet";
import { handleHeartbeat, handleIngest } from "./routes/ingest";
import { handleMe } from "./routes/me";
import { handleCommissioning } from "./routes/commissioning";
import { handleAdminOverview } from "./routes/admin";
import { handleHealth } from "./routes/health";
import { handleMetrics } from "./routes/metrics";
import {
  handleCreateCommissioningRun,
  handleListCommissioningRuns,
} from "./routes/commissioning-runs";
import { handleCreateAuditEntry, handleListAuditTrail } from "./routes/audit";
import { handleCreateMqttMapping, handleListMqttMappings } from "./routes/mqtt";
import { bindRequestLogger, loggerForRequest, releaseRequestLogger } from "./utils/logging";

type RoutedRequest = Request & { params?: Record<string, string> };
type RouteHandler = (req: Request, env: Env) => Promise<Response> | Response;
type ParamHandler = (req: Request, env: Env, value: string) => Promise<Response> | Response;

const router = Router();

function decodeParam(req: RoutedRequest, key: string): string | null {
  const raw = req.params?.[key] ?? null;
  const decoded = safeDecode(raw);
  if (decoded === null || decoded === "") return null;
  return decoded;
}

function withParam(param: string, handler: ParamHandler): RouteHandler {
  return (req, env) => {
    const value = decodeParam(req as RoutedRequest, param);
    if (!value) {
      return json({ error: `Invalid ${param}` }, { status: 400 });
    }
    return handler(req, env, value);
  };
}

router.get("/health", () => handleHealth());
router.get("/metrics", (req: Request, env: Env) => handleMetrics(req, env));

router
  .get("/api/me", (req, env) => handleMe(req, env))
  .get("/api/fleet/summary", (req, env) => handleFleetSummary(req, env))
  .get("/api/client/compact", (req, env) => handleClientCompact(req, env))
  .get("/api/devices", (req, env) => handleListDevices(req, env))
  .get("/api/alerts", (req, env) => handleListAlertRecords(req, env))
  .post("/api/alerts", (req, env) => handleCreateAlertRecord(req, env))
  .get("/api/alerts/recent", (req, env) => handleAlertsFeed(req, env))
  .get("/api/commissioning/checklist", (req, env) => handleCommissioning(req, env))
  .get("/api/commissioning/runs", (req, env) => handleListCommissioningRuns(req, env))
  .post("/api/commissioning/runs", (req, env) => handleCreateCommissioningRun(req, env))
  .get("/api/admin/overview", (req, env) => handleAdminOverview(req, env))
  .get("/api/archive/offline", (req, env) => handleArchive(req, env))
  .get("/api/audit/logs", (req, env) => handleListAuditTrail(req, env))
  .post("/api/audit/logs", (req, env) => handleCreateAuditEntry(req, env))
  .get("/api/mqtt/mappings", (req, env) => handleListMqttMappings(req, env))
  .post("/api/mqtt/mappings", (req, env) => handleCreateMqttMapping(req, env))
  .get(
    "/api/devices/:id/latest",
    withParam("id", (req, env, deviceId) => handleLatest(req, env, deviceId)),
  )
  .get(
    "/api/devices/:id/history",
    withParam("id", (req, env, deviceId) => handleDeviceHistory(req, env, deviceId)),
  )
  .post(
    "/api/ingest/:profile",
    withParam("profile", (req, env, profile) => handleIngest(req, env, profile)),
  )
  .post(
    "/api/heartbeat/:profile",
    withParam("profile", (req, env, profile) => handleHeartbeat(req, env, profile)),
  );

router.all("*", () => json({ error: "Not found" }, { status: 404 }));

export function handleRequest(req: Request, env: Env, ctx?: ExecutionContext) {
  const start = Date.now();
  const logger = bindRequestLogger(req, env);
  logger.debug("request.received");
  return Promise.resolve(router.handle(req, env, ctx))
    .then((res) => {
      logger.info("request.completed", {
        status: res?.status ?? 0,
        duration_ms: Date.now() - start,
      });
      return res;
    })
    .catch((err) => {
      loggerForRequest(req).error("request.failed", {
        duration_ms: Date.now() - start,
        error: err,
      });
      throw err;
    })
    .finally(() => {
      releaseRequestLogger(req);
    });
}
