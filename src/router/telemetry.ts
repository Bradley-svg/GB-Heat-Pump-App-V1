import { handleTelemetryLatestBatch, handleTelemetrySeries } from "../routes/telemetry";

import type { AppRouter } from "./params";

export function registerTelemetryRoutes(router: AppRouter) {
  router
    .post("/api/telemetry/latest-batch", (req, env) => handleTelemetryLatestBatch(req, env))
    .get("/api/telemetry/series", (req, env) => handleTelemetrySeries(req, env));
}
