// api/farcaster/webhook.ts
// Vercel Serverless Function (non-Next typed). Keep it boring and reliable.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Pool } from "pg";

type WebhookBody = {
  header: string;
  payload: string;
  signature?: string;
};

function b64urlToBuffer(input: string): Buffer {
  // base64url -> base64
  const pad = "=".repeat((4 - (input.length % 4)) % 4);
  const b64 = (input + pad).replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(b64, "base64");
}

function safeJsonParse<T>(s: string): T | null {
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

function getDbUrl(): string {
  const u = process.env.DATABASE_URL;
  if (!u) throw new Error("Missing DATABASE_URL");
  return u;
}

let pool: Pool | null = null;
function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: getDbUrl(),
      max: 2,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}

async function ensureTables(p: Pool): Promise<void> {
  await p.query(`
    create table if not exists miniapp_notification_webhook_events (
      id bigserial primary key,
      received_at timestamptz not null default now(),
      body jsonb not null,
      decoded_header jsonb,
      decoded_payload jsonb
    );
  `);

  await p.query(`
    create index if not exists idx_mnwe_received_at
      on miniapp_notification_webhook_events (received_at desc);
  `);

  await p.query(`
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

  await p.query(`
    create index if not exists idx_subscribers_enabled
      on miniapp_notification_subscribers (enabled);
  `);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const receivedAt = new Date();

  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "method_not_allowed" });
    return;
  }

  const body = (req.body ?? {}) as Partial<WebhookBody>;
  const headerB64 = typeof body.header === "string" ? body.header : "";
  const payloadB64 = typeof body.payload === "string" ? body.payload : "";

  if (!headerB64 || !payloadB64) {
    // Returning 400 is fine, your doctor script treats 400 as reachable.
    res.status(400).json({ ok: false, error: "bad_request", message: "missing header/payload" });
    return;
  }

  const decodedHeader = safeJsonParse<any>(b64urlToBuffer(headerB64).toString("utf8"));
  const decodedPayload = safeJsonParse<any>(b64urlToBuffer(payloadB64).toString("utf8"));

  const p = getPool();
  try {
    await ensureTables(p);

    // Always store raw event for forensic debugging
    await p.query(
      `
      insert into miniapp_notification_webhook_events (received_at, body, decoded_header, decoded_payload)
      values ($1, $2::jsonb, $3::jsonb, $4::jsonb)
      `,
      [
        receivedAt.toISOString(),
        JSON.stringify({ header: headerB64, payload: payloadB64, signature: body.signature ?? null }),
        JSON.stringify(decodedHeader ?? null),
        JSON.stringify(decodedPayload ?? null),
      ]
    );

    const event = decodedPayload?.event;
    const fid = decodedHeader?.fid;
    const appFid = decodedHeader?.fid; // for miniapps, app_fid is the app fid. If you later support multi-app, replace this.
    const notifUrl = decodedPayload?.notificationDetails?.url;
    const token = decodedPayload?.notificationDetails?.token;

    if (typeof fid !== "number" || typeof appFid !== "number") {
      res.status(200).json({ ok: true, event, note: "no_fid" });
      return;
    }

    // Apply subscriber state ONLY if this event is >= current updated_at.
    // This prevents stale disable from nuking a fresh enable.
    if (event === "notifications_enabled") {
      if (typeof notifUrl !== "string" || typeof token !== "string") {
        res.status(200).json({ ok: true, event, fid, appFid, enabled: false, note: "missing_token_or_url" });
        return;
      }

      const r = await p.query(
        `
        insert into miniapp_notification_subscribers (fid, app_fid, token, notification_url, enabled, updated_at)
        values ($1, $2, $3, $4, true, $5)
        on conflict (fid, app_fid) do update
          set token = excluded.token,
              notification_url = excluded.notification_url,
              enabled = true,
              updated_at = excluded.updated_at
        where miniapp_notification_subscribers.updated_at <= excluded.updated_at
        returning fid, app_fid, enabled
        `,
        [fid, appFid, token, notifUrl, receivedAt.toISOString()]
      );

      res.status(200).json({ ok: true, event, fid, appFid, enabled: r.rows?.[0]?.enabled ?? true });
      return;
    }

    if (event === "notifications_disabled") {
      const r = await p.query(
        `
        insert into miniapp_notification_subscribers (fid, app_fid, token, notification_url, enabled, updated_at)
        values ($1, $2, null, null, false, $3)
        on conflict (fid, app_fid) do update
          set token = null,
              notification_url = null,
              enabled = false,
              updated_at = excluded.updated_at
        where miniapp_notification_subscribers.updated_at <= excluded.updated_at
        returning fid, app_fid, enabled
        `,
        [fid, appFid, receivedAt.toISOString()]
      );

      res.status(200).json({ ok: true, event, fid, appFid, enabled: r.rows?.[0]?.enabled ?? false });
      return;
    }

    res.status(200).json({ ok: true, event, fid, appFid, note: "ignored_event" });
  } catch (e: any) {
    res.status(500).json({
      ok: false,
      error: "webhook_failed",
      message: e?.message ?? String(e),
    });
  }
}
