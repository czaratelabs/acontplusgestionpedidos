// En 2026, el fetch está super-vitaminado
export async function getCompanies() {
    const res = await fetch('http://localhost:3000/companies', {
      cache: 'no-store', // Datos en tiempo real
      // next: { tags: ['companies'] } // Para revalidación bajo demanda
    });
  
    if (!res.ok) throw new Error('Error en el cerebro del sistema');
  
    return res.json();
  }

  // Busca una empresa específica por su ID
export async function getCompany(id: string) {
  try {
    const res = await fetch(`http://localhost:3000/companies/${id}`, {
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
    const res = await fetch(`http://localhost:3000/users/company/${companyId}`, {
      cache: 'no-store', // Para que siempre traiga datos frescos
    });
    if (!res.ok) return [];
    return res.json();
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
}