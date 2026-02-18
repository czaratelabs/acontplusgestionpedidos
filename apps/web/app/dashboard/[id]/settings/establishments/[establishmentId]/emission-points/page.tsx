"use client";

import { useState, useEffect, use } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { Pencil, Ban, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

const sequenceSchema = z.object({
  invoice_sequence: z.coerce.number().int().min(1, "Mínimo 1"),
  proforma_sequence: z.coerce.number().int().min(1, "Mínimo 1"),
  order_sequence: z.coerce.number().int().min(1, "Mínimo 1"),
  delivery_note_sequence: z.coerce.number().int().min(1, "Mínimo 1"),
  dispatch_sequence: z.coerce.number().int().min(1, "Mínimo 1"),
});

const formSchema = z.object({
  code: z.string().length(3, "Debe ser de 3 dígitos (Ej: 001)"),
  name: z.string().min(2, "Nombre requerido"),
  ...sequenceSchema.shape,
});

type EmissionPoint = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  invoice_sequence: number;
  proforma_sequence?: number;
  order_sequence?: number;
  delivery_note_sequence?: number;
  dispatch_sequence?: number;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const defaultSequences = {
  invoice_sequence: 1,
  proforma_sequence: 1,
  order_sequence: 1,
  delivery_note_sequence: 1,
  dispatch_sequence: 1,
};

export default function EmissionPointsPage({
  params,
}: {
  params: Promise<{ id: string; establishmentId: string }>;
}) {
  const { id: companyId, establishmentId } = use(params);
  const [points, setPoints] = useState<EmissionPoint[]>([]);
  const [open, setOpen] = useState(false);
  const [editingPoint, setEditingPoint] = useState<EmissionPoint | null>(null);
  const [loading, setLoading] = useState(false);
  const [inactivateTarget, setInactivateTarget] = useState<EmissionPoint | null>(null);
  const [inactivating, setInactivating] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  async function refetchPoints() {
    try {
      const res = await fetch(`${API_BASE}/emission-points/establishment/${establishmentId}`, {
        credentials: "include",
      });
      const data = res.ok ? await res.json() : [];
      setPoints(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  }

  const { register, handleSubmit, formState: { errors }, reset } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { code: "001", name: "", ...defaultSequences },
  });

  // Cargar puntos
  useEffect(() => {
    fetch(`${API_BASE}/emission-points/establishment/${establishmentId}`, {
      credentials: "include",
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setPoints(Array.isArray(data) ? data : []))
      .catch((err) => console.error(err));
  }, [establishmentId, open]);

  // Pre-llenar formulario en modo edición y limpiar al cerrar
  useEffect(() => {
    if (open && editingPoint) {
      reset({
        code: editingPoint.code,
        name: editingPoint.name,
        invoice_sequence: editingPoint.invoice_sequence ?? 1,
        proforma_sequence: editingPoint.proforma_sequence ?? 1,
        order_sequence: editingPoint.order_sequence ?? 1,
        delivery_note_sequence: editingPoint.delivery_note_sequence ?? 1,
        dispatch_sequence: editingPoint.dispatch_sequence ?? 1,
      });
    } else if (open && !editingPoint) {
      reset({ code: "001", name: "", ...defaultSequences });
    }
  }, [open, editingPoint, reset]);

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      setEditingPoint(null);
      reset({ code: "001", name: "", ...defaultSequences });
    }
    setOpen(isOpen);
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      const url = editingPoint
        ? `${API_BASE}/emission-points/${editingPoint.id}`
        : `${API_BASE}/emission-points/establishment/${establishmentId}`;
      const method = editingPoint ? "PATCH" : "POST";
      const body = {
        code: values.code,
        name: values.name,
        invoice_sequence: values.invoice_sequence,
        proforma_sequence: values.proforma_sequence,
        order_sequence: values.order_sequence,
        delivery_note_sequence: values.delivery_note_sequence,
        dispatch_sequence: values.dispatch_sequence,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Error al guardar");
      }

      setOpen(false);
      setEditingPoint(null);
      reset({ code: "001", name: "", ...defaultSequences });
      router.refresh();
      toast({
        title: "Éxito",
        description: "Punto de emisión guardado/actualizado correctamente.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al guardar el punto de emisión.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  function openEditDialog(point: EmissionPoint) {
    setEditingPoint(point);
    setOpen(true);
  }

  async function handleInactivate() {
    if (!inactivateTarget) return;
    setInactivating(true);
    try {
      const res = await fetch(`${API_BASE}/emission-points/${inactivateTarget.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Error al inactivar");
      setInactivateTarget(null);
      await refetchPoints();
      router.refresh();
      toast({
        title: "Éxito",
        description: "Punto de emisión inactivado correctamente.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo inactivar el punto de emisión.",
        variant: "destructive",
      });
    } finally {
      setInactivating(false);
    }
  }

  async function handleActivate(point: EmissionPoint) {
    setActivatingId(point.id);
    try {
      const res = await fetch(`${API_BASE}/emission-points/${point.id}/activate`, {
        method: "PATCH",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Error al activar");
      await refetchPoints();
      router.refresh();
      toast({
        title: "Éxito",
        description: "Punto de emisión activado correctamente.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo activar el punto de emisión.",
        variant: "destructive",
      });
    } finally {
      setActivatingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Puntos de Emisión (Cajas)</h1>

        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button>+ Nuevo Punto</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>
                {editingPoint ? "Editar Punto de Emisión" : "Agregar Punto de Emisión"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <div className="grid gap-2">
                <Label>Código (Ej: 001)</Label>
                <Input maxLength={3} {...register("code")} placeholder="001" />
                {errors.code && (
                  <p className="text-red-500 text-xs">{errors.code.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label>Nombre (Ej: Caja Principal)</Label>
                <Input {...register("name")} placeholder="Caja 1" />
                {errors.name && (
                  <p className="text-red-500 text-xs">{errors.name.message}</p>
                )}
              </div>

              <fieldset className="space-y-3 rounded-lg border border-slate-200 p-4">
                <legend className="text-sm font-medium text-slate-700">
                  Configuración de Secuenciales
                </legend>
                <div className="grid gap-2">
                  <Label htmlFor="invoice_sequence">Secuencia Factura</Label>
                  <Input
                    id="invoice_sequence"
                    type="number"
                    min={1}
                    {...register("invoice_sequence")}
                    placeholder="1"
                  />
                  {errors.invoice_sequence && (
                    <p className="text-red-500 text-xs">{errors.invoice_sequence.message}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="proforma_sequence">Secuencia Proforma</Label>
                  <Input
                    id="proforma_sequence"
                    type="number"
                    min={1}
                    {...register("proforma_sequence")}
                    placeholder="1"
                  />
                  {errors.proforma_sequence && (
                    <p className="text-red-500 text-xs">{errors.proforma_sequence.message}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="order_sequence">Secuencia Pedido</Label>
                  <Input
                    id="order_sequence"
                    type="number"
                    min={1}
                    {...register("order_sequence")}
                    placeholder="1"
                  />
                  {errors.order_sequence && (
                    <p className="text-red-500 text-xs">{errors.order_sequence.message}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="delivery_note_sequence">Secuencia Nota de Entrega</Label>
                  <Input
                    id="delivery_note_sequence"
                    type="number"
                    min={1}
                    {...register("delivery_note_sequence")}
                    placeholder="1"
                  />
                  {errors.delivery_note_sequence && (
                    <p className="text-red-500 text-xs">{errors.delivery_note_sequence.message}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dispatch_sequence">Secuencia Despacho</Label>
                  <Input
                    id="dispatch_sequence"
                    type="number"
                    min={1}
                    {...register("dispatch_sequence")}
                    placeholder="1"
                  />
                  {errors.dispatch_sequence && (
                    <p className="text-red-500 text-xs">{errors.dispatch_sequence.message}</p>
                  )}
                </div>
              </fieldset>

              <Button type="submit" disabled={loading}>
                {loading ? "Guardando..." : editingPoint ? "Actualizar" : "Guardar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {(Array.isArray(points) ? points : []).map((point) => {
          const isActive = point.isActive !== false;
          return (
            <Card key={point.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg">{point.code}</CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label="Editar punto de emisión"
                    onClick={() => openEditDialog(point)}
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
                      aria-label="Inactivar punto de emisión"
                      onClick={() => setInactivateTarget(point)}
                    >
                      <Ban className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                      aria-label="Activar punto de emisión"
                      disabled={activatingId === point.id}
                      onClick={() => handleActivate(point)}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{point.name}</p>
                <p className="text-sm text-slate-500">
                  Secuencia Factura: {point.invoice_sequence ?? 1}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!inactivateTarget} onOpenChange={() => setInactivateTarget(null)}>
        <DialogContent className="sm:max-w-[425px]" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>¿Inactivar punto de emisión?</DialogTitle>
            <p className="text-sm text-slate-600">
              ¿Estás seguro de inactivar esta caja? No se eliminará; podrás activarla de nuevo cuando lo necesites.
            </p>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setInactivateTarget(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleInactivate} disabled={inactivating}>
              {inactivating ? "Inactivando..." : "Inactivar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
