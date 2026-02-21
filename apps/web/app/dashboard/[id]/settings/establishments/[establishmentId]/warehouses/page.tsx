"use client";

import { useState, useEffect, use } from "react";
import { getCompanyWarehouseLimitInfoClient } from "@/lib/api-client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Ban, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

const formSchema = z.object({
  name: z.string().min(2, "El nombre es requerido (mín. 2 caracteres)"),
  description: z.string().optional(),
});

type WarehouseItem = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  created_at: string;
  updated_at: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function WarehousesPage({
  params,
}: {
  params: Promise<{ id: string; establishmentId: string }>;
}) {
  const { id: companyId, establishmentId } = use(params);
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [open, setOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [inactivateTarget, setInactivateTarget] = useState<WarehouseItem | null>(null);
  const [inactivating, setInactivating] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [limitInfo, setLimitInfo] = useState<{ count: number; limit: number }>({ count: 0, limit: -1 });
  const router = useRouter();
  const { toast } = useToast();

  const limitReached = limitInfo.limit >= 0 && limitInfo.count >= limitInfo.limit;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", description: "" },
  });

  async function fetchWarehouses() {
    try {
      const res = await fetch(
        `${API_BASE}/warehouses/establishment/${establishmentId}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Error cargando almacenes");
      const data = await res.json();
      setWarehouses(data);
    } catch (err) {
      console.error(err);
      setWarehouses([]);
    }
  }

  useEffect(() => {
    fetchWarehouses();
  }, [establishmentId]);

  useEffect(() => {
    getCompanyWarehouseLimitInfoClient(companyId).then(setLimitInfo);
  }, [companyId]);

  // Pre-llenar formulario en modo edición y limpiar al abrir en modo crear
  useEffect(() => {
    if (open && editingWarehouse) {
      reset({
        name: editingWarehouse.name ?? "",
        description: editingWarehouse.description ?? "",
      });
    } else if (open && !editingWarehouse) {
      reset({ name: "", description: "" });
    }
  }, [open, editingWarehouse, reset]);

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      setEditingWarehouse(null);
      reset({ name: "", description: "" });
    }
    setOpen(isOpen);
  }

  function openEditDialog(warehouse: WarehouseItem) {
    setEditingWarehouse(warehouse);
    setOpen(true);
  }

  async function handleInactivate() {
    if (!inactivateTarget) return;
    setInactivating(true);
    try {
      const res = await fetch(`${API_BASE}/warehouses/${inactivateTarget.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Error al inactivar");
      setInactivateTarget(null);
      await fetchWarehouses();
      router.refresh();
      getCompanyWarehouseLimitInfoClient(companyId).then(setLimitInfo);
      toast({
        title: "Éxito",
        description: "Almacén inactivado correctamente.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo inactivar el almacén.",
        variant: "destructive",
      });
    } finally {
      setInactivating(false);
    }
  }

  async function handleActivate(warehouse: WarehouseItem) {
    setActivatingId(warehouse.id);
    try {
      const res = await fetch(`${API_BASE}/warehouses/${warehouse.id}/activate`, {
        method: "PATCH",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Error al activar");
      await fetchWarehouses();
      router.refresh();
      getCompanyWarehouseLimitInfoClient(companyId).then(setLimitInfo);
      toast({
        title: "Éxito",
        description: "Almacén activado correctamente.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo activar el almacén.",
        variant: "destructive",
      });
    } finally {
      setActivatingId(null);
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      const payload = {
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
      };
      const url = editingWarehouse
        ? `${API_BASE}/warehouses/${editingWarehouse.id}`
        : `${API_BASE}/warehouses/establishment/${establishmentId}`;
      const method = editingWarehouse ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message[0] : (data.message ?? "Error al guardar");
        throw new Error(typeof msg === "string" ? msg : "Error al guardar");
      }
      setOpen(false);
      setEditingWarehouse(null);
      reset({ name: "", description: "" });
      router.refresh();
      await fetchWarehouses();
      getCompanyWarehouseLimitInfoClient(companyId).then(setLimitInfo);
      toast({
        title: "Éxito",
        description: "Bodega guardada correctamente.",
        variant: "default",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Error al guardar la bodega.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Link
              href={`/dashboard/${companyId}/settings/establishments`}
              className="hover:text-slate-700"
            >
              Establecimientos
            </Link>
            <span>/</span>
            <span>Almacenes</span>
          </div>
          <h1 className="text-2xl font-bold">Almacenes</h1>
          <p className="text-slate-500 text-sm">
            Ubicaciones de inventario vinculadas a este establecimiento.
          </p>
        </div>

        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button
              disabled={limitReached}
              title={limitReached ? "Límite de plan alcanzado" : undefined}
            >
              + Nuevo Almacén
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingWarehouse ? "Editar Bodega" : "Crear Bodega"}
              </DialogTitle>
              <DialogDescription>
                {editingWarehouse
                  ? "Modifica los datos del almacén."
                  : "Crea una ubicación de almacenamiento para el inventario."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  placeholder="Ej: Almacén Principal"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-red-500 text-xs">{errors.name.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Descripción (opcional)</Label>
                <Input
                  id="description"
                  placeholder="Ej: Productos terminados"
                  {...register("description")}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={loading}>
                  {loading
                    ? "Guardando..."
                    : editingWarehouse
                      ? "Actualizar"
                      : "Guardar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {warehouses.map((wh) => {
          const isActive = wh.isActive !== false;
          return (
            <Card key={wh.id} className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg">{wh.name}</CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label="Editar almacén"
                    onClick={() => openEditDialog(wh)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
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
                      aria-label="Inactivar almacén"
                      onClick={() => setInactivateTarget(wh)}
                    >
                      <Ban className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                      aria-label="Activar almacén"
                      title={limitReached ? "Límite de plan alcanzado" : undefined}
                      disabled={activatingId === wh.id || limitReached}
                      onClick={() => handleActivate(wh)}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500">
                  {wh.description || "Sin descripción"}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!inactivateTarget} onOpenChange={() => setInactivateTarget(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>¿Inactivar almacén?</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de inactivar este almacén? No se eliminará; podrás activarlo de nuevo cuando lo necesites.
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

      {warehouses.length === 0 && !loading && (
        <p className="text-slate-500 text-center py-8">
          No hay almacenes. Crea uno con el botón &quot;+ Nuevo Almacén&quot;.
        </p>
      )}
    </div>
  );
}
