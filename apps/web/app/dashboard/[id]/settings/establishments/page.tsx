import { EstablishmentDialog } from "./establishment-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function getEstablishments(companyId: string) {
  const res = await fetch(`${API_BASE}/establishments/company/${companyId}`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

export default async function EstablishmentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const establishments = await getEstablishments(id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Establecimientos</h1>
          <p className="text-slate-500">Administra tus sucursales y puntos de emisión.</p>
        </div>
        <EstablishmentDialog companyId={id} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {establishments.map((est: { id: string; name: string; address: string; series: string; phone?: string | null; email?: string | null; logo_url?: string | null }) => (
          <Card key={est.id} className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Serie: {est.series}</CardTitle>
              <div className="flex items-center gap-1">
                <EstablishmentDialog companyId={id} initialData={est} />
                <Badge variant="outline">Activo</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-1">{est.name}</div>
              <p className="text-xs text-slate-500 mb-4">{est.address}</p>
              <div className="text-xs text-slate-400 space-y-1">
                <p>📞 {est.phone || "Sin teléfono"}</p>
                <p>📧 {est.email || "Sin email"}</p>
              </div>

              <div className="mt-4 flex gap-2">
                <Link href={`/dashboard/${id}/settings/establishments/${est.id}/emission-points`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    ⚙️ Cajas / Puntos
                  </Button>
                </Link>
                <Link href={`/dashboard/${id}/settings/establishments/${est.id}/warehouses`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    📦 Almacenes
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}