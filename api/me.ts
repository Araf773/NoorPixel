// GET /api/me — returns the current admin identity if the session cookie
// (or Authorization header) carries a valid token, else 401.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isAdmin, sendJson, sendError, applyCors, handleOptions } from "./_lib/http.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(res);
  if (handleOptions(req, res)) return;

  if (req.method !== "GET") return sendError(res, 405, "Method not allowed");

  if (!isAdmin(req)) return sendError(res, 401, "Not authenticated");
  return sendJson(res, 200, { email: "admin@noorpixel", name: "Admin", picture: null });
}
