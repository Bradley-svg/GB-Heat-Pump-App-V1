import { handleMetrics } from "../routes/metrics";

import type { AppRouter } from "./params";

export function registerMetricsRoutes(router: AppRouter) {
  router.get("/metrics", (req, env) => handleMetrics(req, env));
}
