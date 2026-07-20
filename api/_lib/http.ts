// Shared helpers for the serverless API: admin-token auth (cookie + bearer),
// JSON responses, CORS, body parsing. Kept framework-light so each function
// stays a plain Vercel handler.

import type { VercelRequest, VercelResponse } from "@vercel/node";

// The admin token gates write operations (upload signature, create, delete).
// It lives only in server-side env (no VITE_ prefix) so it never ships to the
// browser bundle.
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

// Name of the httpOnly session cookie set by /api/auth/login.
export const ADMIN_COOKIE = "np_admin";

// ---- responses ----
export function sendJson(res: VercelResponse, status: number, body: unknown): void {
  res.status(status).setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(body));
}

export function sendError(res: VercelResponse, status: number, message: string): void {
  sendJson(res, status, { error: message });
}

// ---- CORS / preflight ----
// Same-origin in production (frontend + API share the Vercel domain), so CORS
// is permissive but credentials-aware for local dev against a separate origin.
export function applyCors(res: VercelResponse): void {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

// Returns true if it handled an OPTIONS preflight (caller should return).
export function handleOptions(req: VercelRequest, res: VercelResponse): boolean {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }
  return false;
}

// ---- body parsing ----
// Vercel usually parses JSON into req.body, but be defensive about string bodies.
export function readBody(req: VercelRequest): Record<string, unknown> {
  const b = req.body;
  if (!b) return {};
  if (typeof b === "string") {
    try {
      return JSON.parse(b) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return b as Record<string, unknown>;
}

// ---- auth ----
// Length-checked constant-time-ish string compare to avoid trivial timing leaks.
export function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

// Admin if EITHER a valid session cookie OR a valid Bearer token is present.
export function isAdmin(req: VercelRequest): boolean {
  if (!ADMIN_TOKEN) return false;

  const cookies = parseCookies(req.headers.cookie);
  const cookieToken = cookies[ADMIN_COOKIE];
  if (cookieToken && timingSafeEqualStr(cookieToken, ADMIN_TOKEN)) return true;

  const header = req.headers.authorization ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : header;
  if (bearer && timingSafeEqualStr(bearer, ADMIN_TOKEN)) return true;

  return false;
}

export function requireAdmin(req: VercelRequest, res: VercelResponse): boolean {
  if (!isAdmin(req)) {
    sendError(res, 401, "Unauthorized");
    return false;
  }
  return true;
}
