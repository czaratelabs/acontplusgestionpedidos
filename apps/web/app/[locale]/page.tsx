import { getCompanies } from "@/lib/api";
import { Suspense } from "react"; // Estándar React 19

// Componente Asíncrono (Server Component)
// El navegador NO descarga JavaScript para renderizar esto.
export default async function Home() {
  const companies = await getCompanies();

  return (
    <div className="min-h-screen p-10 font-sans bg-gray-50/50">
      <header className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
            Nexus ERP <span className="text-indigo-600 text-lg">v2026</span>
          </h1>
          <p className="text-slate-500 mt-2">Panel de Control Multi-Tenant</p>
        </div>

        <button className="bg-slate-900 text-white px-6 py-2.5 rounded-lg hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl font-medium">
          + Nueva Organización
        </button>
      </header>

      <main>
        <Suspense fallback={<div className="text-indigo-600">Cargando flujo de datos...</div>}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.map((company: any) => (
              <CardEmpresa key={company.id} data={company} />
            ))}
          </div>
        </Suspense>
      </main>
    </div>
  );
}

// Micro-componente visual
function CardEmpresa({ data }: { data: any }) {
  return (
    <div className="group bg-white border border-slate-200 p-6 rounded-2xl hover:border-indigo-500/50 hover:shadow-indigo-500/10 hover:shadow-2xl transition-all duration-300 cursor-pointer relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-indigo-100/50 to-transparent rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-150" />

      <div className="relative z-10">
        <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-4 text-2xl shadow-sm">
          🏢
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-1">{data.name}</h3>
        <p className="text-sm text-slate-400 font-mono tracking-wide">{data.ruc_nit}</p>

        <div className="mt-6 flex items-center text-xs font-medium text-indigo-600 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all">
          Acceder al Dashboard &rarr;
        </div>
      </div>
    </div>
  );
}