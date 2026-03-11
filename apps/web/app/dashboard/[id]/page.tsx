import { getCompany } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DashboardPage({ params }: PageProps) {
  // 1. Obtener el ID de la URL
  const { id } = await params;
  
  // 2. Buscar datos de la empresa
  const company = await getCompany(id);

  if (!company) {
    return <div className="text-red-500 font-bold p-10">❌ Empresa no encontrada</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header de la Página */}
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Panel de Control</h1>
          <p className="text-slate-500 mt-1">
            Bienvenido a <span className="font-semibold text-slate-700">{company.name}</span>
          </p>
        </div>
      </header>

      {/* Grid de Widgets (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Widget 1: Ventas */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Ventas Totales</CardTitle>
            <span className="text-2xl">💵</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">$0.00</div>
            <p className="text-xs text-slate-400 mt-1">Sin datos disponibles aún</p>
          </CardContent>
        </Card>

        {/* Widget 2: Pedidos */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Pedidos Activos</CardTitle>
            <span className="text-2xl">📦</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">--</div>
            <p className="text-xs text-slate-400 mt-1">Sin datos disponibles aún</p>
          </CardContent>
        </Card>

        {/* Widget 3: Estado */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Estado del Sistema</CardTitle>
            <span className="text-2xl">⚡</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">--</div>
            <p className="text-xs text-slate-400 mt-1">Sin datos disponibles aún</p>
          </CardContent>
        </Card>
      </div>

      {/* Sección Secundaria (Gráfico placeholder) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="col-span-1 md:col-span-2 h-[300px] border-slate-200 bg-slate-50/50 flex items-center justify-center border-dashed">
            <div className="text-center">
                <span className="text-4xl block mb-2">📈</span>
                <p className="text-slate-400 font-medium">Aquí irá el gráfico de ingresos (Próximamente)</p>
            </div>
        </Card>
      </div>
    </div>
  );
}