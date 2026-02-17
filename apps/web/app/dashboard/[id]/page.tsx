import { getCompany } from "@/lib/api";
import { Button } from "@/components/ui/button";
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
        <div className="flex gap-3">
          <Button variant="outline">Descargar Reporte</Button>
          <Button className="bg-slate-900 hover:bg-slate-800">+ Nueva Venta</Button>
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
            <div className="text-2xl font-bold text-slate-900">$45,231.89</div>
            <p className="text-xs text-green-600 font-medium mt-1">
              +20.1% respecto al mes pasado
            </p>
          </CardContent>
        </Card>

        {/* Widget 2: Pedidos */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Pedidos Activos</CardTitle>
            <span className="text-2xl">📦</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">+573</div>
            <p className="text-xs text-slate-400 mt-1">
              12 pedidos pendientes de envío
            </p>
          </CardContent>
        </Card>

        {/* Widget 3: Estado */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Estado del Sistema</CardTitle>
            <span className="text-2xl">⚡</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">Operativo</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <p className="text-xs text-green-600 font-medium">Todos los servicios activos</p>
            </div>
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