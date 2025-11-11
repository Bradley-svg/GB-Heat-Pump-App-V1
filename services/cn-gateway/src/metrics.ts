import {
  Counter,
  Gauge,
  Histogram,
  Registry,
  collectDefaultMetrics
} from "prom-client";
import { config } from "./config.js";

export const registry = new Registry();

if (config.METRICS_ENABLED) {
  collectDefaultMetrics({ register: registry });
}

export const ingestLatency = new Histogram({
  name: "cn_gateway_ingest_latency_seconds",
  help: "Latency for ingest handler",
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2],
  labelNames: ["outcome"],
  registers: [registry]
});

export const ingestRequests = new Counter({
  name: "cn_gateway_ingest_requests_total",
  help: "Total ingest requests by outcome",
  labelNames: ["outcome"],
  registers: [registry]
});

export const exporterQueueSize = new Gauge({
  name: "cn_gateway_exporter_queue_size",
  help: "Current queued records awaiting export",
  registers: [registry]
});

export const exporterBatches = new Counter({
  name: "cn_gateway_export_batches_total",
  help: "Batches pushed to overseas endpoint by status",
  labelNames: ["status"],
  registers: [registry]
});

export async function metricsResponse() {
  return registry.metrics();
}
