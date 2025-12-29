#!/usr/bin/env bash
set -euo pipefail

ENDPOINT_POOLER="ep-orange-brook-acyp7wj0-pooler"
HOST="${ENDPOINT_POOLER}.sa-east-1.aws.neon.tech"
DB="neondb"
USER="neondb_owner"

WAIT_SECS=30
DB_PASS=""

usage() {
  echo "Usage: $0 --db-pass 'NEON_PASSWORD' [--wait 30]"
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --db-pass) DB_PASS="${2:-}"; shift 2;;
    --wait) WAIT_SECS="${2:-30}"; shift 2;;
    -h|--help) usage;;
    *) echo "Unknown arg: $1"; usage;;
  esac
done

[[ -n "${DB_PASS}" ]] || usage

BASE_DB_URL="postgresql://${USER}:${DB_PASS}@${HOST}/${DB}?sslmode=require"
DB_URL="${BASE_DB_URL}&options=endpoint%3D${ENDPOINT_POOLER}"

# Kill pager and keep output predictable
PSQL=(psql "${DB_URL}" -v ON_ERROR_STOP=1 -X -P pager=off -q)

MANIFEST_URL="https://nft-season.vercel.app/.well-known/farcaster.json"
WEBHOOK_URL="https://nft-season.vercel.app/api/farcaster/webhook"

echo
echo "NFT SEASON · FARCASTER NOTIFICATION DOCTOR (WAIT-FOR-ENABLE)"
echo "==========================================================="
echo
echo "Using Neon endpoint: ${ENDPOINT_POOLER}"
echo "Wait window: ${WAIT_SECS}s"
echo

step() { echo; echo "$1"; }

step "0) Manifest check"
curl -fsS "${MANIFEST_URL}" >/dev/null
echo "OK"

step "1) Webhook reachability (400 is fine)"
code="$(curl -sS -o /dev/null -w '%{http_code}' -X POST "${WEBHOOK_URL}" -H 'content-type: application/json' -d '{}')"
if [[ "${code}" == "200" || "${code}" == "400" ]]; then
  echo "OK"
else
  echo "FAIL: Unexpected HTTP ${code}"
  exit 1
fi

step "2) Postgres auth test"
"${PSQL[@]}" -c "select 1;" >/dev/null
echo "OK"

step "3) Ensure tables exist"
"${PSQL[@]}" -c "
create table if not exists miniapp_notification_webhook_events (
  id bigserial primary key,
  received_at timestamptz not null default now(),
  decoded_header jsonb,
  decoded_payload jsonb,
  body jsonb
);
create index if not exists idx_mnwe_received_at
  on miniapp_notification_webhook_events (received_at desc);

create table if not exists miniapp_notification_subscribers (
  fid bigint primary key,
  app_fid bigint not null,
  token text,
  notification_url text,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
" >/dev/null
echo "OK"

step "4) Clear subscribers + webhook events"
"${PSQL[@]}" -c "truncate table miniapp_notification_subscribers;" >/dev/null
"${PSQL[@]}" -c "truncate table miniapp_notification_webhook_events;" >/dev/null
echo "OK"

step "5) Toggle OFF then ON (we stop only on enabled)"
echo "==========================================================="
echo
echo "Do this now (Warpcast mobile):"
echo "  a) open miniapp"
echo "  b) menu (⋮)"
echo "  c) toggle OFF"
echo "  d) wait 2 seconds"
echo "  e) toggle ON and confirm it stays ON"
echo "  f) force-close Warpcast"
echo "  g) reopen and open miniapp"
echo

deadline=$(( $(date +%s) + WAIT_SECS ))
last_event=""

while true; do
  now_ts=$(date +%s)
  if [[ "${now_ts}" -ge "${deadline}" ]]; then
    echo
    echo "Timed out. Last event: ${last_event:-none}"
    break
  fi

  ev="$("${PSQL[@]}" -t -A -c "
    select coalesce(decoded_payload->>'event','')
    from miniapp_notification_webhook_events
    order by received_at desc
    limit 1;
  " | tr -d '\r')"

  if [[ -n "${ev}" && "${ev}" != "${last_event}" ]]; then
    last_event="${ev}"
    echo "event: ${ev}"
    [[ "${ev}" == "notifications_enabled" ]] && break
  fi

  sleep 1
done

step "6) Latest enabled payload"
"${PSQL[@]}" -c "
select received_at, decoded_payload
from miniapp_notification_webhook_events
where decoded_payload->>'event'='notifications_enabled'
order by received_at desc
limit 1;
"

step "7) Subscribers"
"${PSQL[@]}" -c "
select fid, app_fid, enabled, length(coalesce(token,'')) as token_len, notification_url, updated_at
from miniapp_notification_subscribers
order by updated_at desc
limit 5;
"

echo
echo "DONE"
