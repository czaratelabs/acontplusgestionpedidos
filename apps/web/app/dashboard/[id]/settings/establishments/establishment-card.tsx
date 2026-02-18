"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { EstablishmentDialog } from "./establishment-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type EstablishmentRow = {
  id: string;
  name: string;
  address: string;
  series: string;
  phone?: string | null;
  email?: string | null;
  logo_url?: string | null;
  isActive?: boolean;
};

type EstablishmentCardProps = {
  establishment: EstablishmentRow;
  companyId: string;
};

export function EstablishmentCard({ establishment, companyId }: EstablishmentCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [inactivateTarget, setInactivateTarget] = useState<EstablishmentRow | null>(null);
  const [inactivating, setInactivating] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);

  const est = establishment;
  const isActive = est.isActive !== false; // default true for existing data before migration

  async function handleInactivate() {
    if (!inactivateTarget) return;
    setInactivating(true);
    try {
      const res = await fetch(`${API_BASE}/establishments/${inactivateTarget.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Error al inactivar");
      setInactivateTarget(null);
      router.refresh();
      toast({
        title: "Éxito",
        description: "Establecimiento inactivado correctamente.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo inactivar el establecimiento.",
        variant: "destructive",
      });
    } finally {
      setInactivating(false);
    }
  }

  async function handleActivate() {
    setActivatingId(est.id);
    try {
      const res = await fetch(`${API_BASE}/establishments/${est.id}/activate`, {
        method: "PATCH",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Error al activar");
      router.refresh();
      toast({
        title: "Éxito",
        description: "Establecimiento activado correctamente.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo activar el establecimiento.",
        variant: "destructive",
      });
    } finally {
      setActivatingId(null);
    }
  }

  return (
    <>
      <Card className="shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Serie: {est.series}</CardTitle>
          <div className="flex items-center gap-1">
            <EstablishmentDialog companyId={companyId} initialData={est} />
            <Badge
              className={
                isActive
                  ? "bg-green-100 text-green-800 hover:bg-green-200"
                  : "bg-red-500 text-white hover:bg-red-600"
              }
            >
              {isActive ? "Activo" : "Inactivo"}
            </Badge>
            {isActive ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                aria-label="Inactivar establecimiento"
                onClick={() => setInactivateTarget(est)}
              >
                <Ban className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                aria-label="Activar establecimiento"
                disabled={activatingId === est.id}
                onClick={handleActivate}
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
            )}
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
            <Link
              href={`/dashboard/${companyId}/settings/establishments/${est.id}/emission-points`}
              className="flex-1"
            >
              <Button variant="outline" size="sm" className="w-full">
                ⚙️ Cajas / Puntos
              </Button>
            </Link>
            <Link
              href={`/dashboard/${companyId}/settings/establishments/${est.id}/warehouses`}
              className="flex-1"
            >
              <Button variant="outline" size="sm" className="w-full">
                📦 Almacenes
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!inactivateTarget} onOpenChange={() => setInactivateTarget(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>¿Inactivar establecimiento?</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de inactivar este establecimiento? No se podrá usar en nuevas transacciones.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInactivateTarget(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleInactivate} disabled={inactivating}>
              {inactivating ? "Inactivando..." : "Inactivar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
