// POST /api/auth/login — exchange the admin token for an httpOnly session cookie.
// Body: { token: string }. On success sets the `np_admin` cookie.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  sendJson,
  sendError,
  applyCors,
  handleOptions,
  ADMIN_COOKIE,
  readBody,
  timingSafeEqualStr,
} from "../_lib/http.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(res);
  if (handleOptions(req, res)) return;

  if (req.method !== "POST") return sendError(res, 405, "Method not allowed");

  const expected = process.env.ADMIN_TOKEN;
  if (!expected) {
    console.error("ADMIN_TOKEN not configured");
    return sendError(res, 500, "Server not configured for admin login");
  }

  const body = readBody(req);
  const token = String(body.token ?? "");
  if (!token || !timingSafeEqualStr(token, expected)) {
    return sendError(res, 401, "Invalid admin token");
  }

  // httpOnly + secure cookie; SameSite=Lax is fine for same-origin admin use.
  const maxAge = 60 * 60 * 24 * 7; // 7 days
  res.setHeader(
    "Set-Cookie",
    `${ADMIN_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`,
  );
  return sendJson(res, 200, { ok: true, email: "admin@noorpixel", name: "Admin" });
}
