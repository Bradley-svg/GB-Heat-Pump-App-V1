import { handleDeviceHistory, handleLatest, handleListDevices } from "../routes/devices";
import { withAccess } from "./access";

import type { AppRouter, WithParam } from "./params";

export function registerDeviceRoutes(router: AppRouter, withParam: WithParam) {
  router
    .get("/api/devices", withAccess((req, env) => handleListDevices(req, env)))
    .get(
      "/api/devices/:id/latest",
      withAccess(
        withParam("id", (req, env, deviceId) => handleLatest(req, env, deviceId)),
      ),
    )
    .get(
      "/api/devices/:id/history",
      withAccess(
        withParam("id", (req, env, deviceId) => handleDeviceHistory(req, env, deviceId)),
      ),
    );
}
