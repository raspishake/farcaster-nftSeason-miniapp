#!/usr/bin/env bash
set -euo pipefail

ENDPOINT="ep-orange-brook-acyp7wj0-pooler"
DB_USER="neondb_owner"
DB_NAME="neondb"
DB_HOST="${ENDPOINT}.sa-east-1.aws.neon.tech"

DB_PASS="${1:-}"
APP_FID="${2:-372916}"

[[ -n "$DB_PASS" ]] || { echo "Usage: $0 <db-pass> [app_fid]"; exit 1; }

DB_URL="postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}/${DB_NAME}?sslmode=require&options=endpoint%3D${ENDPOINT}"

echo "NEON · FORCE ENABLE FROM LATEST notifications_enabled"
echo "====================================================="
echo "endpoint: ${ENDPOINT}"
echo "app_fid:  ${APP_FID}"
echo

psql "${DB_URL}" -P pager=off -v ON_ERROR_STOP=1 -c "
with latest as (
  select
    (decoded_header->>'fid')::bigint as fid,
    '${APP_FID}'::bigint as app_fid,
    decoded_payload#>>'{notificationDetails,url}' as url,
    decoded_payload#>>'{notificationDetails,token}' as token,
    received_at
  from miniapp_notification_webhook_events
  where decoded_payload->>'event' = 'notifications_enabled'
  order by received_at desc
  limit 1
)
insert into miniapp_notification_subscribers (fid, app_fid, token, notification_url, enabled, updated_at)
select fid, app_fid, token, url, true, now()
from latest
on conflict (fid, app_fid)
do update set
  token = excluded.token,
  notification_url = excluded.notification_url,
  enabled = true,
  updated_at = now();
"

echo
echo "Current subscribers:"
psql "${DB_URL}" -P pager=off -t -A -c "
  select fid, app_fid, enabled, length(coalesce(token,'')) as token_len, notification_url, updated_at
  from miniapp_notification_subscribers
  where app_fid = ${APP_FID}
  order by updated_at desc
  limit 5;
"
