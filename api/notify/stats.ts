import type { VercelRequest, VercelResponse } from "@vercel/node";
import { json, requireAdmin, sql, toApiError } from "../_db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") return json(res, 405, { ok: false, error: "Method not allowed" });

    const auth = requireAdmin(req);
    if (!auth.ok) return json(res, auth.status, { ok: false, error: auth.error });

    const totalQ = await sql`
      select count(*)::int as count
      from miniapp_notification_subscribers
    `;
    const enabledQ = await sql`
      select count(*)::int as count
      from miniapp_notification_subscribers
      where enabled = true
    `;

    const total = totalQ.rows?.[0]?.count ?? 0;
    const enabled = enabledQ.rows?.[0]?.count ?? 0;

    return json(res, 200, { ok: true, total, enabled });
  } catch (e) {
    return json(res, 500, toApiError(e));
  }
}
