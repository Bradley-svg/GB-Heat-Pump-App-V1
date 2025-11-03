import type { RouterType } from "itty-router";

import type { Env } from "../env";
import { safeDecode } from "../utils";
import { json } from "../utils/responses";

export type AppRouter = RouterType<Request, [Env], Response>;
export type RouteHandler = (req: Request, env: Env) => Promise<Response> | Response;
export type ParamHandler = (
  req: Request,
  env: Env,
  value: string,
) => Promise<Response> | Response;
export type WithParam = (param: string, handler: ParamHandler) => RouteHandler;

type RoutedRequest = Request & { params?: Record<string, string> };

function decodeParam(req: RoutedRequest, key: string): string | null {
  const raw = req.params?.[key] ?? null;
  const decoded = safeDecode(raw);
  if (decoded === null || decoded === "") return null;
  return decoded;
}

export const withParam: WithParam = (param, handler) => {
  return (req, env) => {
    const value = decodeParam(req as RoutedRequest, param);
    if (!value) {
      return json({ error: `Invalid ${param}` }, { status: 400 });
    }
    return handler(req, env, value);
  };
};
