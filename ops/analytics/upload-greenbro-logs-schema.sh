#!/usr/bin/env bash

set -euo pipefail

if ! command -v wrangler >/dev/null 2>&1; then
  echo "wrangler CLI is required. Install via \`npm install -g wrangler\` or run with \`npx wrangler ...\`." >&2
  exit 1
fi

DATASET_NAME=${1:-greenbro_logs}

echo "Uploading schema to Workers Analytics Engine dataset \"${DATASET_NAME}\"..."

wrangler analytics engine upload-schema "${DATASET_NAME}" \
  --column request_id:string \
  --column ts:timestamp \
  --column level:string \
  --column msg:string \
  --column method:string \
  --column path:string \
  --column status:int \
  --column duration_ms:float \
  --column device_id:string \
  --column profile_id:string \
  --column route:string \
  --column status_code:int \
  --column metric:string \
  --column metric_key:string \
  --column count:int \
  --column bucket_minute:timestamp

echo "Dataset schema uploaded."
