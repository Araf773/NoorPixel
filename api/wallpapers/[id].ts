// GET /api/wallpapers/:id — fetch a single wallpaper by id.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sql, ensureSchema, toWallpaper, type WallpaperRow } from "../_lib/db.js";
import { sendJson, sendError, applyCors, handleOptions } from "../_lib/http.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(res);
  if (handleOptions(req, res)) return;

  if (req.method !== "GET") {
    return sendError(res, 405, "Method not allowed");
  }

  const id = String(req.query.id ?? "");
  if (!id) return sendError(res, 400, "Missing id");

  try {
    await ensureSchema();
    const rows = (await sql`
      SELECT * FROM wallpapers WHERE id = ${id} LIMIT 1
    `) as WallpaperRow[];

    if (rows.length === 0) return sendError(res, 404, "Wallpaper not found");
    return sendJson(res, 200, toWallpaper(rows[0]));
  } catch (err) {
    console.error("GET /api/wallpapers/:id failed:", err);
    return sendError(res, 500, "Failed to load wallpaper");
  }
}
