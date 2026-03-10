/**
 * Cliente HTTP centralizado para Client Components.
 * - En navegador usa proxy /api/... para enviar cookie HttpOnly al backend.
 * - Interceptor 401 → refresh en /api/auth/refresh → reintento; si falla, /login
 */

import { fetchWithAuth } from "./auth-interceptor";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export { API_BASE };

type ApiOptions = RequestInit & { skip401Redirect?: boolean };

function buildUrl(path: string): string {
  if (path.startsWith("http")) return path;
  const p = path.startsWith("/") ? path : `/${path}`;
  // Rutas que ya son API Next (login, refresh, audit, etc.)
  if (p.startsWith("/api")) return p;
  // En cliente, proxy same-origin para que la cookie HttpOnly (refresh) llegue al backend
  if (typeof window !== "undefined") {
    return `/api${p}`;
  }
  return API_BASE + p;
}

function defaultHeaders(opts?: ApiOptions): HeadersInit {
  const h: Record<string, string> = {};
  if (opts?.headers && typeof opts.headers === "object" && !Array.isArray(opts.headers)) {
    Object.assign(h, opts.headers as Record<string, string>);
  }
  return h;
}

async function handleResponse<T>(res: Response, skip401Redirect?: boolean): Promise<T> {
  if (res.status === 401 && !skip401Redirect && typeof window !== "undefined") {
    window.location.href = "/login";
    throw new Error("Sesión expirada");
  }
  const text = await res.text();
  if (!res.ok) {
    let message = `Error ${res.status}`;
    if (text) {
      try {
        const err = JSON.parse(text);
        if (typeof err?.message === "string") message = err.message;
      } catch {
        message = text;
      }
    }
    throw new Error(message);
  }
  if (!text?.trim()) return null as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

export async function apiGet<T = unknown>(url: string, opts?: ApiOptions): Promise<T> {
  const res = await fetchWithAuth(buildUrl(url), {
    ...opts,
    method: "GET",
    credentials: "include",
    headers: { ...defaultHeaders(opts) },
  });
  return handleResponse<T>(res, opts?.skip401Redirect);
}

export async function apiPost<T = unknown>(url: string, body?: unknown, opts?: ApiOptions): Promise<T> {
  const res = await fetchWithAuth(buildUrl(url), {
    ...opts,
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...defaultHeaders(opts) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(res, opts?.skip401Redirect);
}

export async function apiPatch<T = unknown>(url: string, body?: unknown, opts?: ApiOptions): Promise<T> {
  const res = await fetchWithAuth(buildUrl(url), {
    ...opts,
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...defaultHeaders(opts) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(res, opts?.skip401Redirect);
}

export async function apiPut<T = unknown>(url: string, body?: unknown, opts?: ApiOptions): Promise<T> {
  const res = await fetchWithAuth(buildUrl(url), {
    ...opts,
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...defaultHeaders(opts) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(res, opts?.skip401Redirect);
}

export async function apiDelete<T = unknown>(url: string, opts?: ApiOptions): Promise<T> {
  const res = await fetchWithAuth(buildUrl(url), {
    ...opts,
    method: "DELETE",
    credentials: "include",
    headers: { ...defaultHeaders(opts) },
  });
  return handleResponse<T>(res, opts?.skip401Redirect);
}

/** Fetch raw Response (401 con refresh + reintento) */
export async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  const headers: Record<string, string> = { ...(init?.headers as Record<string, string>) };
  if (init?.body && typeof init.body === "string" && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  return fetchWithAuth(buildUrl(url), {
    ...init,
    credentials: "include",
    headers,
  });
}

// --- Funciones de dominio ---

export async function getCompanyWarehouseLimitInfoClient(
  companyId: string
): Promise<{ count: number; limit: number }> {
  try {
    return await apiGet<{ count: number; limit: number }>(
      `/warehouses/company/${companyId}/limit-info`
    );
  } catch {
    return { count: 0, limit: -1 };
  }
}

export async function getCompanyEmissionPointLimitInfoClient(
  companyId: string
): Promise<{ count: number; limit: number }> {
  try {
    return await apiGet<{ count: number; limit: number }>(
      `/emission-points/company/${companyId}/limit-info`
    );
  } catch {
    return { count: 0, limit: -1 };
  }
}

export type CatalogItem = { id: string; name: string };

async function fetchCatalog(
  companyId: string,
  path: string
): Promise<{ id: string; name: string }[]> {
  const data = await apiGet<unknown[]>(
    `/articles/catalogs/company/${companyId}/${path}`
  );
  return Array.isArray(data) ? data : [];
}

export async function fetchCatalogStrict(
  companyId: string,
  path: "brands" | "categories" | "measures" | "colors" | "sizes" | "flavors"
): Promise<{ id: string; name: string }[]> {
  return fetchCatalog(companyId, path);
}

export async function getBrandsClient(companyId: string) {
  try {
    return await fetchCatalog(companyId, "brands");
  } catch {
    return [];
  }
}
export async function getCategoriesClient(companyId: string) {
  try {
    return await fetchCatalog(companyId, "categories");
  } catch {
    return [];
  }
}
export async function getMeasuresClient(companyId: string) {
  try {
    return await fetchCatalog(companyId, "measures");
  } catch {
    return [];
  }
}
export async function getColorsClient(companyId: string) {
  try {
    return await fetchCatalog(companyId, "colors");
  } catch {
    return [];
  }
}
export async function getSizesClient(companyId: string) {
  try {
    return await fetchCatalog(companyId, "sizes");
  } catch {
    return [];
  }
}
export async function getFlavorsClient(companyId: string) {
  try {
    return await fetchCatalog(companyId, "flavors");
  } catch {
    return [];
  }
}

export async function createCatalogItemClient(
  companyId: string,
  catalog: "brands" | "categories" | "measures" | "colors" | "sizes" | "flavors",
  name: string
): Promise<CatalogItem | null> {
  try {
    return await apiPost<CatalogItem>(
      `/articles/catalogs/company/${companyId}/${catalog}`,
      { name: name.trim() }
    );
  } catch {
    return null;
  }
}
