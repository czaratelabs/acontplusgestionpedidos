"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const formSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  percentage: z.coerce.number().min(0, "Mínimo 0").max(100, "Máximo 100"),
  code: z.string().min(1, "El código SRI es requerido para facturación electrónica"),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

export type TaxForDialog = {
  id: string;
  name: string;
  percentage: number;
  code: string | null;
  is_active: boolean;
};

type TaxDialogProps = {
  companyId: string;
  initialData?: TaxForDialog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function TaxDialog({
  companyId,
  initialData = null,
  open,
  onOpenChange,
  onSuccess,
}: TaxDialogProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const isEditing = Boolean(initialData);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      percentage: 0,
      code: "",
      is_active: true,
    },
  });

  const isActive = watch("is_active");

  useEffect(() => {
    if (open && initialData) {
      reset({
        name: initialData.name ?? "",
        percentage: Number(initialData.percentage) ?? 0,
        code: initialData.code ?? "",
        is_active: initialData.is_active ?? true,
      });
    } else if (open && !initialData) {
      reset({
        name: "",
        percentage: 0,
        code: "",
        is_active: true,
      });
    }
  }, [open, initialData, reset]);

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const payload = {
        name: values.name.trim(),
        percentage: Number(values.percentage),
        code: values.code.trim(),
        is_active: values.is_active,
      };

      const url = initialData
        ? `${API_BASE}/taxes/${initialData.id}`
        : `${API_BASE}/taxes/company/${companyId}`;
      const method = initialData ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Error al guardar");

      onOpenChange(false);
      reset();
      router.refresh();
      onSuccess?.();
      toast({
        title: "Éxito",
        description: initialData ? "Impuesto actualizado." : "Impuesto creado.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al guardar el impuesto.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar impuesto" : "Nuevo impuesto"}</DialogTitle>
          <DialogDescription>
            Configura los datos del impuesto para facturación electrónica (SRI).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="tax-name">Nombre</Label>
            <Input id="tax-name" placeholder="Ej: IVA 15%" {...register("name")} />
            {errors.name && (
              <p className="text-red-500 text-xs">{errors.name.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tax-percentage">Porcentaje (%)</Label>
            <Input
              id="tax-percentage"
              type="number"
              step="0.01"
              min={0}
              max={100}
              placeholder="15"
              {...register("percentage")}
            />
            {errors.percentage && (
              <p className="text-red-500 text-xs">{errors.percentage.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tax-code">Codigo SRI</Label>
            <Input
              id="tax-code"
              placeholder="Ej: 2, 3 (obligatorio para facturación electrónica)"
              {...register("code")}
            />
            {errors.code && (
              <p className="text-red-500 text-xs">{errors.code.message}</p>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label htmlFor="tax-active">Activo</Label>
              <p className="text-sm text-slate-500">
                Los impuestos inactivos no se mostrarán en facturación.
              </p>
            </div>
            <Switch
              id="tax-active"
              checked={isActive}
              onCheckedChange={(v) => setValue("is_active", v)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : isEditing ? "Actualizar" : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
