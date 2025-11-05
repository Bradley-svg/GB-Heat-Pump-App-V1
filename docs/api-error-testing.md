# API Error Contract Testing

## Purpose
Run automated checks to ensure backend APIs continue to return the documented JSON error envelope (status code, error, optional details). Helps catch regressions when changing validation/auth layers.

## Tooling Options

| Tool | Notes |
| --- | --- |
| [newman](https://github.com/postmanlabs/newman) | Run Postman collections with scripted assertions on error responses. |
| [k6](https://k6.io) | Load + functional checks; assertions can inspect JSON payloads. |
| [custom Vitest suite](../src/routes/__tests__) | Extend existing tests with schema helpers to assert error/details presence. |

## Suggested Workflow

1. **Define canonical error cases** per route (invalid JSON, auth missing, validation failure, rate limit, server error).
2. **Add JSON schema matcher** (e.g., Zod) in tests to assert the shape { error: string; details?: Array<{ path: string; message: string }> }.
3. **Automate in CI** using 
px vitest run src --reporter junit or a Postman/Newman job.
4. **Document test matrix** in this file once implemented.
