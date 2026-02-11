"use client";

import { useState, useEffect, use } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

const formSchema = z.object({
  name: z.string().min(2, "El nombre es requerido (mín. 2 caracteres)"),
  ruc_nit: z.string().min(1, "RUC/NIT requerido"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  logo_url: z.string().url("URL inválida").optional().or(z.literal("")),
});

type CompanyFormValues = z.infer<typeof formSchema>;

type Company = {
  id: string;
  name: string;
  ruc_nit: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  logo_url?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const API_BASE = "http://localhost:3000";

export default function CompanySettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      ruc_nit: "",
      address: "",
      phone: "",
      email: "",
      logo_url: "",
    },
  });

  useEffect(() => {
    let cancelled = false;
    async function fetchCompany() {
      try {
        const res = await fetch(`${API_BASE}/companies/${id}`);
        if (!res.ok) {
          if (!cancelled) setErrorMessage("No se pudo cargar la empresa.");
          return;
        }
        const data: Company = await res.json();
        if (!cancelled) {
          setCompany(data);
          reset({
            name: data.name ?? "",
            ruc_nit: data.ruc_nit ?? "",
            address: data.address ?? "",
            phone: data.phone ?? "",
            email: data.email ?? "",
            logo_url: data.logo_url ?? "",
          });
        }
      } catch {
        if (!cancelled) setErrorMessage("Error de conexión.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchCompany();
    return () => {
      cancelled = true;
    };
  }, [id, reset]);

  async function onSubmit(values: CompanyFormValues) {
    setSaving(true);
    setErrorMessage(null);
    try {
      const payload = {
        name: values.name.trim(),
        address: values.address?.trim() || undefined,
        phone: values.phone?.trim() || undefined,
        email: values.email?.trim() || undefined,
        logo_url: values.logo_url?.trim() || undefined,
      };
      const res = await fetch(`${API_BASE}/companies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Error al guardar");
      }
      setCompany(data);
      router.refresh();
      toast({
        title: "¡Éxito!",
        description: "Los datos de la empresa se han actualizado correctamente.",
        variant: "default",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "No se pudieron guardar los cambios. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Configuración Empresa</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-slate-500">Cargando...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Configuración Empresa</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-500">{errorMessage || "Empresa no encontrada."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuración Empresa</h1>
        <p className="text-slate-500 text-sm mt-1">
          Edita los datos de tu empresa.
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm">
          {errorMessage}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Datos de la empresa</CardTitle>
          <CardDescription>
            Nombre, identificación fiscal y datos de contacto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-xl">
            <div className="grid gap-2">
              <Label htmlFor="name">Nombre (obligatorio)</Label>
              <Input
                id="name"
                placeholder="Razón social"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-red-500 text-xs">{errors.name.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ruc_nit">RUC / NIT</Label>
              <Input
                id="ruc_nit"
                placeholder="1234567890001"
                readOnly
                className="bg-slate-100 cursor-not-allowed"
                {...register("ruc_nit")}
              />
              <p className="text-xs text-slate-500">
                El RUC/NIT no se puede modificar desde esta pantalla.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="address">Dirección</Label>
              <Input
                id="address"
                placeholder="Av. Principal 123..."
                {...register("address")}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  placeholder="02 123 4567"
                  {...register("phone")}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="contacto@empresa.com"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-red-500 text-xs">{errors.email.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="logo_url">URL del logo</Label>
              <Input
                id="logo_url"
                placeholder="https://..."
                {...register("logo_url")}
              />
              {errors.logo_url && (
                <p className="text-red-500 text-xs">{errors.logo_url.message}</p>
              )}
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
