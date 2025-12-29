// scripts/notifications-manager.ts
// NFT Season Notifications Manager (notifications-centric, editor-style auth)
//
// Run: npm run notifications
//
// Auth: same style as editor-server.ts
//   - requests must come from localhost
//   - token header: x-editor-token: <EDITOR_TOKEN>
//
// DB: reads NOTIFY_DATABASE_URL from env (set it in ~/.bashrc)

import express from "express"
import type { Request, Response, NextFunction } from "express"
import { Pool } from "pg"
import crypto from "node:crypto"

const HOST = "127.0.0.1"
const PORT = Number(process.env.NOTIFY_MANAGER_PORT ?? "8788")

const TOKEN = process.env.EDITOR_TOKEN ?? ""
const NO_TOKEN = (process.env.EDITOR_NO_TOKEN ?? "").trim().toLowerCase() === "1"

const DB_URL = (process.env.NOTIFY_DATABASE_URL ?? "").trim()

const APP_FID = Number(process.env.NOTIFY_APP_FID ?? "372916") // your app fid, default per your setup
const TEST_FID = 372916

// Reuse one id to make debugging easier for broadcast.
// You can also override per-send in the UI, but default stays stable.
const DEFAULT_NOTIFICATION_ID = process.env.NOTIFY_NOTIFICATION_ID?.trim() || "00000000-0000-4000-8000-000000000001"

type ApiOk<T> = { ok: true; result: T }
type ApiErr = { ok: false; error: string; details?: unknown }

function ok<T>(res: Response, result: T): void {
  res.json({ ok: true, result } satisfies ApiOk<T>)
}

function fail(res: Response, status: number, error: string, details?: unknown): void {
  res.status(status).json({ ok: false, error, details } satisfies ApiErr)
}

function requireLocalOnly(req: Request, res: Response, next: NextFunction): void {
  const ip = (req.socket.remoteAddress ?? "").replace(/^::ffff:/, "")
  if (ip !== "127.0.0.1" && ip !== "::1") {
    fail(res, 403, "Forbidden (local only)")
    return
  }
  next()
}

function requireOrigin(req: Request, res: Response, next: NextFunction): void {
  // Keep this permissive for localhost dev, but still block weird cross-site origins.
  const origin = (req.headers.origin ?? "").toString()
  if (!origin) {
    next()
    return
  }
  if (
    origin === `http://${HOST}:${PORT}` ||
    origin === `http://localhost:${PORT}` ||
    origin === `http://127.0.0.1:${PORT}`
  ) {
    next()
    return
  }
  fail(res, 403, "Forbidden (bad origin)", { origin })
}

function requireToken(req: Request, res: Response, next: NextFunction): void {
  if (NO_TOKEN) {
    next()
    return
  }
  if (!TOKEN) {
    fail(res, 500, "Missing EDITOR_TOKEN in environment")
    return
  }
  const h = (req.headers["x-editor-token"] ?? "").toString().trim()
  if (!h || h !== TOKEN) {
    fail(res, 401, "Unauthorized (missing/invalid Session header)")
    return
  }
  next()
}

function mustHaveDbUrl(): void {
  if (!DB_URL) {
    // Throw so startup fails loudly and cleanly.
    throw new Error(
      "NOTIFY_DATABASE_URL is missing. Add it to ~/.bashrc, for example:\n\n" +
        "export NOTIFY_DATABASE_URL='postgresql://USER:PASSWORD@HOST/db?sslmode=require'\n"
    )
  }
}

function maskToken(t: string | null | undefined): string {
  const s = (t ?? "").trim()
  if (!s) return ""
  if (s.length <= 10) return `${s.slice(0, 2)}…`
  return `${s.slice(0, 8)}…${s.slice(-4)}`
}

function asInt(v: unknown, def: number): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : def
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

type SubscriberRow = {
  fid: number
  app_fid: number
  enabled: boolean
  token_len: number
  notification_url: string | null
  updated_at: string
  token_masked: string
}

type WebhookEventRow = {
  id: string
  received_at: string
  event: string | null
  fid: number | null
  app_fid: number | null
  token_masked: string
  notification_url: string | null
}

type SendResult = {
  notificationId: string
  sentTo: number
  successfulTokens: string[]
  invalidTokens: string[]
  rateLimitedTokens: string[]
  httpStatus: number
  raw?: unknown
}

async function main(): Promise<void> {
  mustHaveDbUrl()

  const pool = new Pool({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false }
  })

  const app = express()
  app.disable("x-powered-by")
  app.use(express.json({ limit: "2mb" }))

  // Always local-only + origin guard
  app.use(requireLocalOnly)
  app.use(requireOrigin)

  // Public landing page (no token required), but API calls require token.
  app.get("/", (_req, res) => {
    res.setHeader("content-type", "text/html; charset=utf-8")
    res.end(renderHtml({ port: PORT }))
  })

  // Authenticated API routes
  app.use("/api", requireToken)

  app.get("/api/health", async (_req, res) => {
    try {
      const r = await pool.query("select now() as now")
      ok(res, { now: r.rows[0]?.now ?? null, appFid: APP_FID })
    } catch (e) {
      fail(res, 500, "DB error", String(e))
    }
  })

  app.get("/api/subscribers", async (req, res) => {
    const page = clamp(asInt(req.query.page, 1), 1, 10_000)
    const perPage = clamp(asInt(req.query.perPage, 50), 1, 200) // you asked 50/page
    const offset = (page - 1) * perPage
    const enabledOnly = (req.query.enabledOnly ?? "").toString().trim() === "1"

    try {
      const where = enabledOnly ? "where enabled = true" : ""
      const totalQ = await pool.query(`select count(*)::bigint as n from miniapp_notification_subscribers ${where}`)
      const total = Number(totalQ.rows[0]?.n ?? 0)

      const q = await pool.query(
        `
        select
          fid::bigint as fid,
          app_fid::bigint as app_fid,
          enabled,
          coalesce(length(token),0)::int as token_len,
          notification_url,
          updated_at
        from miniapp_notification_subscribers
        ${where}
        order by updated_at desc
        limit $1 offset $2
        `,
        [perPage, offset]
      )

      const rows: SubscriberRow[] = q.rows.map((r: any) => ({
        fid: Number(r.fid),
        app_fid: Number(r.app_fid),
        enabled: Boolean(r.enabled),
        token_len: Number(r.token_len ?? 0),
        notification_url: (r.notification_url ?? null) as string | null,
        updated_at: new Date(r.updated_at).toISOString(),
        token_masked: "" // filled below
      }))

      // token masking: fetch tokens for visible rows only
      if (rows.length) {
        const keys = rows.map((x) => `(${x.fid},${x.app_fid})`).join(",")
        const tokQ = await pool.query(
          `
          select fid::bigint as fid, app_fid::bigint as app_fid, token
          from miniapp_notification_subscribers
          where (fid, app_fid) in (${keys})
          `
        )
        const m = new Map<string, string>()
        for (const t of tokQ.rows as any[]) {
          m.set(`${Number(t.fid)}:${Number(t.app_fid)}`, maskToken(t.token))
        }
        for (const row of rows) {
          row.token_masked = m.get(`${row.fid}:${row.app_fid}`) ?? ""
        }
      }

      ok(res, { page, perPage, total, rows })
    } catch (e) {
      fail(res, 500, "DB error", String(e))
    }
  })

  app.get("/api/events", async (req, res) => {
    const page = clamp(asInt(req.query.page, 1), 1, 10_000)
    const perPage = clamp(asInt(req.query.perPage, 50), 1, 200)
    const offset = (page - 1) * perPage

    try {
      const totalQ = await pool.query("select count(*)::bigint as n from miniapp_notification_webhook_events")
      const total = Number(totalQ.rows[0]?.n ?? 0)

      const q = await pool.query(
        `
        select
          id::text as id,
          received_at,
          decoded_header,
          decoded_payload
        from miniapp_notification_webhook_events
        order by received_at desc
        limit $1 offset $2
        `,
        [perPage, offset]
      )

      const rows: WebhookEventRow[] = q.rows.map((r: any) => {
        const dh = r.decoded_header ?? {}
        const dp = r.decoded_payload ?? {}
        const nd = dp?.notificationDetails ?? {}
        return {
          id: String(r.id),
          received_at: new Date(r.received_at).toISOString(),
          event: (dp?.event ?? null) as string | null,
          fid: dh?.fid != null ? Number(dh.fid) : null,
          app_fid: dh?.fid != null ? Number(dh.fid) : null, // in your flow, app_fid == fid, keep simple
          token_masked: maskToken(nd?.token),
          notification_url: (nd?.url ?? null) as string | null
        }
      })

      ok(res, { page, perPage, total, rows })
    } catch (e) {
      fail(res, 500, "DB error", String(e))
    }
  })

  app.post("/api/send/test", async (req, res) => {
    const title = (req.body?.title ?? "NFT Season").toString()
    const body = (req.body?.body ?? "test").toString()
    const targetUrl = (req.body?.targetUrl ?? "https://nft-season.vercel.app").toString()
    const notificationId = (req.body?.notificationId ?? DEFAULT_NOTIFICATION_ID).toString().trim()

    try {
      const toks = await getEnabledTokens(pool, TEST_FID, APP_FID)
      if (!toks.length) {
        fail(res, 400, "No enabled token for test fid", { fid: TEST_FID, appFid: APP_FID })
        return
      }

      const url = toks[0].notification_url
      const token = toks[0].token
      const out = await sendFrameNotification(url, [token], { title, body, targetUrl, notificationId })

      // Rate-limited UX: just report it, do not retry.
      ok(res, out)
    } catch (e) {
      fail(res, 500, "Send failed", String(e))
    }
  })

  app.post("/api/send/broadcast", async (req, res) => {
    const title = (req.body?.title ?? "NFT Season").toString()
    const body = (req.body?.body ?? "gm").toString()
    const targetUrl = (req.body?.targetUrl ?? "https://nft-season.vercel.app").toString()
    const notificationId = (req.body?.notificationId ?? DEFAULT_NOTIFICATION_ID).toString().trim()

    try {
      const toks = await getAllEnabledTokens(pool, APP_FID)
      if (!toks.length) {
        fail(res, 400, "No enabled tokens in DB", { appFid: APP_FID })
        return
      }

      // Group by notification_url (in case that ever differs)
      const byUrl = new Map<string, string[]>()
      for (const t of toks) {
        if (!t.notification_url) continue
        const arr = byUrl.get(t.notification_url) ?? []
        arr.push(t.token)
        byUrl.set(t.notification_url, arr)
      }

      const results: SendResult[] = []
      for (const [url, tokens] of byUrl.entries()) {
        const out = await sendFrameNotification(url, tokens, { title, body, targetUrl, notificationId })
        results.push(out)
      }

      ok(res, { groups: results.length, results })
    } catch (e) {
      fail(res, 500, "Broadcast failed", String(e))
    }
  })

  app.listen(PORT, HOST, () => {
    // eslint-disable-next-line no-console
    console.log(`NFT Season Notifications Manager: http://localhost:${PORT}`)
    // eslint-disable-next-line no-console
    console.log("Auth: x-editor-token header required for /api/*")
    // eslint-disable-next-line no-console
    console.log(`DB: ${DB_URL ? "OK" : "MISSING NOTIFY_DATABASE_URL"}`)
  })
}

async function getEnabledTokens(pool: Pool, fid: number, appFid: number): Promise<{ token: string; notification_url: string }[]> {
  const q = await pool.query(
    `
    select token, notification_url
    from miniapp_notification_subscribers
    where fid = $1 and app_fid = $2 and enabled = true and token is not null and notification_url is not null
    order by updated_at desc
    limit 1
    `,
    [fid, appFid]
  )
  return (q.rows as any[]).map((r) => ({ token: String(r.token), notification_url: String(r.notification_url) }))
}

async function getAllEnabledTokens(pool: Pool, appFid: number): Promise<{ fid: number; token: string; notification_url: string | null }[]> {
  const q = await pool.query(
    `
    select fid::bigint as fid, token, notification_url
    from miniapp_notification_subscribers
    where app_fid = $1 and enabled = true and token is not null
    order by updated_at desc
    `,
    [appFid]
  )
  return (q.rows as any[]).map((r) => ({
    fid: Number(r.fid),
    token: String(r.token),
    notification_url: (r.notification_url ?? null) as string | null
  }))
}

async function sendFrameNotification(
  notificationUrl: string,
  tokens: string[],
  opts: { title: string; body: string; targetUrl: string; notificationId: string }
): Promise<SendResult> {
  const payload = {
    notificationId: opts.notificationId,
    tokens,
    title: opts.title,
    body: opts.body,
    targetUrl: opts.targetUrl
  }

  const resp = await fetch(notificationUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  })

  const httpStatus = resp.status
  let json: any = null
  try {
    json = await resp.json()
  } catch {
    json = null
  }

  const result = json?.result ?? {}
  const successfulTokens = Array.isArray(result.successfulTokens) ? (result.successfulTokens as string[]) : []
  const invalidTokens = Array.isArray(result.invalidTokens) ? (result.invalidTokens as string[]) : []
  const rateLimitedTokens = Array.isArray(result.rateLimitedTokens) ? (result.rateLimitedTokens as string[]) : []

  return {
    notificationId: opts.notificationId,
    sentTo: tokens.length,
    successfulTokens,
    invalidTokens,
    rateLimitedTokens,
    httpStatus,
    raw: json
  }
}

function renderHtml({ port }: { port: number }): string {
  const nonce = crypto.randomBytes(12).toString("base64url")
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>NFT Season Notifications Manager</title>
  <style>
    :root { color-scheme: dark; }
    body { margin: 0; background: #0b0f14; color: rgba(255,255,255,0.92); font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; }
    .wrap { max-width: 980px; margin: 0 auto; padding: 16px; }
    .card { border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.03); border-radius: 14px; padding: 14px; box-shadow: 0 16px 45px rgba(0,0,0,0.55); }
    .row { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
    input, textarea { width: 100%; box-sizing: border-box; background: rgba(0,0,0,0.35); color: rgba(255,255,255,0.92); border: 1px solid rgba(255,255,255,0.14); border-radius: 12px; padding: 10px 12px; outline: none; }
    textarea { min-height: 88px; resize: vertical; }
    button { background: rgba(0,0,0,0.35); color: rgba(255,255,255,0.92); border: 1px solid rgba(255,255,255,0.14); border-radius: 12px; padding: 10px 12px; cursor: pointer; font-weight: 800; }
    button.primary { border-color: rgba(138,180,255,0.45); }
    button.danger { border-color: rgba(255,120,120,0.45); }
    .muted { color: rgba(255,255,255,0.62); font-size: 12.5px; }
    .title { font-size: 18px; font-weight: 950; letter-spacing: 0.2px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { padding: 10px 8px; border-bottom: 1px solid rgba(255,255,255,0.10); text-align: left; vertical-align: top; }
    th { color: rgba(255,255,255,0.70); font-size: 12px; }
    .pill { display: inline-flex; padding: 2px 8px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.14); font-size: 12px; }
    .ok { border-color: rgba(80,200,120,0.45); }
    .no { border-color: rgba(255,120,120,0.45); }
    .toast { position: fixed; left: 16px; right: 16px; bottom: 16px; padding: 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.14); background: rgba(0,0,0,0.82); text-align: center; display: none; }
    .grid2 { display: grid; grid-template-columns: 1fr; gap: 12px; }
    @media (min-width: 900px) { .grid2 { grid-template-columns: 1fr 1fr; } }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="row" style="justify-content: space-between;">
        <div>
          <div class="title">NFT Season Notifications Manager</div>
          <div class="muted">http://localhost:${port} · auth header: <code>x-editor-token</code></div>
        </div>
      </div>

      <div style="margin-top: 12px;" class="grid2">
        <div class="card" style="box-shadow:none;">
          <div class="title" style="font-size: 14px;">Auth</div>
          <div class="muted" style="margin-top:6px;">Paste your <code>EDITOR_TOKEN</code>. Stored locally in your browser.</div>
          <div style="margin-top:10px;">
            <input id="token" placeholder="EDITOR_TOKEN" />
          </div>
          <div class="row" style="margin-top:10px;">
            <button class="primary" id="saveToken">Save token</button>
            <button id="health">Health check</button>
          </div>
          <div class="muted" id="healthOut" style="margin-top:10px;"></div>
        </div>

        <div class="card" style="box-shadow:none;">
          <div class="title" style="font-size: 14px;">Send</div>
          <div class="muted" style="margin-top:6px;">Reuses one <code>notificationId</code> by default for easy debugging.</div>
          <div style="margin-top:10px;">
            <input id="title" value="NFT Season" />
          </div>
          <div style="margin-top:10px;">
            <textarea id="body">server ping</textarea>
          </div>
          <div style="margin-top:10px;">
            <input id="targetUrl" value="https://nft-season.vercel.app" />
          </div>
          <div style="margin-top:10px;">
            <input id="notificationId" value="${DEFAULT_NOTIFICATION_ID}" />
          </div>
          <div class="row" style="margin-top:10px;">
            <button class="primary" id="sendTest">Send test to 372916</button>
            <button class="danger" id="sendBroadcast">Broadcast to enabled</button>
          </div>
          <div class="muted" id="sendOut" style="margin-top:10px;"></div>
        </div>
      </div>

      <div style="margin-top: 12px;" class="grid2">
        <div class="card" style="box-shadow:none;">
          <div class="row" style="justify-content: space-between; align-items: baseline;">
            <div class="title" style="font-size: 14px;">Subscribers</div>
            <div class="muted">
              <button id="loadSubs">Refresh</button>
            </div>
          </div>
          <div class="muted" id="subsMeta" style="margin-top:8px;"></div>
          <div style="overflow:auto; margin-top:10px;">
            <table>
              <thead>
                <tr>
                  <th>fid</th>
                  <th>enabled</th>
                  <th>token</th>
                  <th>url</th>
                  <th>updated</th>
                </tr>
              </thead>
              <tbody id="subsTbody"></tbody>
            </table>
          </div>
        </div>

        <div class="card" style="box-shadow:none;">
          <div class="row" style="justify-content: space-between; align-items: baseline;">
            <div class="title" style="font-size: 14px;">Webhook events</div>
            <div class="muted">
              <button id="loadEvents">Refresh</button>
            </div>
          </div>
          <div class="muted" id="eventsMeta" style="margin-top:8px;"></div>
          <div style="overflow:auto; margin-top:10px;">
            <table>
              <thead>
                <tr>
                  <th>time</th>
                  <th>event</th>
                  <th>fid</th>
                  <th>token</th>
                  <th>url</th>
                </tr>
              </thead>
              <tbody id="eventsTbody"></tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  </div>

  <div class="toast" id="toast"></div>

  <script nonce="${nonce}">
    const $ = (id) => document.getElementById(id);
    const toast = (msg) => {
      const el = $("toast");
      el.textContent = msg;
      el.style.display = "block";
      setTimeout(() => { el.style.display = "none"; }, 1800);
    };

    const loadToken = () => {
      const t = localStorage.getItem("nftSeasonEditorToken") || "";
      $("token").value = t;
      return t;
    };

    const saveToken = () => {
      const t = ($("token").value || "").trim();
      localStorage.setItem("nftSeasonEditorToken", t);
      toast("token saved");
      return t;
    };

    const api = async (path, opts={}) => {
      const t = (localStorage.getItem("nftSeasonEditorToken") || "").trim();
      const headers = Object.assign({}, opts.headers || {}, t ? { "x-editor-token": t } : {});
      const res = await fetch(path, Object.assign({}, opts, { headers }));
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = json?.error || ("HTTP " + res.status);
        throw new Error(msg);
      }
      return json?.result;
    };

    const renderSubs = (rows) => {
      const tb = $("subsTbody");
      tb.innerHTML = "";
      for (const r of rows) {
        const tr = document.createElement("tr");
        tr.innerHTML =
          "<td>" + r.fid + "</td>" +
          "<td><span class='pill " + (r.enabled ? "ok" : "no") + "'>" + (r.enabled ? "on" : "off") + "</span></td>" +
          "<td>" + (r.token_masked || "") + "</td>" +
          "<td style='max-width:260px; word-break:break-all;'>" + (r.notification_url || "") + "</td>" +
          "<td>" + r.updated_at.replace("T"," ").replace("Z","") + "</td>";
        tb.appendChild(tr);
      }
    };

    const renderEvents = (rows) => {
      const tb = $("eventsTbody");
      tb.innerHTML = "";
      for (const r of rows) {
        const tr = document.createElement("tr");
        tr.innerHTML =
          "<td>" + r.received_at.replace("T"," ").replace("Z","") + "</td>" +
          "<td>" + (r.event || "") + "</td>" +
          "<td>" + (r.fid ?? "") + "</td>" +
          "<td>" + (r.token_masked || "") + "</td>" +
          "<td style='max-width:260px; word-break:break-all;'>" + (r.notification_url || "") + "</td>";
        tb.appendChild(tr);
      }
    };

    const refreshSubs = async () => {
      try {
        const r = await api("/api/subscribers?perPage=50&page=1");
        $("subsMeta").textContent = "Showing " + r.rows.length + " of " + r.total;
        renderSubs(r.rows);
      } catch (e) {
        $("subsMeta").textContent = "Error: " + (e.message || e);
      }
    };

    const refreshEvents = async () => {
      try {
        const r = await api("/api/events?perPage=50&page=1");
        $("eventsMeta").textContent = "Showing " + r.rows.length + " of " + r.total;
        renderEvents(r.rows);
      } catch (e) {
        $("eventsMeta").textContent = "Error: " + (e.message || e);
      }
    };

    $("saveToken").onclick = () => saveToken();

    $("health").onclick = async () => {
      try {
        const r = await api("/api/health");
        $("healthOut").textContent = "OK · " + (r.now || "");
        toast("health ok");
      } catch (e) {
        $("healthOut").textContent = "Error: " + (e.message || e);
      }
    };

    const gatherSend = () => ({
      title: ($("title").value || "NFT Season"),
      body: ($("body").value || "ping"),
      targetUrl: ($("targetUrl").value || "https://nft-season.vercel.app"),
      notificationId: ($("notificationId").value || "${DEFAULT_NOTIFICATION_ID}"),
    });

    $("sendTest").onclick = async () => {
      $("sendOut").textContent = "";
      try {
        const payload = gatherSend();
        const r = await api("/api/send/test", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (r.rateLimitedTokens && r.rateLimitedTokens.length) {
          $("sendOut").textContent = "rate limited, try again";
          toast("rate limited, try again");
          return;
        }

        $("sendOut").textContent = "HTTP " + r.httpStatus + " · ok=" + r.successfulTokens.length + " invalid=" + r.invalidTokens.length;
        toast("sent");
      } catch (e) {
        $("sendOut").textContent = "Error: " + (e.message || e);
      }
    };

    $("sendBroadcast").onclick = async () => {
      $("sendOut").textContent = "";
      try {
        const payload = gatherSend();
        const r = await api("/api/send/broadcast", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });

        // If any group has rate limited, show the blunt message.
        const anyRateLimited = (r.results || []).some(x => x.rateLimitedTokens && x.rateLimitedTokens.length);
        if (anyRateLimited) {
          $("sendOut").textContent = "rate limited, try again";
          toast("rate limited, try again");
        } else {
          $("sendOut").textContent = "Broadcast done · groups=" + r.groups;
          toast("broadcast sent");
        }
        await refreshSubs();
      } catch (e) {
        $("sendOut").textContent = "Error: " + (e.message || e);
      }
    };

    $("loadSubs").onclick = () => refreshSubs();
    $("loadEvents").onclick = () => refreshEvents();

    // init
    loadToken();
    refreshSubs();
    refreshEvents();
  </script>
</body>
</html>`
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err?.message || err)
  process.exit(1)
})
