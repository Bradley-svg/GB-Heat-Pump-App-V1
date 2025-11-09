# @greenbro/sdk-core

Mode A shared primitives for pseudonymization, SAFE metric validation, and ingest payload helpers. Consumers import from this package to ensure every client and service enforces the same schema rules before data crosses the CN boundary.

## Features
- Deterministic HMAC-SHA256 pseudonymization with collision helper
- SAFE / DROP list constants for guardrails
- Shared Zod schemas for ingest payloads and pseudonymized exports
- Timestamp normalization + replay window helpers

## Usage
```ts
import { pseudonymizeDeviceId, telemetryMetricsSchema } from "@greenbro/sdk-core";

const { didPseudo } = pseudonymizeDeviceId("device-001", { key: Buffer.from("secret"), keyVersion: "v2" });
const metrics = telemetryMetricsSchema.parse(payload.metrics);
```

Run `pnpm --filter @greenbro/sdk-core test` to execute the Vitest suite.
