#!/usr/bin/env bash
set -euo pipefail

TARGET="api/farcaster/webhook.ts"
APP_FID="372916"

[[ -f "${TARGET}" ]] || { echo "Missing ${TARGET}"; exit 1; }

ts="$(date -u +%Y%m%dT%H%M%SZ)"
cp -a "${TARGET}" "${TARGET}.bak.${ts}"

cat > "${TARGET}" <<'TS'
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';

type WebhookBody = {
  header?: string;
  payload?: string;
  signature?: string;
};

function b64urlToUtf8(input: string): string {
  // base64url -> base64
  const pad = '='.repeat((4 - (input.length % 4)) % 4);
  const b64 = (input + pad).replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(b64, 'base64').toString('utf8');
}

function safeJsonParse<T>(s: string): T | null {
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

const pool = new Pool({
  connectionString: requireEnv('DATABASE_URL'),
  // Neon + pg generally works with sslmode=require in DATABASE_URL.
  // If you later hit SSL errors, we can add: ssl: { rejectUnauthorized: false }
});

async function ensureTables(client: any) {
  await client.query(`
    create table if not exists miniapp_notification_webhook_events (
      id bigserial primary key,
      received_at timestamptz not null default now(),
      decoded_header jsonb,
      decoded_payload jsonb,
      body jsonb not null
    );
  `);

  await client.query(`
    create index if not exists idx_mnwe_received_at
      on miniapp_notification_webhook_events (received_at desc);
  `);

  await client.query(`
    create table if not exists miniapp_notification_subscribers (
      fid bigint not null,
      app_fid bigint not null,
      token text,
      notification_url text,
      enabled boolean not null default false,
      updated_at timestamptz not null default now(),
      primary key (fid, app_fid)
    );
  `);

  await client.query(`
    create index if not exists idx_subscribers_enabled
      on miniapp_notification_subscribers (enabled);
  `);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method_not_allowed' });
    return;
  }

  const appFid = 372916; // hardcoded per your request

  const body = (req.body ?? {}) as WebhookBody;
  const headerStr = typeof body.header === 'string' ? body.header : '';
  const payloadStr = typeof body.payload === 'string' ? body.payload : '';

  const decodedHeader = headerStr ? safeJsonParse<any>(b64urlToUtf8(headerStr)) : null;
  const decodedPayload = payloadStr ? safeJsonParse<any>(b64urlToUtf8(payloadStr)) : null;

  const event = decodedPayload?.event as string | undefined;

  // subscriber fid: best available signal is decodedHeader.fid (works for your current testing)
  const fid = typeof decodedHeader?.fid === 'number' ? decodedHeader.fid : null;

  const notificationUrl =
    decodedPayload?.notificationDetails?.url && typeof decodedPayload.notificationDetails.url === 'string'
      ? decodedPayload.notificationDetails.url
      : null;

  const token =
    decodedPayload?.notificationDetails?.token && typeof decodedPayload.notificationDetails.token === 'string'
      ? decodedPayload.notificationDetails.token
      : null;

  const client = await pool.connect();
  try {
    await ensureTables(client);

    // 1) Always store the raw event (debug gold)
    await client.query(
      `insert into miniapp_notification_webhook_events (decoded_header, decoded_payload, body)
       values ($1::jsonb, $2::jsonb, $3::jsonb)`,
      [decodedHeader ?? null, decodedPayload ?? null, body]
    );

    // 2) Only attempt subscriber upsert when we have a fid
    if (!fid) {
      res.status(200).json({ ok: true, note: 'no_fid_in_header', event: event ?? null });
      return;
    }

    if (event === 'notifications_enabled') {
      // IMPORTANT: must match PK(fid, app_fid)
      await client.query(
        `
        insert into miniapp_notification_subscribers (fid, app_fid, token, notification_url, enabled, updated_at)
        values ($1, $2, $3, $4, true, now())
        on conflict (fid, app_fid)
        do update set
          token = excluded.token,
          notification_url = excluded.notification_url,
          enabled = true,
          updated_at = now()
        `,
        [fid, appFid, token, notificationUrl]
      );

      res.status(200).json({ ok: true, event, fid, appFid, enabled: true });
      return;
    }

    if (event === 'notifications_disabled') {
      await client.query(
        `
        insert into miniapp_notification_subscribers (fid, app_fid, token, notification_url, enabled, updated_at)
        values ($1, $2, null, null, false, now())
        on conflict (fid, app_fid)
        do update set
          token = null,
          notification_url = null,
          enabled = false,
          updated_at = now()
        `,
        [fid, appFid]
      );

      res.status(200).json({ ok: true, event, fid, appFid, enabled: false });
      return;
    }

    // Unknown event types, still OK
    res.status(200).json({ ok: true, event: event ?? null, fid, appFid, note: 'no_subscriber_update' });
  } catch (e: any) {
    res.status(500).json({
      ok: false,
      error: 'webhook_failed',
      message: e?.message ?? String(e),
    });
  } finally {
    client.release();
  }
}
TS

echo "Patched ${TARGET}"
echo "Backup: ${TARGET}.bak.${ts}"
