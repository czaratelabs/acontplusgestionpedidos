"use client";

import { useState, useEffect, use } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil } from "lucide-react";
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
import { useToast } from "@/components/ui/use-toast";

const formSchema = z.object({
  name: z.string().min(2, "El nombre es requerido (mín. 2 caracteres)"),
  description: z.string().optional(),
});

type WarehouseItem = {
  id: string;
  name: string;
  description: string | null;
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
  const router = useRouter();
  const { toast } = useToast();

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
        `${API_BASE}/warehouses/establishment/${establishmentId}`
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Error al guardar");
      }
      setOpen(false);
      setEditingWarehouse(null);
      reset({ name: "", description: "" });
      router.refresh();
      await fetchWarehouses();
      toast({
        title: "Éxito",
        description: "Bodega guardada correctamente.",
        variant: "default",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Error al guardar la bodega.",
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
            <Button>+ Nuevo Almacén</Button>
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
        {warehouses.map((wh) => (
          <Card key={wh.id} className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg">{wh.name}</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Editar almacén"
                onClick={() => openEditDialog(wh)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">
                {wh.description || "Sin descripción"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      {warehouses.length === 0 && !loading && (
        <p className="text-slate-500 text-center py-8">
          No hay almacenes. Crea uno con el botón &quot;+ Nuevo Almacén&quot;.
        </p>
      )}
    </div>
  );
}
