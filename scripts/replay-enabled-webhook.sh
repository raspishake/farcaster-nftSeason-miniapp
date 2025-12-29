#!/usr/bin/env bash
set -euo pipefail

WEBHOOK="https://nft-season.vercel.app/api/farcaster/webhook"

HEADER="${1:-}"
PAYLOAD="${2:-}"

if [[ -z "${HEADER}" || -z "${PAYLOAD}" ]]; then
  echo "Usage: $0 '<header_b64url>' '<payload_b64url>'"
  echo "Tip: copy them from your event-tap output for notifications_enabled"
  exit 1
fi

curl -sS -X POST "${WEBHOOK}" \
  -H 'content-type: application/json' \
  -d "$(jq -nc --arg h "${HEADER}" --arg p "${PAYLOAD}" --arg s "x" '{header:$h,payload:$p,signature:$s}')" | jq .
