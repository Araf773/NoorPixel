// POST /api/upload-signature — admin-only. Returns a signed set of params the
// browser uses to upload DIRECTLY to Cloudinary, so large image files never
// pass through this serverless function (Vercel has a ~4.5MB body limit).
//
// Flow:
//   1. client POSTs here with the admin token -> gets { signature, timestamp, apiKey, cloudName, folder }
//   2. client POSTs the file + those params straight to Cloudinary's upload endpoint
//   3. client POSTs the returned secure_url + public_id to /api/wallpapers to save metadata
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHash } from "node:crypto";
import { requireAdmin, sendJson, sendError, applyCors, handleOptions } from "./_lib/http.js";

const FOLDER = "noorpixel";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(res);
  if (handleOptions(req, res)) return;

  if (req.method !== "POST") return sendError(res, 405, "Method not allowed");
  if (!requireAdmin(req, res)) return;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    console.error("Cloudinary env vars missing");
    return sendError(res, 500, "Server not configured for uploads");
  }

  // Cloudinary signature: sha1 of sorted params + api_secret.
  // We sign folder + timestamp; keep this in sync with what the client sends.
  const timestamp = Math.floor(Date.now() / 1000);
  const toSign = `folder=${FOLDER}&timestamp=${timestamp}`;
  const signature = createHash("sha1").update(toSign + apiSecret).digest("hex");

  return sendJson(res, 200, {
    signature,
    timestamp,
    apiKey,
    cloudName,
    folder: FOLDER,
  });
}
