import type { RouteHandler } from "./params";
import { requireAccessUser } from "../lib/access";
import { json } from "../utils/responses";

/**
 * Ensures Cloudflare Access authentication has succeeded before invoking the route handler.
 * The authenticated user is cached on the request, so downstream calls to `requireAccessUser`
 * return instantly without re-validating the JWT.
 */
export function withAccess(handler: RouteHandler): RouteHandler {
  return async (req, env, ctx) => {
    const user = await requireAccessUser(req, env);
    if (!user) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }
    return handler(req, env, ctx);
  };
}

