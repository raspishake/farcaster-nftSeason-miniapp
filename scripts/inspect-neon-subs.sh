#!/usr/bin/env bash
set -euo pipefail

ENDPOINT_POOLER="ep-orange-brook-acyp7wj0-pooler"
HOST="${ENDPOINT_POOLER}.sa-east-1.aws.neon.tech"
DB="neondb"
USER="neondb_owner"

DB_PASS="${1:-}"
if [[ -z "${DB_PASS}" ]]; then
  echo "Usage: ./scripts/inspect-neon-subs.sh 'NEON_PASSWORD'"
  exit 1
fi

BASE_DB_URL="postgresql://${USER}:${DB_PASS}@${HOST}/${DB}?sslmode=require"
DB_URL="${BASE_DB_URL}&options=endpoint%3D${ENDPOINT_POOLER}"
PSQL=(psql "${DB_URL}" -v ON_ERROR_STOP=1 -X -q)

echo "== columns =="
"${PSQL[@]}" -c "
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema='public' and table_name='miniapp_notification_subscribers'
order by ordinal_position;
"

echo
echo "== latest rows =="
"${PSQL[@]}" -c "
select *
from miniapp_notification_subscribers
order by coalesce(updated_at, now()) desc
limit 5;
" || true

echo
echo "== events count / latest =="
"${PSQL[@]}" -c "
select count(*) as events_count from miniapp_notification_webhook_events;
select received_at, decoded_payload
from miniapp_notification_webhook_events
order by received_at desc
limit 5;
"
