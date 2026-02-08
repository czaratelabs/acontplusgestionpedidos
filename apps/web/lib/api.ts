// En 2026, el fetch está super-vitaminado
export async function getCompanies() {
    const res = await fetch('http://localhost:3000/companies', {
      cache: 'no-store', // Datos en tiempo real
      // next: { tags: ['companies'] } // Para revalidación bajo demanda
    });
  
    if (!res.ok) throw new Error('Error en el cerebro del sistema');
  
    return res.json();
  }