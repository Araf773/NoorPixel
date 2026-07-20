// Real API client for NoorPixel — talks to the /api serverless functions.
//
// Replaces the original Replit-monorepo "@workspace/api-client-react" package.
// Exposes the same hook + query-key surface the pages import, so the pages
// themselves need no changes beyond their existing import path.
//
// Auth model: a single admin token (see ADMIN_TOKEN on the server). The token
// is entered on the admin login screen and kept in localStorage; every write
// request sends it as `Authorization: Bearer <token>`. Public reads need no auth.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const TOKEN_KEY = "np_admin_token";

export function getAdminToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore storage errors (private mode etc.) */
  }
}

function authHeaders(): Record<string, string> {
  const t = getAdminToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(message);
  }
  // 204 No Content
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ---- types ----
export interface Wallpaper {
  id: string;
  name: string;
  category: string;
  resolution: string;
  thumbnailUrl: string;
  viewUrl: string;
  downloads: number;
  tags?: string[];
}

export interface ListWallpapersResponse {
  wallpapers: Wallpaper[];
}

export interface AdminUser {
  email: string;
  name: string;
  picture: string | null;
}

// ---- query keys ----
export const getGetMeQueryKey = () => ["me"] as const;
export const getGetWallpaperQueryKey = (id: string) => ["wallpaper", id] as const;
export const getListWallpapersQueryKey = () => ["wallpapers"] as const;
export const getListCategoriesQueryKey = () => ["categories"] as const;

type QueryOpts = { query?: Record<string, unknown> };

// ---- queries ----
export function useGetMe(opts?: QueryOpts) {
  return useQuery<AdminUser | null>({
    queryKey: getGetMeQueryKey(),
    queryFn: async () => {
      if (!getAdminToken()) return null;
      try {
        return await apiFetch<AdminUser>("/api/me");
      } catch {
        // token invalid/expired -> treat as logged out
        setAdminToken(null);
        return null;
      }
    },
    ...(opts?.query ?? {}),
  });
}

export function useListWallpapers(
  params?: { category?: string; search?: string },
  opts?: QueryOpts,
) {
  const qs = new URLSearchParams();
  if (params?.category) qs.set("category", params.category);
  if (params?.search) qs.set("search", params.search);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";

  return useQuery<ListWallpapersResponse>({
    // include params in the key so filtering refetches
    queryKey: [...getListWallpapersQueryKey(), params?.category ?? "", params?.search ?? ""],
    queryFn: () => apiFetch<ListWallpapersResponse>(`/api/wallpapers${suffix}`),
    ...(opts?.query ?? {}),
  });
}

export function useListCategories(opts?: QueryOpts) {
  return useQuery<string[]>({
    queryKey: getListCategoriesQueryKey(),
    queryFn: async () => {
      const data = await apiFetch<{ categories: string[] }>("/api/categories");
      return data.categories;
    },
    ...(opts?.query ?? {}),
  });
}

export function useGetWallpaper(id: string, opts?: QueryOpts) {
  return useQuery<Wallpaper | null>({
    queryKey: getGetWallpaperQueryKey(id),
    queryFn: () => apiFetch<Wallpaper>(`/api/wallpapers/${id}`),
    ...(opts?.query ?? {}),
  });
}

// ---- mutations ----
export function useIncrementDownloads() {
  return useMutation({
    mutationFn: (vars: { id: string }) =>
      apiFetch<{ ok: true; downloads: number }>(`/api/wallpapers/${vars.id}/download`, {
        method: "POST",
      }),
  });
}

// Full upload flow: signature -> direct Cloudinary upload -> save metadata.
export function useUploadWallpaper() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      data: { file: File; name: string; category: string; tags?: string };
    }) => {
      const { file, name, category, tags } = vars.data;

      // 1. Get a signed upload payload from our server (admin-only).
      const sig = await apiFetch<{
        signature: string;
        timestamp: number;
        apiKey: string;
        cloudName: string;
        folder: string;
      }>("/api/upload-signature", { method: "POST", body: JSON.stringify({}) });

      // 2. Upload the file DIRECTLY to Cloudinary (bypasses our function's size limit).
      const form = new FormData();
      form.append("file", file);
      form.append("api_key", sig.apiKey);
      form.append("timestamp", String(sig.timestamp));
      form.append("signature", sig.signature);
      form.append("folder", sig.folder);

      const cloudRes = await fetch(
        `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
        { method: "POST", body: form },
      );
      if (!cloudRes.ok) {
        // Surface Cloudinary's real reason instead of a generic message. The
        // most common causes are: file larger than the plan limit (free tier
        // caps images at 10 MB), or an invalid/expired signature.
        let reason = `Cloudinary rejected the upload (HTTP ${cloudRes.status})`;
        try {
          const errBody = await cloudRes.json();
          if (errBody?.error?.message) reason = errBody.error.message;
        } catch {
          /* non-JSON error body */
        }
        throw new Error(reason);
      }
      const uploaded = await cloudRes.json();

      // Cloudinary gives us the master URL + dimensions. Derive a lighter
      // thumbnail via a transformation URL (width 600, auto format/quality).
      const viewUrl: string = uploaded.secure_url;
      const thumbnailUrl: string = viewUrl.replace(
        "/upload/",
        "/upload/w_600,f_auto,q_auto/",
      );
      const resolution =
        uploaded.width && uploaded.height ? `${uploaded.width}x${uploaded.height}` : "";

      // 3. Save metadata in our DB.
      const saved = await apiFetch<Wallpaper>("/api/wallpapers", {
        method: "POST",
        body: JSON.stringify({
          name,
          category,
          resolution,
          thumbnailUrl,
          viewUrl,
          cloudinaryPublicId: uploaded.public_id,
          tags,
        }),
      });

      // Refresh the gallery.
      queryClient.invalidateQueries({ queryKey: getListWallpapersQueryKey() });
      return saved;
    },
  });
}

// Delete a wallpaper (admin-only): removes the DB row + Cloudinary asset.
export function useDeleteWallpaper() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string }) =>
      apiFetch<{ ok: true }>(`/api/wallpapers/${vars.id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListWallpapersQueryKey() });
    },
  });
}

// Login: validate the token against /api/me, then persist it.
export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { token: string }) => {
      setAdminToken(vars.token);
      try {
        const user = await apiFetch<AdminUser>("/api/me");
        queryClient.setQueryData(getGetMeQueryKey(), user);
        return user;
      } catch (err) {
        setAdminToken(null);
        throw new Error("Invalid admin token");
      }
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      setAdminToken(null);
      queryClient.setQueryData(getGetMeQueryKey(), null);
      return { ok: true };
    },
  });
}
