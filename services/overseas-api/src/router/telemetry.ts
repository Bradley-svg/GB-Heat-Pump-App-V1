import { handleTelemetryLatestBatch, handleTelemetrySeries } from "../routes/telemetry";
import { withAccess } from "./access";

import type { AppRouter } from "./params";

export function registerTelemetryRoutes(router: AppRouter) {
  router
    .post(
      "/api/telemetry/latest-batch",
      withAccess((req, env, ctx) => handleTelemetryLatestBatch(req, env, ctx)),
    )
    .get(
      "/api/telemetry/series",
      withAccess((req, env, ctx) => handleTelemetrySeries(req, env, ctx)),
    );
}
