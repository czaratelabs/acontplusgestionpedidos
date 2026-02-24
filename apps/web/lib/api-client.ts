/** Funciones API que pueden usarse en Client Components (sin next/headers) */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function getCompanyWarehouseLimitInfoClient(
  companyId: string
): Promise<{ count: number; limit: number }> {
  try {
    const res = await fetch(
      `${API_BASE}/warehouses/company/${companyId}/limit-info`,
      { credentials: "include" }
    );
    if (!res.ok) return { count: 0, limit: -1 };
    return res.json();
  } catch {
    return { count: 0, limit: -1 };
  }
}

export async function getCompanyEmissionPointLimitInfoClient(
  companyId: string
): Promise<{ count: number; limit: number }> {
  try {
    const res = await fetch(
      `${API_BASE}/emission-points/company/${companyId}/limit-info`,
      { credentials: "include" }
    );
    if (!res.ok) return { count: 0, limit: -1 };
    return res.json();
  } catch {
    return { count: 0, limit: -1 };
  }
}

/** Catálogos de inventario (para uso en Client Components) */
export async function getBrandsClient(companyId: string) {
  try {
    const res = await fetch(`${API_BASE}/articles/catalogs/company/${companyId}/brands`, { credentials: "include" });
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}
export async function getCategoriesClient(companyId: string) {
  try {
    const res = await fetch(`${API_BASE}/articles/catalogs/company/${companyId}/categories`, { credentials: "include" });
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}
export async function getMeasuresClient(companyId: string) {
  try {
    const res = await fetch(`${API_BASE}/articles/catalogs/company/${companyId}/measures`, { credentials: "include" });
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}
export async function getColorsClient(companyId: string) {
  try {
    const res = await fetch(`${API_BASE}/articles/catalogs/company/${companyId}/colors`, { credentials: "include" });
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}
export async function getSizesClient(companyId: string) {
  try {
    const res = await fetch(`${API_BASE}/articles/catalogs/company/${companyId}/sizes`, { credentials: "include" });
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}
export async function getFlavorsClient(companyId: string) {
  try {
    const res = await fetch(`${API_BASE}/articles/catalogs/company/${companyId}/flavors`, { credentials: "include" });
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}

export type CatalogItem = { id: string; name: string };

/** Crear items en catálogos (para uso en Client Components) */
export async function createCatalogItemClient(
  companyId: string,
  catalog: "brands" | "categories" | "measures" | "colors" | "sizes" | "flavors",
  name: string
): Promise<CatalogItem | null> {
  try {
    const res = await fetch(
      `${API_BASE}/articles/catalogs/company/${companyId}/${catalog}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
        credentials: "include",
      }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
