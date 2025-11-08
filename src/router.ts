import { Router } from "itty-router";

import { registerAdminRoutes } from "./router/admin";
import { registerDeviceRoutes } from "./router/devices";
import { withAccess } from "./router/access";
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
import {
  handleLogin,
  handleLogout,
  handleRecover,
  handleReset,
  handleSignup,
  handleVerifyEmail,
  handleResendVerification,
  handleTelemetryToken,
} from "./routes/auth";
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
import { handleClientErrorReport, handleClientEventReport } from "./routes/observability";
import { bindRequestLogger, loggerForRequest, releaseRequestLogger } from "./utils/logging";
import { recordOpsMetric } from "./lib/ops-metrics";
import {
  initializeRequestMetrics,
  requestMetricsRecorded,
} from "./lib/request-metrics";

const router: AppRouter = Router();

router.get("/health", () => handleHealth());

registerMetricsRoutes(router);
registerDeviceRoutes(router, withParam);
registerTelemetryRoutes(router);
registerAdminRoutes(router);

router
  .post("/api/auth/signup", (req, env) => handleSignup(req, env))
  .post("/api/auth/login", (req, env) => handleLogin(req, env))
  .post("/api/auth/logout", (req, env) => handleLogout(req, env))
  .post("/api/auth/recover", (req, env) => handleRecover(req, env))
  .post("/api/auth/reset", (req, env) => handleReset(req, env))
  .post("/api/auth/verify", (req, env) => handleVerifyEmail(req, env))
  .post("/api/auth/verify/resend", (req, env) => handleResendVerification(req, env))
  .post("/api/auth/telemetry-token", withAccess((req, env) => handleTelemetryToken(req, env)))
  .get("/api/me", withAccess((req, env) => handleMe(req, env)))
  .get("/api/fleet/summary", withAccess((req, env) => handleFleetSummary(req, env)))
  .get(
    "/api/fleet/admin-overview",
    withAccess((req, env) => handleFleetAdminOverview(req, env)),
  )
  .get("/api/client/compact", withAccess((req, env) => handleClientCompact(req, env)))
  .get("/api/alerts", withAccess((req, env) => handleListAlertRecords(req, env)))
  .post("/api/alerts", withAccess((req, env) => handleCreateAlertRecord(req, env)))
  .patch(
    "/api/alerts/:id",
    withAccess(
      withParam("id", (req, env, alertId) => handleUpdateAlertRecord(req, env, alertId)),
    ),
  )
  .post(
    "/api/alerts/:id/comments",
    withAccess(
      withParam("id", (req, env, alertId) => handleCreateAlertComment(req, env, alertId)),
    ),
  )
  .get("/api/alerts/recent", withAccess((req, env) => handleAlertsFeed(req, env)))
  .get("/api/commissioning/checklist", withAccess((req, env) => handleCommissioning(req, env)))
  .get("/api/commissioning/runs", withAccess((req, env) => handleListCommissioningRuns(req, env)))
  .post("/api/commissioning/runs", withAccess((req, env) => handleCreateCommissioningRun(req, env)))
  .get("/api/archive/offline", withAccess((req, env) => handleArchive(req, env)))
  .post(
    "/api/observability/client-errors",
    withAccess((req, env) => handleClientErrorReport(req, env)),
  )
  .post("/api/observability/client-events", withAccess((req, env) => handleClientEventReport(req, env)))
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
  initializeRequestMetrics(req);
  const logger = bindRequestLogger(req, env);
  logger.debug("request.received");
  const pathname = safePath(req.url);
  let statusCode: number | null = null;
  return Promise.resolve(router.fetch(req, env, ctx))
    .then((res) => {
      statusCode = res?.status ?? 0;
      logger.info("request.completed", {
        status: statusCode,
        duration_ms: Date.now() - start,
      });
      return res;
    })
    .catch((err) => {
      statusCode = 500;
      loggerForRequest(req).error("request.failed", {
        duration_ms: Date.now() - start,
        error: err,
      });
      throw err;
    })
    .finally(async () => {
      try {
        if (!requestMetricsRecorded(req)) {
          const route = normalizeRoute(pathname);
          await recordOpsMetric(env, route, statusCode ?? 0, Date.now() - start, null, logger);
        }
      } catch (error) {
        logger.warn("request.metrics_failed", { error });
      } finally {
        releaseRequestLogger(req);
      }
    });
}

function safePath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

function normalizeRoute(pathname: string): string {
  if (pathname.startsWith("/api/ingest/")) return "/api/ingest";
  if (pathname.startsWith("/api/heartbeat/")) return "/api/heartbeat";
  if (pathname.startsWith("/api/alerts/") && pathname.split("/").length === 4) {
    return "/api/alerts/:id";
  }
  if (pathname.startsWith("/api/commissioning/runs")) {
    return "/api/commissioning/runs";
  }
  return pathname;
}
