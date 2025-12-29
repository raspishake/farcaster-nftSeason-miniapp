import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "@vercel/postgres";

export { sql };

export type ApiError = {
  ok: false;
  error: string;
  code?: string;
  details?: unknown;
};

export function toApiError(err: unknown, fallback = "Server error"): ApiError {
  if (err instanceof Error) {
    return { ok: false, error: err.message || fallback, code: (err as any).code };
  }
  if (typeof err === "string") return { ok: false, error: err };
  return { ok: false, error: fallback, details: err };
}

export function json(res: VercelResponse, status: number, body: unknown): void {
  res.status(status);
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function getBearer(req: VercelRequest): string | null {
  const h = req.headers["authorization"];
  const raw = Array.isArray(h) ? h[0] : h;
  if (!raw) return null;
  const m = raw.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || null;
}

export function requireAdmin(
  req: VercelRequest,
): { ok: true } | { ok: false; status: number; error: string } {
  const expected = process.env.ADMIN_TOKEN || "";
  if (!expected) return { ok: false, status: 500, error: "Server misconfigured: ADMIN_TOKEN is not set" };

  const got = getBearer(req);
  if (!got) return { ok: false, status: 401, error: "Missing Authorization: Bearer <token>" };

  // Plain compare. Timing-safe compare is nice-to-have, not worth breaking builds.
  if (got !== expected) return { ok: false, status: 403, error: "Invalid token" };

  return { ok: true };
}
