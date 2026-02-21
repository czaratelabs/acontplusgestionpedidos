"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

const formSchema = z.object({
  name: z.string().min(2, "Nombre requerido"),
  address: z.string().min(5, "Dirección requerida"),
  phone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  series: z.string().length(3, "Debe tener 3 dígitos (Ej: 001)"),
  logo_url: z.string().optional(),
});

export type Establishment = {
  id: string;
  name: string;
  address: string;
  phone?: string | null;
  email?: string | null;
  series: string;
  logo_url?: string | null;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type LimitInfo = { count: number; limit: number };

type EstablishmentDialogProps = {
  companyId: string;
  initialData?: Establishment | null;
  limitInfo?: LimitInfo;
};

export function EstablishmentDialog({ companyId, initialData = null, limitInfo }: EstablishmentDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const isEditing = Boolean(initialData);
  const limitReached =
    limitInfo && limitInfo.limit >= 0 && limitInfo.count >= limitInfo.limit;

  const { register, handleSubmit, formState: { errors }, reset } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      address: "",
      phone: "",
      email: "",
      series: "001",
      logo_url: "",
    },
  });

  useEffect(() => {
    if (open && initialData) {
      reset({
        name: initialData.name ?? "",
        address: initialData.address ?? "",
        phone: initialData.phone ?? "",
        email: initialData.email ?? "",
        series: initialData.series ?? "001",
        logo_url: initialData.logo_url ?? "",
      });
    } else if (open && !initialData) {
      reset({ name: "", address: "", phone: "", email: "", series: "001", logo_url: "" });
    }
  }, [open, initialData, reset]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    const payload = {
      ...values,
      email: values.email === "" ? undefined : values.email,
      phone: values.phone === "" ? undefined : values.phone,
      logo_url: values.logo_url === "" ? undefined : values.logo_url,
    };

    try {
      const url = initialData
        ? `${API_BASE}/establishments/${initialData.id}?companyId=${encodeURIComponent(companyId)}`
        : `${API_BASE}/establishments/company/${companyId}`;
      const method = initialData ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      const errorData = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(errorData.message || "Error al guardar");
      }

      setOpen(false);
      reset();
      router.refresh();
      toast({
        title: "Éxito",
        description: "Establecimiento guardado correctamente",
        variant: "default",
      });
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "No se pudo guardar los cambios";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {initialData ? (
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Editar establecimiento">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            className="bg-slate-900"
            disabled={limitReached}
            title={limitReached ? "Límite de plan alcanzado" : undefined}
          >
            + Nueva Sucursal
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Establecimiento" : "Registrar Establecimiento"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los datos del establecimiento."
              : "Configura una nueva sucursal o punto de emisión."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Nombre Comercial</Label>
              <Input placeholder="Ej: Casa Matriz" {...register("name")} />
              {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label>Serie (SRI/Facturación)</Label>
              <Input placeholder="001" maxLength={3} {...register("series")} />
              {errors.series && <p className="text-red-500 text-xs">{errors.series.message}</p>}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Dirección Física</Label>
            <Input placeholder="Av. Principal 123..." {...register("address")} />
            {errors.address && <p className="text-red-500 text-xs">{errors.address.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Teléfono</Label>
              <Input placeholder="099..." {...register("phone")} />
            </div>
            <div className="grid gap-2">
              <Label>Email Sucursal</Label>
              <Input placeholder="sucursal1@empresa.com" {...register("email")} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>URL del Logo (Opcional)</Label>
            <Input placeholder="https://..." {...register("logo_url")} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : isEditing ? "Actualizar" : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
