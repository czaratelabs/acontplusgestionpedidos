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