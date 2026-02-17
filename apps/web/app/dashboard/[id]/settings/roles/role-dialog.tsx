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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

export type RoleForDialog = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const formSchema = z.object({
  name: z.string().min(1, "El nombre del rol es requerido"),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type RoleDialogProps = {
  companyId: string;
  initialData?: RoleForDialog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function RoleDialog({
  companyId,
  initialData = null,
  open,
  onOpenChange,
  onSuccess,
}: RoleDialogProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const isEditing = Boolean(initialData);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  useEffect(() => {
    if (open && initialData) {
      reset({
        name: initialData.name ?? "",
        description: initialData.description ?? "",
      });
    } else if (open && !initialData) {
      reset({
        name: "",
        description: "",
      });
    }
  }, [open, initialData, reset]);

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const payload = {
        name: values.name.trim(),
        description: values.description?.trim() || null,
        isActive: true,
        companyId: isEditing ? undefined : companyId,
      };

      const url = initialData
        ? `${API_BASE}/roles/${initialData.id}`
        : `${API_BASE}/roles`;
      const method = initialData ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(initialData ? { name: payload.name, description: payload.description } : payload),
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Error al guardar");
      }

      onOpenChange(false);
      reset();
      router.refresh();
      onSuccess?.();
      toast({
        title: "Éxito",
        description: initialData ? "Rol actualizado correctamente." : "Rol creado correctamente.",
        variant: "default",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al guardar el rol.",
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
          <DialogTitle>{isEditing ? "Editar Rol" : "Nuevo Rol"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los datos del rol."
              : "Crea un rol personalizado para esta empresa. Usa nombres descriptivos (ej: Logística, Contador)."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="role-name">Nombre del Rol</Label>
            <Input
              id="role-name"
              placeholder="Ej: Logística, Contador, Vendedor"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-red-500 text-xs">{errors.name.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="role-description">Descripción</Label>
            <Textarea
              id="role-description"
              placeholder="Descripción opcional del rol y sus responsabilidades..."
              rows={3}
              className="resize-none"
              {...register("description")}
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
              {loading ? "Guardando..." : isEditing ? "Actualizar" : "Crear Rol"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
