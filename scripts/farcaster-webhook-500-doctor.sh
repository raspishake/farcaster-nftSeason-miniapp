#!/usr/bin/env bash
set -euo pipefail

APP_URL="https://nft-season.vercel.app"
WEBHOOK="$APP_URL/api/farcaster/webhook"

banner () {
  echo
  echo "NFT SEASON · WEBHOOK 500 DOCTOR"
  echo "==============================="
  echo
}

need () {
  command -v "$1" >/dev/null 2>&1 || { echo "Missing: $1"; exit 1; }
}

best_effort_vercel_logs () {
  local since="${1:-15m}"

  echo
  echo "---- vercel logs (best effort, since=$since) ----"
  echo

  # Never stream forever. Hard stop after 20s.
  if timeout 20s npx vercel logs nft-season.vercel.app --since "$since" --limit 200 > /tmp/vercel_logs.txt 2>/tmp/vercel_logs_err.txt; then
    cat /tmp/vercel_logs.txt
    return 0
  fi

  echo "Timed out or failed to fetch logs. stderr:"
  cat /tmp/vercel_logs_err.txt || true
  return 1
}

main () {
  banner
  need curl
  need npx
  need jq
  need timeout

  echo "0) Sanity"
  echo "Webhook: $WEBHOOK"
  echo "OK"
  echo

  echo "1) POST probe (should be 200/400, NOT 500)"
  tmp_headers="$(mktemp)"
  tmp_body="$(mktemp)"

  curl -sS -D "$tmp_headers" -o "$tmp_body" -X POST "$WEBHOOK" \
    -H "content-type: application/json" \
    -d '{"header":"x","payload":"y","signature":"z"}' || true

  status="$(awk 'NR==1{print $2}' "$tmp_headers" | tr -d '\r' || true)"
  vercel_id="$(grep -i '^x-vercel-id:' "$tmp_headers" | head -n1 | cut -d: -f2- | xargs || true)"

  echo "HTTP: ${status:-UNKNOWN}"
  echo "x-vercel-id: ${vercel_id:-UNKNOWN}"
  echo
  echo "Body:"
  cat "$tmp_body" || true
  echo

  if [[ "${status:-}" == "500" ]]; then
    echo "2) 500 detected, pulling recent Vercel logs"
    best_effort_vercel_logs "15m" || true
    exit 1
  fi

  echo "2) Not 500, good."
  echo "DONE"
}

main "$@"
