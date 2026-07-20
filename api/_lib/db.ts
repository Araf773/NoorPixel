// Neon serverless Postgres client + schema.
//
// Uses the HTTP driver (@neondatabase/serverless) which is designed for
// serverless/edge environments like Vercel functions — no connection pooling
// headaches, one round-trip per query.

import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required.");
}

export const sql = neon(connectionString);

export interface WallpaperRow {
  id: string;
  name: string;
  category: string;
  resolution: string;
  thumbnail_url: string;
  view_url: string;
  cloudinary_public_id: string | null;
  tags: string[];
  downloads: number;
  created_at: string;
}

// Public-facing shape (camelCase) the frontend expects.
export interface Wallpaper {
  id: string;
  name: string;
  category: string;
  resolution: string;
  thumbnailUrl: string;
  viewUrl: string;
  tags: string[];
  downloads: number;
}

export function toWallpaper(row: WallpaperRow): Wallpaper {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    resolution: row.resolution,
    thumbnailUrl: row.thumbnail_url,
    viewUrl: row.view_url,
    tags: row.tags ?? [],
    downloads: row.downloads,
  };
}

// Idempotent schema creation. Safe to call on every cold start; Postgres
// skips it when the table already exists.
let initialized = false;

export async function ensureSchema(): Promise<void> {
  if (initialized) return;
  await sql`
    CREATE TABLE IF NOT EXISTS wallpapers (
      id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      name                 TEXT NOT NULL,
      category             TEXT NOT NULL,
      resolution           TEXT NOT NULL DEFAULT '',
      thumbnail_url        TEXT NOT NULL,
      view_url             TEXT NOT NULL,
      cloudinary_public_id TEXT,
      tags                 TEXT[] NOT NULL DEFAULT '{}',
      downloads            INTEGER NOT NULL DEFAULT 0,
      created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS wallpapers_category_idx ON wallpapers (category)`;
  await sql`CREATE INDEX IF NOT EXISTS wallpapers_created_idx ON wallpapers (created_at DESC)`;
  initialized = true;
}
