// GET    /api/wallpapers/:id — fetch a single wallpaper by id.
// DELETE /api/wallpapers/:id — admin-only; removes the DB row and its Cloudinary asset.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHash } from "node:crypto";
import { sql, ensureSchema, toWallpaper, type WallpaperRow } from "../_lib/db.js";
import { sendJson, sendError, applyCors, handleOptions, requireAdmin } from "../_lib/http.js";

// Best-effort removal of the image from Cloudinary via a signed destroy call.
// Never throws — a failed destroy shouldn't block deleting the DB row.
async function destroyCloudinaryAsset(publicId: string): Promise<void> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return;

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHash("sha1")
    .update(`public_id=${publicId}&timestamp=${timestamp}${apiSecret}`)
    .digest("hex");

  const form = new URLSearchParams({
    public_id: publicId,
    timestamp: String(timestamp),
    api_key: apiKey,
    signature,
  });

  try {
    await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
      method: "POST",
      body: form,
    });
  } catch (err) {
    console.error("Cloudinary destroy failed (row still deleted):", err);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(res);
  if (handleOptions(req, res)) return;

  const id = String(req.query.id ?? "");
  if (!id) return sendError(res, 400, "Missing id");

  if (req.method === "GET") {
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

  if (req.method === "DELETE") {
    if (!requireAdmin(req, res)) return;
    try {
      await ensureSchema();
      const rows = (await sql`
        DELETE FROM wallpapers WHERE id = ${id}
        RETURNING cloudinary_public_id
      `) as { cloudinary_public_id: string | null }[];

      if (rows.length === 0) return sendError(res, 404, "Wallpaper not found");
      if (rows[0].cloudinary_public_id) {
        await destroyCloudinaryAsset(rows[0].cloudinary_public_id);
      }
      return sendJson(res, 200, { ok: true });
    } catch (err) {
      console.error("DELETE /api/wallpapers/:id failed:", err);
      return sendError(res, 500, "Failed to delete wallpaper");
    }
  }

  return sendError(res, 405, "Method not allowed");
}
