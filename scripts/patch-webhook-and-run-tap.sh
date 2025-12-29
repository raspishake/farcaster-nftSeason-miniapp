#!/usr/bin/env bash
# scripts/patch-webhook-and-run-tap.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DB_PASS=""
WAIT_SECS="75"

usage() {
  cat <<'EOF'
Usage:
  ./scripts/patch-webhook-and-run-tap.sh --db-pass '<neon_password>' [--wait 45]

What it does:
  1) Writes api/farcaster/webhook.ts (robust base64url decode + DB write + subscriber upsert)
  2) Deploys to prod
  3) Runs farcaster-notify-doctor.sh event-tap (captures OFF/ON payloads into DB and prints them)
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --db-pass) DB_PASS="${2:-}"; shift 2 ;;
    --wait) WAIT_SECS="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown arg: $1"; usage; exit 1 ;;
  esac
done

if [[ -z "$DB_PASS" ]]; then
  echo "Missing --db-pass"
  usage
  exit 1
fi

echo "Patching api/farcaster/webhook.ts..."
mkdir -p api/farcaster

cat > api/farcaster/webhook.ts <<'TS'
// api/farcaster/webhook.ts
// Vercel serverless function (NOT Next.js). Captures Farcaster miniapp webhook events into Neon.
// Never 500 to Warpcast; always store raw + decoded, and upsert subscriber on enable.

type Req = any;
type Res = any;

function b64urlToUtf8(s: string): string {
  const normalized = (s || "").replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + "=".repeat(padLen);
  return Buffer.from(padded, "base64").toString("utf8");
}

function safeJsonParse<T = any>(s: string): T | null {
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

async function getPgClient() {
  const mod = await import("pg").catch(() => null);
  if (!mod) throw new Error(`Missing dependency "pg". Run: npm i pg`);
  const { Client } = mod as any;
  return Client;
}

async function ensureTables(client: any) {
  await client.query(`
    create table if not exists miniapp_notification_webhook_events (
      id bigserial primary key,
      received_at timestamptz not null default now(),
      decoded_header jsonb,
      decoded_payload jsonb,
      body jsonb
    );
  `);

  await client.query(`
    create table if not exists miniapp_notification_subscribers (
      fid bigint not null,
      app_fid bigint not null,
      enabled boolean not null default true,
      token text,
      notification_url text,
      updated_at timestamptz not null default now(),
      primary key (fid, app_fid)
    );
  `);
}

function extractSignedParts(body: any): { header?: string; payload?: string; signature?: string } {
  if (!body || typeof body !== "object") return {};
  const header = typeof body.header === "string" ? body.header : undefined;
  const payload = typeof body.payload === "string" ? body.payload : undefined;
  const signature = typeof body.signature === "string" ? body.signature : undefined;
  return { header, payload, signature };
}

export default async function handler(req: Req, res: Res) {
  res.setHeader("content-type", "application/json");

  const dbUrl = process.env.DATABASE_URL || "";
  if (!dbUrl) {
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, skipped: true, reason: "DATABASE_URL missing" }));
    return;
  }

  let body: any = (req && (req.body ?? req)) || {};
  if (typeof body === "string") {
    const parsed = safeJsonParse(body);
    body = parsed ?? { raw: body };
  }

  const { header, payload, signature } = extractSignedParts(body);

  const decodedHeaderStr = header ? b64urlToUtf8(header) : "";
  const decodedPayloadStr = payload ? b64urlToUtf8(payload) : "";
  const decodedHeader = decodedHeaderStr ? safeJsonParse(decodedHeaderStr) : null;
  const decodedPayload = decodedPayloadStr ? safeJsonParse(decodedPayloadStr) : null;

  const eventObj = {
    decoded_header: decodedHeader ?? (decodedHeaderStr ? { _raw: decodedHeaderStr } : null),
    decoded_payload: decodedPayload ?? (decodedPayloadStr ? { _raw: decodedPayloadStr } : null),
    body: {
      ...body,
      header: header ?? null,
      payload: payload ?? null,
      signature: signature ?? null,
    },
  };

  try {
    const Client = await getPgClient();
    const client = new Client({
      connectionString: dbUrl,
      statement_timeout: 6000,
      query_timeout: 6000,
      connectionTimeoutMillis: 6000,
      ssl: { rejectUnauthorized: false },
    });

    await client.connect();
    await ensureTables(client);

    await client.query(
      `insert into miniapp_notification_webhook_events (decoded_header, decoded_payload, body)
       values ($1::jsonb, $2::jsonb, $3::jsonb)`,
      [eventObj.decoded_header, eventObj.decoded_payload, eventObj.body]
    );

    // Upsert subscriber on notifications_enabled payload.
    const dh: any = decodedHeader || {};
    const dp: any = decodedPayload || {};

    const fid: number | undefined = typeof dh.fid === "number" ? dh.fid : undefined;
    // IMPORTANT: Your miniapp fid (app_fid) is the miniapp itself. Warpcast is NOT sending it here.
    // Use the one you already know: 372916 (your app fid in earlier logs).
    const appFid = 372916;

    const event = typeof dp.event === "string" ? dp.event : "";
    const details = dp.notificationDetails && typeof dp.notificationDetails === "object" ? dp.notificationDetails : null;

    if (fid && event === "notifications_enabled" && details && typeof details.url === "string" && typeof details.token === "string") {
      await client.query(
        `insert into miniapp_notification_subscribers (fid, app_fid, enabled, token, notification_url, updated_at)
         values ($1,$2,true,$3,$4,now())
         on conflict (fid, app_fid) do update set
           enabled=true,
           token=excluded.token,
           notification_url=excluded.notification_url,
           updated_at=now()`,
        [fid, appFid, details.token, details.url]
      );
    }

    if (fid && event === "notifications_disabled") {
      await client.query(
        `insert into miniapp_notification_subscribers (fid, app_fid, enabled, updated_at)
         values ($1,$2,false,now())
         on conflict (fid, app_fid) do update set enabled=false, updated_at=now()`,
        [fid, appFid]
      );
    }

    await client.end();

    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true }));
  } catch (e: any) {
    // Never 500 to Warpcast.
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, db_write_failed: true, message: String(e?.message || e) }));
  }
}
TS

echo "Deploying to production..."
npx vercel --prod

echo "Running event tap (wait=${WAIT_SECS}s)..."
./scripts/farcaster-notify-doctor.sh --db-pass "$DB_PASS" --wait "$WAIT_SECS"
