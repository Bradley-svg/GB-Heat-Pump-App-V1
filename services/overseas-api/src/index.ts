import { Router } from "itty-router";
import { pseudonymizedRecordSchema } from "@greenbro/sdk-core";
import { z } from "zod";

const ingestSchema = z.object({
  batchId: z.string(),
  records: z.array(pseudonymizedRecordSchema),
});

const heartbeatSchema = z.object({
  keyVersion: z.string(),
  timestamp: z.string().datetime(),
});

const router = Router();

router.get("/health", () => new Response(JSON.stringify({ status: "ok" }), { headers: { "Content-Type": "application/json" } }));

router.post("/api/ingest/:profileId", async (request) => {
  const token = request.headers.get("Authorization");
  if (!token) {
    return new Response("missing token", { status: 401 });
  }
  const body = await request.json();
  const payload = ingestSchema.parse(body);
  return new Response(
    JSON.stringify({
      status: "queued",
      accepted: payload.records.length,
    }),
    { headers: { "Content-Type": "application/json" }, status: 202 },
  );
});

router.post("/api/heartbeat/:profileId", async (request) => {
  const body = await request.json();
  const payload = heartbeatSchema.parse(body);
  return new Response(JSON.stringify({ status: "ok", keyVersion: payload.keyVersion }), {
    headers: { "Content-Type": "application/json" },
  });
});

router.all("*", () => new Response("not found", { status: 404 }));

export default {
  fetch: (request: Request, env: Record<string, unknown>, ctx: ExecutionContext) => router.handle(request, env, ctx),
};
