# Node-RED MQTT → HTTPS Bridge

This guide ships a reference Node-RED flow (`services/node-red/bridge.flow.json`) that listens to factory MQTT topics and forwards payloads to the Cloudflare Worker ingest + heartbeat endpoints. Import the flow via **Menu → Import → Clipboard**, then tailor the broker, credentials, and Worker hostnames before deploying.

## Prerequisites

- Node-RED 3.x or newer with access to the factory MQTT broker.
- Update `settings.js` to expose the Node.js crypto module to Function nodes:

```js
functionGlobalContext: {
  crypto: require("crypto"),
},
```

- Environment variables (Node-RED → Settings → Environment) or flow context storing:
  - `GREENBRO_DEVICE_KEY`: raw device key provisioned with the unit (the bridge derives the SHA-256 hash before signing).
  - `GREENBRO_BRIDGE` (JSON): `{ "profileId": "demo", "workerBase": "https://gb-heat-pump-app-v1.example.workers.dev", "deviceId": "demo-device" }`.

## Flow Overview

1. **MQTT inputs** subscribe to `greenbro/{profileId}/telemetry` and `greenbro/{profileId}/heartbeat`.
2. **Function nodes** normalize the payload, inject an ISO timestamp, and compute the `X-GREENBRO-SIGNATURE` header using HMAC-SHA256 (`deviceKeyHash` as the signing key). The telemetry function also sets `faults`/`rssi` defaults and ensures the device ID is present.
3. **HTTP request nodes** POST to:
   - `https://<worker>/api/ingest/{profileId}` with headers `X-GREENBRO-DEVICE-KEY`, `X-GREENBRO-TIMESTAMP`, `X-GREENBRO-SIGNATURE`.
   - `https://<worker>/api/heartbeat/{profileId}` for keepalives.

## Deployment Notes

- Configure TLS/credential settings in the MQTT broker config node (ID `mqtt-broker-config`).
- The flow logs the Worker responses to Node-RED’s debug sidebar; hook these into your alerting if you need automated retries.
- Backoff on `429 Rate limit exceeded` responses according to the ingest runbook (`docs/device-ingest-api.md`).
- Keep the bridge host synchronized with NTP so timestamp and signature checks remain within tolerance.
