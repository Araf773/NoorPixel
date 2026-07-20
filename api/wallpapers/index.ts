// GET  /api/wallpapers          -> { wallpapers: Wallpaper[] }  (public, filterable)
// POST /api/wallpapers          -> Wallpaper                     (admin: save metadata)

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sql, ensureSchema, toWallpaper, type WallpaperRow } from "../_lib/db.js";
import {
  sendJson,
  sendError,
  requireAdmin,
  readBody,
  applyCors,
  handleOptions,
} from "../_lib/http.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(res);
  if (handleOptions(req, res)) return;

  try {
    await ensureSchema();

    if (req.method === "GET") {
      const category = typeof req.query.category === "string" ? req.query.category : undefined;
      const search = typeof req.query.search === "string" ? req.query.search : undefined;

      // Build the query conditionally. neon's tagged template composes safely.
      let rows: WallpaperRow[];
      if (category && search) {
        rows = (await sql`
          SELECT * FROM wallpapers
          WHERE category = ${category} AND name ILIKE ${"%" + search + "%"}
          ORDER BY created_at DESC
        `) as WallpaperRow[];
      } else if (category) {
        rows = (await sql`
          SELECT * FROM wallpapers WHERE category = ${category} ORDER BY created_at DESC
        `) as WallpaperRow[];
      } else if (search) {
        rows = (await sql`
          SELECT * FROM wallpapers WHERE name ILIKE ${"%" + search + "%"} ORDER BY created_at DESC
        `) as WallpaperRow[];
      } else {
        rows = (await sql`SELECT * FROM wallpapers ORDER BY created_at DESC`) as WallpaperRow[];
      }

      return sendJson(res, 200, { wallpapers: rows.map(toWallpaper) });
    }

    if (req.method === "POST") {
      if (!requireAdmin(req, res)) return;
      const b = readBody(req);
      const { name, category, resolution, thumbnailUrl, viewUrl, cloudinaryPublicId, tags } = b as Record<string, any>;

      if (!name || !category || !thumbnailUrl || !viewUrl) {
        return sendError(res, 400, "name, category, thumbnailUrl, viewUrl are required");
      }

      const tagArray: string[] = Array.isArray(tags)
        ? tags
        : typeof tags === "string" && tags.trim()
          ? tags.split(",").map((t: string) => t.trim()).filter(Boolean)
          : [];

      const rows = (await sql`
        INSERT INTO wallpapers (name, category, resolution, thumbnail_url, view_url, cloudinary_public_id, tags)
        VALUES (${name}, ${category}, ${resolution ?? ""}, ${thumbnailUrl}, ${viewUrl}, ${cloudinaryPublicId ?? null}, ${tagArray})
        RETURNING *
      `) as WallpaperRow[];

      return sendJson(res, 201, toWallpaper(rows[0]));
    }

    res.setHeader("Allow", "GET, POST");
    return sendError(res, 405, "Method not allowed");
  } catch (err) {
    console.error("[/api/wallpapers]", err);
    return sendError(res, 500, "Internal server error");
  }
}
