# NoorPixel

Free high-resolution Islamic wallpapers for the Ummah — gallery, in-browser image editor, and an admin portal for uploading new wallpapers.

Built with **Vite + React + TypeScript + Tailwind v4** on the frontend and **Vercel serverless functions** on the backend, with **Cloudinary** for image storage/CDN and **Neon Postgres** for metadata.

---

## Features

- **Gallery** — browse, filter by category, and search wallpapers.
- **In-browser editor** — adjust brightness/contrast/saturation/hue/blur, apply filter presets (Cinematic, Noir, Neon Glow, Faded, Cool Blue), flip/rotate, optional watermark, and export as PNG/JPEG/WebP. All client-side; no server round-trip.
- **Admin portal** — token-protected upload page. Files upload directly to Cloudinary; only metadata touches the API.
- **Download counter** — per-wallpaper, stored in Postgres.

When the database is empty the gallery falls back to a set of built-in placeholder wallpapers, so the site always looks populated.

---

## Architecture

```
Browser ──► Vercel Static (React SPA)
   │
   ├──► /api/* (Vercel serverless functions)
   │        ├── GET  /api/wallpapers            list (filter by category/search)
   │        ├── POST /api/wallpapers            save metadata (admin)
   │        ├── GET  /api/wallpapers/:id        single wallpaper
   │        ├── POST /api/wallpapers/:id/download   increment counter
   │        ├── GET  /api/categories            category list
   │        ├── POST /api/upload-signature      signed Cloudinary params (admin)
   │        ├── POST /api/auth/login            exchange admin token for session
   │        ├── POST /api/auth/logout
   │        └── GET  /api/me                    current admin identity
   │
   ├──► Cloudinary   (image files + CDN + transforms)  ◄── direct browser upload
   └──► Neon Postgres (wallpaper metadata)
```

**Why this shape:** image files (potentially many GB) never pass through the API — the browser uploads straight to Cloudinary using a short-lived signature, so you're not limited by Vercel's ~4.5 MB function body cap and you get a global CDN for free. The database only stores small metadata rows.

---

## Local development

```bash
npm install
cp .env.example .env      # then fill in the values (see below)
npm run dev               # http://localhost:5173
```

`npm run dev` runs the frontend only. To exercise the `/api` functions locally, use the Vercel CLI:

```bash
npm i -g vercel
vercel dev
```

## Environment variables

Copy `.env.example` to `.env` and fill in:

| Variable | Where | Notes |
|---|---|---|
| `DATABASE_URL` | server | Neon Postgres connection string |
| `CLOUDINARY_CLOUD_NAME` | server | Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | server | Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | server | **Secret — never commit.** Used to sign uploads |
| `ADMIN_TOKEN` | server | Long random string; gates all write endpoints |

None of these use the `VITE_` prefix, so they stay server-side and never ship to the browser bundle.

Generate a strong admin token:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel, **New Project → Import** the repo. Framework preset: **Other** (settings come from `vercel.json`).
3. Add the environment variables above under **Settings → Environment Variables**.
4. Deploy. The database schema is created automatically on the first API request.

## Admin usage

1. Visit `/admin`.
2. Enter the `ADMIN_TOKEN` value. It's stored in `localStorage` and sent as a bearer token on write requests.
3. Upload wallpapers — they go straight to Cloudinary and appear in the gallery immediately.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Vite dev server (frontend) |
| `npm run build` | Production build to `dist/public` |
| `npm run serve` | Preview the production build |
| `npm run typecheck` | Type-check the frontend |
