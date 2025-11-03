import { handleAdminOverview } from "../routes/admin";
import { handleCreateAuditEntry, handleListAuditTrail } from "../routes/audit";
import { handleOpsOverview } from "../routes/ops";

import type { AppRouter } from "./params";

export function registerAdminRoutes(router: AppRouter) {
  router
    .get("/api/admin/overview", (req, env) => handleAdminOverview(req, env))
    .get("/api/ops/overview", (req, env) => handleOpsOverview(req, env))
    .get("/api/audit/logs", (req, env) => handleListAuditTrail(req, env))
    .post("/api/audit/logs", (req, env) => handleCreateAuditEntry(req, env));
}
