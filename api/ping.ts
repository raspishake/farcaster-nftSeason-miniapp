import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).setHeader("content-type", "application/json");
  res.end(JSON.stringify({ ok: true, method: req.method }));
}
