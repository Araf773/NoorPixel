// POST /api/wallpapers/:id/download — atomically increment the download count.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sql, ensureSchema } from "../../_lib/db.js";
import { sendJson, sendError, applyCors, handleOptions } from "../../_lib/http.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(res);
  if (handleOptions(req, res)) return;

  if (req.method !== "POST") {
    return sendError(res, 405, "Method not allowed");
  }

  const id = String(req.query.id ?? "");
  if (!id) return sendError(res, 400, "Missing id");

  try {
    await ensureSchema();
    const rows = (await sql`
      UPDATE wallpapers SET downloads = downloads + 1
      WHERE id = ${id}
      RETURNING downloads
    `) as { downloads: number }[];

    if (rows.length === 0) return sendError(res, 404, "Wallpaper not found");
    return sendJson(res, 200, { ok: true, downloads: rows[0].downloads });
  } catch (err) {
    console.error("POST /api/wallpapers/:id/download failed:", err);
    return sendError(res, 500, "Failed to record download");
  }
}
