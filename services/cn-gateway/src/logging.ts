import pino from "pino";
import { config } from "./config.js";

export const logger = pino({
  level: config.LOG_LEVEL,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.headers['x-device-signature']",
      "req.headers['x-admin-token']",
      "req.headers['x-admin-totp']",
      "req.body.deviceId",
      "req.body.device_id",
      "req.body.metrics",
      "res.headers['x-batch-signature']"
    ],
    remove: true
  },
  messageKey: "message",
  formatters: {
    level(label) {
      return { level: label };
    }
  },
  base: {
    service: "cn-gateway"
  }
});
