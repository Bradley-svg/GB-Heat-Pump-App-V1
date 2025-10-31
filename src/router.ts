import type { Env } from "./env";
import { handleAlertsFeed } from "./routes/alerts";
import { handleArchive } from "./routes/archive";
import { handleClientCompact } from "./routes/client";
import { handleDeviceHistory, handleLatest, handleListDevices } from "./routes/devices";
import { handleFleetSummary } from "./routes/fleet";
import { handleHeartbeat, handleIngest } from "./routes/ingest";
import { handleMe } from "./routes/me";
import { handleCommissioning } from "./routes/commissioning";
import { handleAdminOverview } from "./routes/admin";

export type RouteHandler = (req: Request, env: Env, params: Record<string, string>) => Promise<Response>;

interface Route {
  method: string;
  matcher: RegExp | string;
  handler: RouteHandler;
}

const routes: Route[] = [
  { method: "GET", matcher: "/api/me", handler: (req, env) => handleMe(req, env) },
  { method: "GET", matcher: "/api/fleet/summary", handler: (req, env) => handleFleetSummary(req, env) },
  { method: "GET", matcher: "/api/client/compact", handler: (req, env) => handleClientCompact(req, env) },
  { method: "GET", matcher: "/api/devices", handler: (req, env) => handleListDevices(req, env) },
  { method: "GET", matcher: "/api/alerts/recent", handler: (req, env) => handleAlertsFeed(req, env) },
  { method: "GET", matcher: "/api/commissioning/checklist", handler: (req, env) => handleCommissioning(req, env) },
  { method: "GET", matcher: "/api/admin/overview", handler: (req, env) => handleAdminOverview(req, env) },
  { method: "GET", matcher: "/api/archive/offline", handler: (req, env) => handleArchive(req, env) },
  {
    method: "GET",
    matcher: /^\/api\/devices\/(?<id>[^/]+)\/latest$/,
    handler: (req, env, params) => handleLatest(req, env, decodeURIComponent(params.id)),
  },
  {
    method: "GET",
    matcher: /^\/api\/devices\/(?<id>[^/]+)\/history$/,
    handler: (req, env, params) => handleDeviceHistory(req, env, decodeURIComponent(params.id)),
  },
  {
    method: "POST",
    matcher: /^\/api\/ingest\/(?<profile>[^/]+)$/,
    handler: (req, env, params) => handleIngest(req, env, decodeURIComponent(params.profile)),
  },
  {
    method: "POST",
    matcher: /^\/api\/heartbeat\/(?<profile>[^/]+)$/,
    handler: (req, env, params) => handleHeartbeat(req, env, decodeURIComponent(params.profile)),
  },
];

export async function routeRequest(req: Request, env: Env): Promise<Response | null> {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method.toUpperCase();

  for (const route of routes) {
    if (route.method !== method) continue;
    if (typeof route.matcher === "string") {
      if (route.matcher === path) {
        return route.handler(req, env, {});
      }
      continue;
    }

    const match = path.match(route.matcher);
    if (match) {
      const params = match.groups ?? {};
      return route.handler(req, env, params);
    }
  }

  return null;
}
