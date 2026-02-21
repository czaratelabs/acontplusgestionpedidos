import { headers } from "next/headers";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/** Headers con la cookie de auth para llamadas server-side al API protegido */
async function getAuthHeaders(): Promise<HeadersInit> {
  const h = await headers();
  const cookie = h.get("cookie") ?? "";
  return cookie ? { Cookie: cookie } : {};
}

export async function getCompanies() {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/companies`, {
    cache: "no-store",
    headers: authHeaders,
  });

  if (!res.ok) throw new Error("Error en el cerebro del sistema");

  return res.json();
}

// Busca una empresa específica por su ID
export async function getCompany(id: string) {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/companies/${id}`, {
      cache: "no-store",
      headers: authHeaders,
    });

    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    console.error("Error fetching company:", error);
    return null;
  }
}

// Obtener info de límite de usuarios (total y vendedores) para una empresa
export async function getCompanyUserLimitInfo(companyId: string): Promise<{
  totalCount: number;
  totalLimit: number;
  sellersCount: number;
  sellersLimit: number;
}> {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/users/company/${companyId}/limit-info`, {
      cache: "no-store",
      headers: authHeaders,
    });
    if (!res.ok) return { totalCount: 0, totalLimit: -1, sellersCount: 0, sellersLimit: -1 };
    return res.json();
  } catch {
    return { totalCount: 0, totalLimit: -1, sellersCount: 0, sellersLimit: -1 };
  }
}

// Obtener usuarios de una empresa
export async function getCompanyUsers(companyId: string) {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/users/company/${companyId}`, {
      cache: "no-store",
      headers: authHeaders,
    });
    if (!res.ok) return [];
    return res.json();
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
}

// Obtener info de límite de establecimientos (count, limit) para una empresa
export async function getCompanyEstablishmentLimitInfo(
  companyId: string
): Promise<{ count: number; limit: number }> {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(
      `${API_BASE}/establishments/company/${companyId}/limit-info`,
      { cache: "no-store", headers: authHeaders }
    );
    if (!res.ok) return { count: 0, limit: -1 };
    return res.json();
  } catch {
    return { count: 0, limit: -1 };
  }
}

// Obtener establecimientos de una empresa
export async function getEstablishments(companyId: string) {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/establishments/company/${companyId}`, {
      cache: "no-store",
      headers: authHeaders,
    });
    if (!res.ok) return [];
    return res.json();
  } catch (error) {
    console.error("Error fetching establishments:", error);
    return [];
  }
}