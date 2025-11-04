import { handleTelemetryLatestBatch, handleTelemetrySeries } from "../routes/telemetry";

import type { AppRouter } from "./params";

export function registerTelemetryRoutes(router: AppRouter) {
  router
    .post("/api/telemetry/latest-batch", (req, env, ctx) => handleTelemetryLatestBatch(req, env, ctx))
    .get("/api/telemetry/series", (req, env, ctx) => handleTelemetrySeries(req, env, ctx));
}
