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

      // Split the search into individual words so they can match in any order
      // across name, category, and tags. Each word must appear SOMEWHERE in the
      // combined text (fuzzy-ish, order-independent). Empty search -> no filter.
      const words = (search ?? "")
        .toLowerCase()
        .split(/\s+/)
        .map((w) => w.trim())
        .filter(Boolean);

      // Every word must be found in the haystack: lower(name + category + tags).
      // We pass the words as a text[] and require bool_and over them, so N words
      // work without building a dynamic SQL string.
      let rows: WallpaperRow[];
      if (category && words.length) {
        rows = (await sql`
          SELECT * FROM wallpapers
          WHERE category = ${category}
            AND (
              SELECT bool_and(
                lower(name || ' ' || category || ' ' || array_to_string(tags, ' ')) LIKE '%' || word || '%'
              )
              FROM unnest(${words}::text[]) AS word
            )
          ORDER BY created_at DESC
        `) as WallpaperRow[];
      } else if (category) {
        rows = (await sql`
          SELECT * FROM wallpapers WHERE category = ${category} ORDER BY created_at DESC
        `) as WallpaperRow[];
      } else if (words.length) {
        rows = (await sql`
          SELECT * FROM wallpapers
          WHERE (
            SELECT bool_and(
              lower(name || ' ' || category || ' ' || array_to_string(tags, ' ')) LIKE '%' || word || '%'
            )
            FROM unnest(${words}::text[]) AS word
          )
          ORDER BY created_at DESC
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
