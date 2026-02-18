import { EstablishmentDialog } from "./establishment-dialog";
import { EstablishmentCard } from "./establishment-card";
import { getEstablishments } from "@/lib/api";

export default async function EstablishmentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  console.log("Fetching establishments for company:", id);
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
        {establishments.map((est: { id: string; name: string; address: string; series: string; phone?: string | null; email?: string | null; logo_url?: string | null; isActive?: boolean }) => (
          <EstablishmentCard key={est.id} establishment={est} companyId={id} />
        ))}
      </div>
    </div>
  );
}