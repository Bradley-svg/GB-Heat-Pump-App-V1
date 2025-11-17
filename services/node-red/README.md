# Node-RED MQTT Bridge

This flow (`bridge.flow.json`) ships a bridge that listens to MQTT topics and forwards payloads to the Cloudflare Worker ingest endpoints.

## TLS configuration
- The MQTT broker node is wired to a TLS config named `Factory MQTT TLS (set cert/key/ca paths)` and **`usetls` is enabled**.
- Update the TLS config paths before deploying:
  - `cert`: absolute path to the client certificate (e.g., `/data/certs/client.crt`).
  - `key`: absolute path to the client private key (e.g., `/data/certs/client.key`).
  - `ca`: absolute path to the CA bundle that signs the broker (e.g., `/data/certs/ca.crt`).
- Ensure the `servername` matches the broker’s TLS certificate `CN`/`SAN` and that `verifyservercert` remains `true` to avoid MITM downgrade.

After importing the flow, open the **MQTT Broker** config node in Node-RED and confirm the TLS reference points to the configured TLS node.
