// GET /api/categories — distinct categories that actually have wallpapers,
// prefixed with "All". The frontend also has a static fallback list.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sql, ensureSchema } from "./_lib/db.js";
import { sendJson, sendError, applyCors, handleOptions } from "./_lib/http.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(res);
  if (handleOptions(req, res)) return;

  if (req.method !== "GET") {
    return sendError(res, 405, "Method not allowed");
  }

  try {
    await ensureSchema();
    const rows = (await sql`
      SELECT DISTINCT category FROM wallpapers ORDER BY category ASC
    `) as { category: string }[];

    const categories = ["All", ...rows.map((r) => r.category)];
    return sendJson(res, 200, { categories });
  } catch (err) {
    console.error("GET /api/categories failed:", err);
    return sendError(res, 500, "Failed to load categories");
  }
}
