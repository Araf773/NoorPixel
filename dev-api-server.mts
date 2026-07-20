// Local-only dev server that runs the REAL /api serverless handlers behind a
// plain Node http server, with Vercel-style req/res shims. Vite proxies /api
// here (see vite.config.ts) so `npm run dev` exercises the exact code that
// deploys to Vercel — against the real Cloudinary + Neon in .env.
//
// This file is dev tooling only; it is NOT deployed (Vercel uses api/* directly).

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// ---- load .env (simple parser; no dependency) ----
const __dirname = path.dirname(fileURLToPath(import.meta.url));
try {
  const envRaw = readFileSync(path.join(__dirname, ".env"), "utf8");
  for (const line of envRaw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  console.log("[dev-api] loaded .env");
} catch {
  console.warn("[dev-api] no .env found — API will error until env vars are set");
}

const PORT = Number(process.env.API_PORT) || 3001;

// ---- route table: url pattern -> handler module path ----
// Order matters: more specific routes first.
type Route = { re: RegExp; params: string[]; mod: string };
const routes: Route[] = [
  { re: /^\/api\/wallpapers\/([^/]+)\/download$/, params: ["id"], mod: "./api/wallpapers/[id]/download.ts" },
  { re: /^\/api\/wallpapers\/([^/]+)$/, params: ["id"], mod: "./api/wallpapers/[id].ts" },
  { re: /^\/api\/wallpapers$/, params: [], mod: "./api/wallpapers/index.ts" },
  { re: /^\/api\/categories$/, params: [], mod: "./api/categories.ts" },
  { re: /^\/api\/upload-signature$/, params: [], mod: "./api/upload-signature.ts" },
  { re: /^\/api\/me$/, params: [], mod: "./api/me.ts" },
  { re: /^\/api\/auth\/login$/, params: [], mod: "./api/auth/login.ts" },
  { re: /^\/api\/auth\/logout$/, params: [], mod: "./api/auth/logout.ts" },
];

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
  });
}

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const pathname = url.pathname;

  const route = routes.find((r) => r.re.test(pathname));
  if (!route) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Not found" }));
    return;
  }

  // Build Vercel-like req.query from path params + search params.
  const match = pathname.match(route.re)!;
  const query: Record<string, string> = {};
  route.params.forEach((name, i) => (query[name] = decodeURIComponent(match[i + 1])));
  url.searchParams.forEach((v, k) => (query[k] = v));

  // Parse JSON body.
  let body: unknown = undefined;
  if (req.method === "POST" || req.method === "PUT" || req.method === "DELETE") {
    const raw = await readBody(req);
    if (raw) {
      try {
        body = JSON.parse(raw);
      } catch {
        body = raw;
      }
    }
  }

  // Attach Vercel shims onto the Node req/res.
  const vreq = req as any;
  vreq.query = query;
  vreq.body = body;

  const vres = res as any;
  vres.status = (code: number) => {
    res.statusCode = code;
    return vres;
  };
  vres.send = (payload: any) => {
    if (payload === undefined || payload === null) res.end();
    else if (typeof payload === "string" || Buffer.isBuffer(payload)) res.end(payload);
    else {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(payload));
    }
    return vres;
  };
  vres.json = (payload: any) => {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(payload));
    return vres;
  };

  try {
    const mod = await import(route.mod);
    await mod.default(vreq, vres);
  } catch (err) {
    console.error(`[dev-api] ${req.method} ${pathname} failed:`, err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Handler crashed", detail: String(err) }));
    }
  }
});

server.listen(PORT, () => {
  console.log(`[dev-api] running on http://localhost:${PORT} — proxied from Vite at /api`);
});
