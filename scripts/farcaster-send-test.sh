#!/usr/bin/env bash
set -euo pipefail

DB_PASS=""
TITLE=""
BODY=""
TARGET_URL=""
SLEEP_AFTER_RATE_LIMIT_SEC=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --db-pass) DB_PASS="$2"; shift 2 ;;
    --title) TITLE="$2"; shift 2 ;;
    --body) BODY="$2"; shift 2 ;;
    --target-url) TARGET_URL="$2"; shift 2 ;;
    --sleep-after-rate-limit) SLEEP_AFTER_RATE_LIMIT_SEC="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

if [[ -z "$DB_PASS" || -z "$TITLE" || -z "$BODY" || -z "$TARGET_URL" ]]; then
  echo "Missing required args"
  exit 1
fi

DB_URL="postgresql://neondb_owner:${DB_PASS}@ep-orange-brook-acyp7wj0-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&options=endpoint%3Dep-orange-brook-acyp7wj0-pooler"
APP_FID=372916
ENDPOINT="https://api.farcaster.xyz/v1/frame-notifications"
NOTIFICATION_ID="$(uuidgen)"

echo "NFT SEASON · SEND TEST (RATE-LIMIT AWARE)"
echo "========================================"
echo "endpoint: ep-orange-brook-acyp7wj0-pooler"
echo "app_fid:  ${APP_FID}"
echo

# 0) Ensure schema supports cooldown_until
psql "$DB_URL" -v ON_ERROR_STOP=1 -q -c "
  alter table miniapp_notification_subscribers
  add column if not exists cooldown_until timestamptz;
" >/dev/null

# 1) Load eligible tokens (enabled AND not in cooldown)
TOKENS=$(psql "$DB_URL" -Atc "
  select token
  from miniapp_notification_subscribers
  where enabled = true
    and app_fid = ${APP_FID}
    and token is not null
    and length(token) > 0
    and (cooldown_until is null or cooldown_until <= now())
")

if [[ -z "$TOKENS" ]]; then
  echo "No enabled, non-cooled-down tokens in DB."
  echo
  echo "Current token states:"
  psql "$DB_URL" -P pager=off -c "
    select fid, app_fid, enabled,
           case when token is null then 0 else length(token) end as token_len,
           cooldown_until,
           updated_at
    from miniapp_notification_subscribers
    where app_fid = ${APP_FID}
    order by updated_at desc
    limit 10;
  " >/dev/null
  exit 0
fi

mapfile -t TOK_ARRAY <<< "$TOKENS"
echo "Found ${#TOK_ARRAY[@]} eligible token(s). Sending..."
echo

TOKENS_JSON=$(printf '%s\n' "${TOK_ARRAY[@]}" | jq -R . | jq -s .)

PAYLOAD=$(jq -n \
  --arg id "$NOTIFICATION_ID" \
  --arg title "$TITLE" \
  --arg body "$BODY" \
  --arg url "$TARGET_URL" \
  --argjson tokens "$TOKENS_JSON" \
  '{
    notificationId: $id,
    title: $title,
    body: $body,
    targetUrl: $url,
    tokens: $tokens
  }'
)

echo "-> POST ${ENDPOINT}"
echo "   tokens: ${#TOK_ARRAY[@]}"
echo "   notificationId: ${NOTIFICATION_ID}"

RESP=$(curl -sS -X POST "$ENDPOINT" \
  -H 'content-type: application/json' \
  --data "$PAYLOAD"
)

echo
echo "Response:"
echo "$RESP" | jq .

INVALID=$(echo "$RESP" | jq -r '.result.invalidTokens[]?' || true)
RATE_LIMITED=$(echo "$RESP" | jq -r '.result.rateLimitedTokens[]?' || true)
SUCCESS=$(echo "$RESP" | jq -r '.result.successfulTokens[]?' || true)

# 2) Disable invalid tokens
if [[ -n "$INVALID" ]]; then
  echo
  echo "Disabling invalid tokens:"
  while read -r t; do
    [[ -z "$t" ]] && continue
    echo "  - $t"
    psql "$DB_URL" -q -c "
      update miniapp_notification_subscribers
      set enabled = false, updated_at = now()
      where token = '$t';
    " >/dev/null
  done <<< "$INVALID"
fi

# 3) Backoff rate-limited tokens
# We don't know exact quota rules, so we use an exponential-ish safe default:
# first rate-limit hit = 2 minutes
# subsequent hits before cooldown clears will keep pushing it forward.
if [[ -n "$RATE_LIMITED" ]]; then
  echo
  echo "Rate-limited tokens, applying cooldown:"
  while read -r t; do
    [[ -z "$t" ]] && continue
    echo "  - $t  -> cooldown 120s"
    psql "$DB_URL" -q -c "
      update miniapp_notification_subscribers
      set cooldown_until = greatest(coalesce(cooldown_until, now()), now()) + interval '120 seconds',
          updated_at = now()
      where token = '$t';
    " >/dev/null
  done <<< "$RATE_LIMITED"

  if [[ "$SLEEP_AFTER_RATE_LIMIT_SEC" -gt 0 ]]; then
    echo
    echo "Sleeping ${SLEEP_AFTER_RATE_LIMIT_SEC}s (requested) ..."
    sleep "$SLEEP_AFTER_RATE_LIMIT_SEC"
  fi
fi

# 4) Print summary
echo
echo "Summary:"
echo "  successful:  $( [[ -n "$SUCCESS" ]] && echo "$SUCCESS" | wc -l | tr -d ' ' || echo 0 )"
echo "  invalid:     $( [[ -n "$INVALID" ]] && echo "$INVALID" | wc -l | tr -d ' ' || echo 0 )"
echo "  rateLimited: $( [[ -n "$RATE_LIMITED" ]] && echo "$RATE_LIMITED" | wc -l | tr -d ' ' || echo 0 )"
echo
echo "DONE"
