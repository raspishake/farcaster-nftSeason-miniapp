#!/usr/bin/env bash
# scripts/fix-pg-and-diag.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "Fixing api/notify/diag.ts (noUnusedParameters)..."
mkdir -p api/notify
cat > api/notify/diag.ts <<'TS'
// api/notify/diag.ts
// One-shot diagnostic endpoint, Vercel serverless (not Next.js).

type Req = any;
type Res = any;

function redactDbUrl(dbUrl: string) {
  try {
    const u = new URL(dbUrl);
    return {
      host: u.host,
      db: (u.pathname || "").replace(/^\//, ""),
      hasUser: !!u.username,
      hasPassword: !!u.password,
      hasSslmode: u.searchParams.has("sslmode"),
      hasEndpointOpt: u.searchParams.has("options"),
    };
  } catch {
    return { host: "invalid", db: "", hasUser: false, hasPassword: false, hasSslmode: false, hasEndpointOpt: false };
  }
}

async function getPgClient() {
  const mod = await import("pg").catch(() => null);
  if (!mod) throw new Error(`Missing dependency "pg". Run: npm i pg`);
  const { Client } = mod as any;
  return Client;
}

export default async function handler(_req: Req, res: Res) {
  const dbUrl = process.env.DATABASE_URL || "";
  const meta = redactDbUrl(dbUrl);

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
    const r1 = await client.query("select now() as now, current_database() as db, inet_server_addr()::text as server_addr;");
    const r2 = await client.query(`
      select
        (select count(*) from information_schema.tables where table_name='miniapp_notification_webhook_events') as has_events_table,
        (select count(*) from information_schema.tables where table_name='miniapp_notification_subscribers') as has_subs_table;
    `);

    const r3 = await client
      .query(`
        select
          (select count(*) from miniapp_notification_webhook_events) as events_count,
          (select count(*) from miniapp_notification_subscribers) as subs_count
      `)
      .catch(() => ({ rows: [{ events_count: null, subs_count: null }] }));

    await client.end();

    res.statusCode = 200;
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        ok: true,
        env: { hasDatabaseUrl: !!dbUrl, dbMeta: meta },
        now: r1.rows[0],
        tables: r2.rows[0],
        counts: r3.rows[0],
      })
    );
  } catch (e: any) {
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: false, env: { hasDatabaseUrl: !!dbUrl, dbMeta: meta }, message: String(e?.message || e) }));
  }
}
TS

echo "Installing pg..."
npm i pg

echo "Done. Now deploy:"
echo "  ./deploy.sh --prod"
