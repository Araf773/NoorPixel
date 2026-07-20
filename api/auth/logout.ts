// POST /api/auth/logout — clears the admin session cookie.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sendJson, sendError, applyCors, handleOptions, ADMIN_COOKIE } from "../_lib/http.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(res);
  if (handleOptions(req, res)) return;

  if (req.method !== "POST") return sendError(res, 405, "Method not allowed");

  res.setHeader(
    "Set-Cookie",
    `${ADMIN_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`,
  );
  return sendJson(res, 200, { ok: true });
}
