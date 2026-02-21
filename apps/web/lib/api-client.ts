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
