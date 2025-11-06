import http from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";

const baseUrl = (__ENV.K6_BASE_URL || "https://gb-heat-pump-app-v1.bradleyayliffl.workers.dev").replace(
  /\/$/,
  "",
);

export const options = {
  scenarios: {
    smoke: {
      executor: "constant-vus",
      vus: Number(__ENV.K6_VUS || 1),
      duration: __ENV.K6_DURATION || "45s",
      gracefulStop: "5s",
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<500"],
    checks: ["rate>0.99"],
  },
  tags: {
    service: "gb-workers",
    test: "perf-smoke",
  },
};

const healthLatency = new Trend("gb_perf_health_latency", true);

export default function () {
  const headers = {};
  if (__ENV.K6_ACCESS_JWT) {
    headers["CF-Access-Jwt-Assertion"] = __ENV.K6_ACCESS_JWT;
  }
  const response = http.get(`${baseUrl}/health`, { headers });

  check(response, {
    "health status 200": (res) => res.status === 200,
    "health payload ok": (res) => {
      try {
        const body = res.json();
        return Boolean(body?.ok === true);
      } catch {
        return false;
      }
    },
  });

  healthLatency.add(response.timings.duration, {
    endpoint: "health",
  });

  sleep(1);
}

