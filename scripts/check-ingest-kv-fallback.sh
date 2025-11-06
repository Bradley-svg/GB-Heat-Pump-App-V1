#!/usr/bin/env bash
set -euo pipefail

# Prompt Bible #6: automated alert plumbing for ingest IP KV fallback.
# This script tails Cloudflare Workers logs for a short window and fails
# if any `ingest.ip_kv_bucket_failed` entries are observed. Intended to
# run inside CI (e.g., GitHub Actions) using Wrangler.

usage() {
  cat <<'EOF'
Usage: scripts/check-ingest-kv-fallback.sh [duration_secs] [worker_name] [env]
  duration_secs  Optional tail duration in seconds (default: 60)
  worker_name    Worker name to tail (default: gb-heat-pump-app-v1)
  env            Wrangler environment (default: production)

Requires:
  - CLOUDFLARE_ACCOUNT_ID (env var)
  - CLOUDFLARE_API_TOKEN (env var with Workers tail permission)
EOF
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

DURATION="${1:-60}"
WORKER_NAME="${2:-gb-heat-pump-app-v1}"
WRANGLER_ENV="${3:-production}"

TMP_LOG="$(mktemp)"
TAIL_LOG="$(mktemp)"
cleanup() {
  rm -f "$TMP_LOG" "$TAIL_LOG"
}
trap cleanup EXIT

echo "::group::Tail worker logs for ${DURATION}s"
if ! command -v jq >/dev/null 2>&1; then
  echo "::error::jq is required. Install jq before running this script."
  exit 1
fi

set +e
timeout "${DURATION}" npx wrangler tail "${WORKER_NAME}" \
  --format=json \
  --sampling-rate 1 \
  --env "${WRANGLER_ENV}" \
  >"${TAIL_LOG}" 2>&1
TAIL_STATUS=$?
set -e

# Wrangler tail exits 0/124 depending on timeout; both are acceptable.
if [[ ${TAIL_STATUS} -ne 0 && ${TAIL_STATUS} -ne 124 ]]; then
  cat "${TAIL_LOG}"
  echo "::error::wrangler tail exited with status ${TAIL_STATUS}"
  exit "${TAIL_STATUS}"
fi

jq -c 'select(.msg == "ingest.ip_kv_bucket_failed")' "${TAIL_LOG}" | tee "${TMP_LOG}"
echo "::endgroup::"

if [[ -s "${TMP_LOG}" ]]; then
  echo "::error::Detected ingest.ip_kv_bucket_failed logs. Investigate KV binding."
  exit 1
fi

echo "No ingest.ip_kv_bucket_failed logs observed during ${DURATION}s window."
