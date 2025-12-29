// api/notify/broadcast.ts
// Sends notifications via the per-subscriber notification_url + token.
// Spec: POST to notificationDetails.url with JSON {notificationId,title,body,targetUrl,tokens:[...]}.
// Ref: https://miniapps.farcaster.xyz/docs/guides/notifications
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Pool } from "pg";

type Subscriber = {
  fid: number;
  notification_url: string;
  token: string;
};

function mustGetEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

let pool: Pool | null = null;
function getPool(): Pool {
  if (pool) return pool;
  pool = new Pool({
    connectionString: mustGetEnv("DATABASE_URL"),
    max: 1,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 8_000,
  });
  return pool;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "method_not_allowed" });

  try {
    const admin = mustGetEnv("ADMIN_TOKEN");
    const auth = req.headers.authorization ?? "";
    if (auth !== `Bearer ${admin}`) return res.status(401).json({ ok: false, error: "unauthorized" });

    const bodyIn = typeof req.body === "string" ? JSON.parse(req.body) : (req.body ?? {});
    const dryRun = Boolean(bodyIn?.dryRun);
    const title = String(bodyIn?.title ?? "").slice(0, 32);
    const body = String(bodyIn?.body ?? "").slice(0, 128);
    const targetUrl = String(bodyIn?.targetUrl ?? "");
    const notificationId =
      String(bodyIn?.notificationId ?? `nft-season-${new Date().toISOString().slice(0, 10)}-${Date.now()}`).slice(0, 128);

    if (!title || !body || !targetUrl) {
      return res.status(400).json({ ok: false, error: "missing_title_body_targetUrl" });
    }
    // Must be on the same domain as the miniapp
    if (!targetUrl.startsWith("https://nft-season.vercel.app")) {
      return res.status(400).json({ ok: false, error: "targetUrl_must_be_on_nft-season_domain" });
    }

    const p = getPool();
    const client = await p.connect();
    let subs: Subscriber[] = [];
    try {
      const r = await client.query(
        `select fid, notification_url, token
         from miniapp_notification_subscribers
         where enabled = true and notification_url is not null and token is not null`
      );
      subs = r.rows.map((x: any) => ({
        fid: Number(x.fid),
        notification_url: String(x.notification_url),
        token: String(x.token),
      }));
    } finally {
      client.release();
    }

    if (dryRun) {
      return res.status(200).json({ ok: true, dryRun: true, recipients: subs.length, notificationId });
    }

    // Group by URL (Warpcast uses https://api.farcaster.xyz/v1/frame-notifications)
    const byUrl = new Map<string, Subscriber[]>();
    for (const s of subs) {
      byUrl.set(s.notification_url, [...(byUrl.get(s.notification_url) ?? []), s]);
    }

    const results: any[] = [];
    const invalidTokens: string[] = [];

    for (const [url, group] of byUrl.entries()) {
      for (const batch of chunk(group, 100)) {
        const tokens = batch.map((b) => b.token);

        const resp = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ notificationId, title, body, targetUrl, tokens }),
        });

        const text = await resp.text();
        let parsed: any = null;
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = { raw: text };
        }

        // Expected: {successfulTokens, invalidTokens, rateLimitedTokens}
        if (parsed?.invalidTokens?.length) invalidTokens.push(...parsed.invalidTokens);

        results.push({
          url,
          status: resp.status,
          response: parsed,
          batchSize: tokens.length,
        });
      }
    }

    // Clean invalid tokens from DB
    if (invalidTokens.length) {
      const p2 = getPool();
      const c2 = await p2.connect();
      try {
        await c2.query(
          `update miniapp_notification_subscribers
           set enabled = false, notification_url = null, token = null, updated_at = now()
           where token = any($1::text[])`,
          [invalidTokens]
        );
      } finally {
        c2.release();
      }
    }

    return res.status(200).json({
      ok: true,
      dryRun: false,
      recipients: subs.length,
      notificationId,
      invalidTokensPruned: invalidTokens.length,
      results,
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: "internal", message: String(e?.message ?? e) });
  }
}
