import { handleAdminOverview, handleClientEventsBackfill } from "../routes/admin";
import { handleCreateAuditEntry, handleListAuditTrail } from "../routes/audit";
import { handleOpsOverview } from "../routes/ops";
import { withAccess } from "./access";

import type { AppRouter } from "./params";

export function registerAdminRoutes(router: AppRouter) {
  router
    .get("/api/admin/overview", withAccess((req, env) => handleAdminOverview(req, env)))
    .post("/api/admin/client-events/backfill", withAccess((req, env) => handleClientEventsBackfill(req, env)))
    .get("/api/ops/overview", withAccess((req, env) => handleOpsOverview(req, env)))
    .get("/api/audit/logs", withAccess((req, env) => handleListAuditTrail(req, env)))
    .post("/api/audit/logs", withAccess((req, env) => handleCreateAuditEntry(req, env)));
}
