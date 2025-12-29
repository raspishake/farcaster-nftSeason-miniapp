// api/farcaster/webhook.ts
import type { VercelRequest, VercelResponse } from "@vercel/node"
import { Pool } from "pg"
import crypto from "crypto"

type WebhookBody = {
  header?: string
  payload?: string
  signature?: string
}

type DecodedHeader = {
  fid: number
  type: string
  key: string
}

type DecodedPayload =
  | { event: "notifications_enabled"; notificationDetails?: { url?: string; token?: string } }
  | { event: "notifications_disabled" }
  | { event?: string; [k: string]: unknown }

const APP_FID = Number.parseInt(process.env.FARCASTER_APP_FID || process.env.APP_FID || "372916", 10)

function base64urlDecodeToString(b64url: string): string {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/")
  const pad = "=".repeat((4 - (b64.length % 4)) % 4)
  return Buffer.from(b64 + pad, "base64").toString("utf8")
}

function safeJsonParse<T>(s: string): T | null {
  try {
    return JSON.parse(s) as T
  } catch {
    return null
  }
}

function getPool(): Pool {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL
  if (!url) throw new Error("Missing DATABASE_URL/POSTGRES_URL/NEON_DATABASE_URL")
  return new Pool({ connectionString: url, max: 1 })
}

async function ensureTables(pool: Pool): Promise<void> {
  await pool.query(`
    create table if not exists miniapp_notification_webhook_events (
      id bigserial primary key,
      received_at timestamptz not null default now(),
      body jsonb not null,
      decoded_header jsonb,
      decoded_payload jsonb
    );
  `)
  await pool.query(`create index if not exists idx_mnwe_received_at on miniapp_notification_webhook_events (received_at desc);`)

  await pool.query(`
    create table if not exists miniapp_notification_subscribers (
      fid bigint not null,
      app_fid bigint not null,
      token text,
      notification_url text,
      enabled boolean not null default false,
      updated_at timestamptz not null default now(),
      primary key (fid, app_fid)
    );
  `)
  await pool.query(`create index if not exists idx_subscribers_enabled on miniapp_notification_subscribers (enabled);`)

  // welcome tracking (once per fresh token)
  await pool.query(`alter table miniapp_notification_subscribers add column if not exists welcome_token_sent text;`)
  await pool.query(`alter table miniapp_notification_subscribers add column if not exists welcome_sent_at timestamptz;`)
}

async function sendNotification(
  url: string,
  token: string,
  title: string,
  body: string,
  targetUrl: string,
  notificationId: string
): Promise<{ ok: boolean; status: number; json: any }> {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      notificationId,
      title,
      body,
      targetUrl,
      tokens: [token]
    })
  })
  const text = await resp.text()
  let parsed: any = null
  try {
    parsed = JSON.parse(text)
  } catch {
    parsed = { raw: text }
  }
  return { ok: resp.ok, status: resp.status, json: parsed }
}

function deterministicWelcomeId(fid: number, token: string): string {
  // stable-ish id per token, avoids dup welcome if Warpcast retries the same enable event
  const hex = crypto.createHash("sha256").update(`welcome:${fid}:${token}`).digest("hex")
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "method_not_allowed" })

  const body = (req.body ?? {}) as WebhookBody
  const headerB64 = body.header
  const payloadB64 = body.payload

  if (!headerB64 || !payloadB64) {
    return res.status(400).json({ ok: false, error: "missing_header_or_payload" })
  }

  const decodedHeaderStr = base64urlDecodeToString(headerB64)
  const decodedPayloadStr = base64urlDecodeToString(payloadB64)

  const decodedHeader = safeJsonParse<DecodedHeader>(decodedHeaderStr)
  const decodedPayload = safeJsonParse<DecodedPayload>(decodedPayloadStr)

  const pool = getPool()
  try {
    await ensureTables(pool)

    await pool.query(
      `insert into miniapp_notification_webhook_events (body, decoded_header, decoded_payload)
       values ($1::jsonb, $2::jsonb, $3::jsonb)`,
      [JSON.stringify(body), JSON.stringify(decodedHeader), JSON.stringify(decodedPayload)]
    )

    const fid = decodedHeader?.fid
    const event = decodedPayload?.event
    if (!fid || !event) return res.status(200).json({ ok: true, event: "unknown" })

    if (event === "notifications_disabled") {
      await pool.query(
        `insert into miniapp_notification_subscribers (fid, app_fid, enabled, updated_at)
         values ($1, $2, false, now())
         on conflict (fid, app_fid)
         do update set enabled=false, updated_at=now()`,
        [fid, APP_FID]
      )
      return res.status(200).json({ ok: true, event, fid, appFid: APP_FID })
    }

    if (event === "notifications_enabled") {
      const details: any = (decodedPayload as any).notificationDetails ?? {}
      const url = details.url as string | undefined
      const token = details.token as string | undefined

      await pool.query(
        `insert into miniapp_notification_subscribers
          (fid, app_fid, token, notification_url, enabled, updated_at)
         values ($1, $2, $3, $4, true, now())
         on conflict (fid, app_fid)
         do update set token=excluded.token,
                       notification_url=excluded.notification_url,
                       enabled=true,
                       updated_at=now()`,
        [fid, APP_FID, token ?? null, url ?? null]
      )

      // Welcome notification: only once per fresh token
      if (url && token) {
        const row = await pool.query(
          `select welcome_token_sent from miniapp_notification_subscribers where fid=$1 and app_fid=$2`,
          [fid, APP_FID]
        )
        const alreadyForToken = row.rows?.[0]?.welcome_token_sent === token

        if (!alreadyForToken) {
          const notificationId = deterministicWelcomeId(fid, token)
          const send = await sendNotification(
            url,
            token,
            "NFT Season",
            "You're in! Stay tuned for NFT alerts. Warp warp.",
            "https://nft-season.vercel.app",
            notificationId
          )

          const rateLimited =
            send.ok &&
            Array.isArray(send.json?.result?.rateLimitedTokens) &&
            send.json.result.rateLimitedTokens.includes(token)

          if (send.ok && !rateLimited) {
            await pool.query(
              `update miniapp_notification_subscribers
               set welcome_token_sent=$3, welcome_sent_at=now()
               where fid=$1 and app_fid=$2`,
              [fid, APP_FID, token]
            )
          }
        }
      }

      return res.status(200).json({ ok: true, event, fid, appFid: APP_FID, enabled: true })
    }

    return res.status(200).json({ ok: true, event, fid, appFid: APP_FID })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: "webhook_failed", message: e?.message ?? String(e) })
  } finally {
    try {
      await pool.end()
    } catch {}
  }
}
