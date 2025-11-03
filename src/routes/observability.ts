import type { Env } from "../env";
import { requireAccessUser } from "../lib/access";
import { ClientErrorReportSchema } from "../schemas/observability";
import type { ClientErrorReport } from "../schemas/observability";
import { loggerForRequest } from "../utils/logging";
import { json } from "../utils/responses";
import { validationErrorResponse, validateWithSchema } from "../utils/validation";

const ROUTE_PATH = "/api/observability/client-errors";

export async function handleClientErrorReport(req: Request, env: Env) {
  const user = await requireAccessUser(req, env);
  if (!user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = validateWithSchema<ClientErrorReport>(ClientErrorReportSchema, payload);
  if (!parsed.success) {
    return validationErrorResponse(parsed.issues);
  }

  const body = parsed.data;
  const log = loggerForRequest(req, { route: ROUTE_PATH });

  const userContext = {
    email: user.email,
    roles: user.roles,
    client_ids: user.clientIds,
  };

  const report = {
    name: body.name,
    message: body.message,
    stack: body.stack,
    component_stack: body.componentStack,
    user_agent: body.userAgent,
    url: body.url,
    timestamp: body.timestamp ?? new Date().toISOString(),
    release: body.release,
    tags: body.tags,
    extras: body.extras,
    reporter_user: body.user ?? null,
  };

  log.error("ui.error_boundary", {
    source: "frontend",
    report,
    user: userContext,
  });

  return json({ ok: true }, { status: 202 });
}
