import { Router } from "itty-router";

import { registerAdminRoutes } from "./router/admin";
import { registerDeviceRoutes } from "./router/devices";
import type { AppRouter } from "./router/params";
import { withParam } from "./router/params";
import { registerMetricsRoutes } from "./router/metrics";
import { registerTelemetryRoutes } from "./router/telemetry";
import type { Env } from "./env";
import { json } from "./utils/responses";
import {
  handleAlertsFeed,
  handleCreateAlertRecord,
  handleListAlertRecords,
  handleUpdateAlertRecord,
  handleCreateAlertComment,
} from "./routes/alerts";
import { handleArchive } from "./routes/archive";
import { handleClientCompact } from "./routes/client";
import { handleFleetAdminOverview } from "./routes/admin";
import { handleFleetSummary } from "./routes/fleet";
import { handleHeartbeat, handleIngest } from "./routes/ingest";
import { handleMe } from "./routes/me";
import { handleCommissioning } from "./routes/commissioning";
import { handleHealth } from "./routes/health";
import {
  handleCreateCommissioningRun,
  handleListCommissioningRuns,
} from "./routes/commissioning-runs";
import { handleClientErrorReport } from "./routes/observability";
import { bindRequestLogger, loggerForRequest, releaseRequestLogger } from "./utils/logging";

const router: AppRouter = Router();

router.get("/health", () => handleHealth());

registerMetricsRoutes(router);
registerDeviceRoutes(router, withParam);
registerTelemetryRoutes(router);
registerAdminRoutes(router);

router
  .get("/api/me", (req, env) => handleMe(req, env))
  .get("/api/fleet/summary", (req, env) => handleFleetSummary(req, env))
  .get("/api/fleet/admin-overview", (req, env) => handleFleetAdminOverview(req, env))
  .get("/api/client/compact", (req, env) => handleClientCompact(req, env))
  .get("/api/alerts", (req, env) => handleListAlertRecords(req, env))
  .post("/api/alerts", (req, env) => handleCreateAlertRecord(req, env))
  .patch(
    "/api/alerts/:id",
    withParam("id", (req, env, alertId) => handleUpdateAlertRecord(req, env, alertId)),
  )
  .post(
    "/api/alerts/:id/comments",
    withParam("id", (req, env, alertId) => handleCreateAlertComment(req, env, alertId)),
  )
  .get("/api/alerts/recent", (req, env) => handleAlertsFeed(req, env))
  .get("/api/commissioning/checklist", (req, env) => handleCommissioning(req, env))
  .get("/api/commissioning/runs", (req, env) => handleListCommissioningRuns(req, env))
  .post("/api/commissioning/runs", (req, env) => handleCreateCommissioningRun(req, env))
  .get("/api/archive/offline", (req, env) => handleArchive(req, env))
  .post("/api/observability/client-errors", (req, env) => handleClientErrorReport(req, env))
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
  return Promise.resolve(router.fetch(req, env, ctx))
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
