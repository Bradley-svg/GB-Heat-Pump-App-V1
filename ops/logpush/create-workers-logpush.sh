#!/usr/bin/env bash

set -euo pipefail

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" || -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
  echo "Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID env vars before running." >&2
  exit 1
fi

if [[ -z "${R2_ACCESS_KEY_ID:-}" || -z "${R2_SECRET_ACCESS_KEY:-}" ]]; then
  echo "Set R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY for the greenbro-observability bucket." >&2
  exit 1
fi

DESTINATION_CONF="r2://greenbro-observability/workers-logs?access-key-id=${R2_ACCESS_KEY_ID}&secret-access-key=${R2_SECRET_ACCESS_KEY}&region=auto"

PAYLOAD=$(cat <<JSON
{
  "name": "GB Workers :: Observability -> R2",
  "dataset": "workers_logs",
  "destination_conf": "${DESTINATION_CONF}",
  "frequency": "1m",
  "enabled": true,
  "logpull_options": "batch-time-window=60"
}
JSON
)

curl -sS -X POST "https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/logpush/jobs" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data "${PAYLOAD}"
