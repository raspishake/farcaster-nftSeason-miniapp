#!/usr/bin/env bash
set -euo pipefail

ENDPOINT_POOLER="ep-orange-brook-acyp7wj0-pooler"
HOST="${ENDPOINT_POOLER}.sa-east-1.aws.neon.tech"
DB="neondb"
USER="neondb_owner"

DB_PASS="${1:-}"
[[ -n "${DB_PASS}" ]] || { echo "Usage: $0 'NEON_PASSWORD'"; exit 1; }

DB_URL="postgresql://${USER}:${DB_PASS}@${HOST}/${DB}?sslmode=require&options=endpoint%3D${ENDPOINT_POOLER}"
PSQL=(psql "${DB_URL}" -v ON_ERROR_STOP=1 -X -P pager=off -q)

echo
echo "NEON · FIX miniapp_notification_subscribers(fid) CONSTRAINT"
echo "========================================================="
echo "endpoint: ${ENDPOINT_POOLER}"
echo

echo "0) Sanity"
"${PSQL[@]}" -c "select 1;" >/dev/null
echo "OK"

echo
echo "1) Show constraints"
"${PSQL[@]}" -c "
select con.conname, con.contype, pg_get_constraintdef(con.oid) as def
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
where rel.relname='miniapp_notification_subscribers'
order by con.contype, con.conname;
"

echo
echo "2) Check if fid is PK/unique"
has_unique="$("${PSQL[@]}" -t -A -c "
select count(*)::int
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
join pg_attribute a on a.attrelid = rel.oid
where rel.relname='miniapp_notification_subscribers'
  and con.contype in ('p','u')
  and a.attname='fid'
  and a.attnum = any(con.conkey);
" | tr -d '\r')"

if [[ "${has_unique}" -ge 1 ]]; then
  echo "OK: fid already has PK/unique"
  exit 0
fi

echo "MISSING: fid has no PK/unique. Adding PK(fid)…"

echo
echo "3) Deduplicate by fid (keep newest updated_at), then add PK(fid)"
"${PSQL[@]}" -c "
begin;

with ranked as (
  select ctid, fid,
         row_number() over (partition by fid order by updated_at desc) as rn
  from miniapp_notification_subscribers
)
delete from miniapp_notification_subscribers s
using ranked r
where s.ctid = r.ctid
  and r.rn > 1;

alter table miniapp_notification_subscribers
  add constraint miniapp_notification_subscribers_pkey primary key (fid);

commit;
"

echo
echo "4) Verify"
"${PSQL[@]}" -c "\d+ miniapp_notification_subscribers"

echo
echo "DONE"
