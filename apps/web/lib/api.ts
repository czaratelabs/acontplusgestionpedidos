const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function getCompanies() {
    const res = await fetch(`${API_BASE}/companies`, {
      cache: 'no-store', // Datos en tiempo real
      // next: { tags: ['companies'] } // Para revalidación bajo demanda
    });
  
    if (!res.ok) throw new Error('Error en el cerebro del sistema');
  
    return res.json();
  }

  // Busca una empresa específica por su ID
export async function getCompany(id: string) {
  try {
    const res = await fetch(`${API_BASE}/companies/${id}`, {
      cache: 'no-store',
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
    const res = await fetch(`${API_BASE}/users/company/${companyId}`, {
      cache: 'no-store', // Para que siempre traiga datos frescos
    });
    if (!res.ok) return [];
    return res.json();
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
}