#!/usr/bin/env bash
set -euo pipefail

ENDPOINT="ep-orange-brook-acyp7wj0-pooler"
DB_USER="neondb_owner"
DB_NAME="neondb"
DB_HOST="${ENDPOINT}.sa-east-1.aws.neon.tech"

DB_PASS=""
TITLE=""
BODY=""
TARGET_URL=""
APP_FID="372916"
CONNECT_TIMEOUT=5
MAX_TIME=20

usage() {
  cat <<'USAGE'
Usage:
  ./scripts/farcaster-send-triage.sh --db-pass '...' --title '...' --body '...' --target-url '...'

Optional:
  --app-fid 372916
  --connect-timeout 5
  --max-time 20
USAGE
}

uuid_v4() {
  if command -v uuidgen >/dev/null 2>&1; then
    uuidgen | tr '[:upper:]' '[:lower:]'
    return 0
  fi
  node -e 'console.log(require("crypto").randomUUID())'
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --db-pass) DB_PASS="${2:-}"; shift 2;;
    --title) TITLE="${2:-}"; shift 2;;
    --body) BODY="${2:-}"; shift 2;;
    --target-url) TARGET_URL="${2:-}"; shift 2;;
    --app-fid) APP_FID="${2:-}"; shift 2;;
    --connect-timeout) CONNECT_TIMEOUT="${2:-}"; shift 2;;
    --max-time) MAX_TIME="${2:-}"; shift 2;;
    -h|--help) usage; exit 0;;
    *) echo "Unknown arg: $1"; usage; exit 1;;
  esac
done

[[ -n "$DB_PASS" ]] || { echo "Missing --db-pass"; exit 1; }
[[ -n "$TITLE" ]] || { echo "Missing --title"; exit 1; }
[[ -n "$BODY" ]] || { echo "Missing --body"; exit 1; }
[[ -n "$TARGET_URL" ]] || { echo "Missing --target-url"; exit 1; }

DB_URL="postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}/${DB_NAME}?sslmode=require&options=endpoint%3D${ENDPOINT}"

echo "NFT SEASON · SEND TRIAGE"
echo "========================"
echo "endpoint: ${ENDPOINT}"
echo "app_fid:  ${APP_FID}"
echo

echo "1) Latest notifications_enabled event (what Warpcast last gave you)"
psql "${DB_URL}" -P pager=off -c "
  select received_at, decoded_header, decoded_payload
  from miniapp_notification_webhook_events
  where (decoded_payload->>'event') = 'notifications_enabled'
  order by received_at desc
  limit 1;
" || true
echo

echo "2) Forcing subscribers row from latest enabled event (fresh token/url in DB)"
psql "${DB_URL}" -P pager=off -c "
with e as (
  select
    (decoded_header->>'fid')::bigint as fid,
    (${APP_FID})::bigint as app_fid,
    decoded_payload->'notificationDetails'->>'token' as token,
    decoded_payload->'notificationDetails'->>'url' as notification_url,
    received_at
  from miniapp_notification_webhook_events
  where (decoded_payload->>'event')='notifications_enabled'
  order by received_at desc
  limit 1
)
insert into miniapp_notification_subscribers (fid, app_fid, token, notification_url, enabled, updated_at)
select fid, app_fid, token, notification_url, true, now()
from e
on conflict (fid, app_fid) do update
set token = excluded.token,
    notification_url = excluded.notification_url,
    enabled = true,
    updated_at = now();
"
echo "OK"
echo

echo "3) Subscriber row now"
psql "${DB_URL}" -P pager=off -c "
  select fid, app_fid, enabled, length(token) as token_len, notification_url, updated_at
  from miniapp_notification_subscribers
  where app_fid=${APP_FID}
  order by updated_at desc
  limit 5;
"
echo

# pull newest enabled token+url
read -r token url updated_at <<<"$(
  psql "${DB_URL}" -P pager=off -t -A -c "
    select token || ' ' || notification_url || ' ' || to_char(updated_at,'YYYY-MM-DD\"T\"HH24:MI:SSOF')
    from miniapp_notification_subscribers
    where app_fid=${APP_FID} and enabled=true and token is not null and length(token)>0
    order by updated_at desc
    limit 1;
  " | awk '{$1=$1;print}'
)"

if [[ -z "${token:-}" || -z "${url:-}" ]]; then
  echo "FAIL: no enabled token+url in DB."
  exit 2
fi

notification_id="$(uuid_v4)"

echo "4) Sending immediately"
echo "-> POST ${url}"
echo "   token: ${token:0:8}… (len=${#token})"
echo "   notificationId: ${notification_id}"
echo

payload="$(
  jq -nc \
    --arg notificationId "$notification_id" \
    --arg title "$TITLE" \
    --arg body "$BODY" \
    --arg targetUrl "$TARGET_URL" \
    --arg token "$token" \
    '{
      notificationId: $notificationId,
      title: $title,
      body: $body,
      targetUrl: $targetUrl,
      tokens: [$token]
    }'
)"

tmp_body="$(mktemp)"
tmp_hdr="$(mktemp)"

set +e
http_code="$(
  curl -sS \
    --connect-timeout "${CONNECT_TIMEOUT}" \
    --max-time "${MAX_TIME}" \
    -D "${tmp_hdr}" \
    -o "${tmp_body}" \
    -w "%{http_code}" \
    -X POST "${url}" \
    -H "content-type: application/json" \
    -H "accept: application/json" \
    -d "${payload}"
)"
rc=$?
set -e

if [[ $rc -ne 0 ]]; then
  echo "FAIL: curl exit ${rc}"
  rm -f "${tmp_body}" "${tmp_hdr}"
  exit 3
fi

echo "HTTP: ${http_code}"
echo "Response:"
cat "${tmp_body}" || true
echo

resp="$(cat "${tmp_body}" 2>/dev/null || echo '')"

rm -f "${tmp_body}" "${tmp_hdr}"

# If token is invalid, disable it so you don't keep retrying garbage
if echo "$resp" | jq -e --arg t "$token" '.result.invalidTokens? and (.result.invalidTokens | index($t) != null)' >/dev/null 2>&1; then
  echo "5) Token is INVALID, disabling it in DB"
  psql "${DB_URL}" -P pager=off -c "
    update miniapp_notification_subscribers
    set enabled=false, updated_at=now()
    where app_fid=${APP_FID} and token='${token}';
  " >/dev/null
  echo "Disabled."
  exit 4
fi

echo "DONE"
