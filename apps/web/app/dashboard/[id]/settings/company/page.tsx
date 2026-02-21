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
import { Badge } from "@/components/ui/badge";
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

type Plan = {
  id: string;
  name: string;
  price: string;
  implementationFee?: string;
  limits: Record<string, number>;
  modules: Record<string, boolean>;
};

type Company = {
  id: string;
  name: string;
  ruc_nit: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  logo_url?: string | null;
  is_active: boolean;
  planId?: string | null;
  plan?: Plan | null;
  subscriptionStartDate?: string | null;
  subscriptionEndDate?: string | null;
  subscriptionPeriod?: "monthly" | "annual" | null;
  created_at: string;
  updated_at: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/** Mapa de claves del campo modules (subscription_plans) a etiquetas legibles */
const MODULE_LABELS: Record<string, string> = {
  audit: "Auditoría",
  logistics: "Logística",
  business_rules: "Reglas de negocio",
  sri: "SRI",
  directory_clients: "Directorio de clientes",
  directory_providers: "Directorio de proveedores",
  directory_employees: "Directorio de empleados",
  admin_users_roles: "Usuarios y roles",
  admin_establishments: "Establecimientos",
  admin_company_config: "Configuración de empresa",
  admin_general_config: "Configuración general",
  admin_taxes: "Impuestos",
  admin_audit: "Auditoría (admin)",
  admin_roles: "Roles (admin)",
  admin_business_rules: "Reglas de negocio (admin)",
};

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
        const res = await fetch(`${API_BASE}/companies/${id}`, { credentials: "include" });
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

  const currentPlan = company?.plan ?? null;

  async function onSubmit(values: CompanyFormValues) {
    setSaving(true);
    setErrorMessage(null);
    try {
      const payload: Record<string, unknown> = {
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
        credentials: "include",
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
          <CardTitle>Plan de Suscripción</CardTitle>
          <CardDescription>
            Plan asignado a esta empresa (solo lectura). Para modificar el plan contacte al administrador del sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentPlan ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-base font-semibold text-slate-800">{currentPlan.name}</p>
                <span className="text-sm font-medium text-slate-600">
                  ${parseFloat(currentPlan.price || "0").toLocaleString("es")}/mes
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm border-t border-slate-200 pt-4">
                {company.subscriptionStartDate && (
                  <div>
                    <p className="text-slate-500 font-medium">Inicio suscripción</p>
                    <p className="text-slate-800">{new Date(company.subscriptionStartDate).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" })}</p>
                  </div>
                )}
                {company.subscriptionEndDate && (
                  <div>
                    <p className="text-slate-500 font-medium">Fin suscripción</p>
                    <p className="text-slate-800">{new Date(company.subscriptionEndDate).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" })}</p>
                  </div>
                )}
                {company.subscriptionPeriod && (
                  <div>
                    <p className="text-slate-500 font-medium">Periodo</p>
                    <p className="text-slate-800">{company.subscriptionPeriod === "annual" ? "Anual" : company.subscriptionPeriod === "monthly" ? "Mensual" : "-"}</p>
                  </div>
                )}
                {currentPlan.implementationFee && parseFloat(currentPlan.implementationFee) > 0 && (
                  <div>
                    <p className="text-slate-500 font-medium">Cuota de implementación</p>
                    <p className="text-slate-800">${parseFloat(currentPlan.implementationFee || "0").toLocaleString("es")}</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm font-medium text-slate-600 mb-2">Límites y módulos del plan</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                {currentPlan.limits && typeof currentPlan.limits === "object" && (
                  <>
                    {currentPlan.limits.max_total_users != null && (
                      <div className="text-slate-600">Usuarios totales: <span className="font-medium">{currentPlan.limits.max_total_users === -1 ? "Ilimitado" : currentPlan.limits.max_total_users}</span></div>
                    )}
                    {currentPlan.limits.max_sellers != null && (
                      <div className="text-slate-600">Vendedores: <span className="font-medium">{currentPlan.limits.max_sellers === -1 ? "Ilimitado" : currentPlan.limits.max_sellers}</span></div>
                    )}
                    {currentPlan.limits.max_establishments != null && (
                      <div className="text-slate-600">Establecimientos: <span className="font-medium">{currentPlan.limits.max_establishments === -1 ? "Ilimitado" : currentPlan.limits.max_establishments}</span></div>
                    )}
                    {currentPlan.limits.max_warehouses != null && (
                      <div className="text-slate-600">Almacenes: <span className="font-medium">{currentPlan.limits.max_warehouses === -1 ? "Ilimitado" : currentPlan.limits.max_warehouses}</span></div>
                    )}
                    {currentPlan.limits.max_emission_points != null && (
                      <div className="text-slate-600">Puntos de emisión: <span className="font-medium">{currentPlan.limits.max_emission_points === -1 ? "Ilimitado" : currentPlan.limits.max_emission_points}</span></div>
                    )}
                    {currentPlan.limits.max_inventory_items != null && (
                      <div className="text-slate-600">Ítems inventario: <span className="font-medium">{currentPlan.limits.max_inventory_items === -1 ? "Ilimitado" : currentPlan.limits.max_inventory_items}</span></div>
                    )}
                    {currentPlan.limits.storage_gb != null && (
                      <div className="text-slate-600">Almacenamiento: <span className="font-medium">{currentPlan.limits.storage_gb} GB</span></div>
                    )}
                  </>
                )}
                {currentPlan.modules && typeof currentPlan.modules === "object" && Object.keys(currentPlan.modules).length > 0 && (
                  <>
                    {Object.entries(currentPlan.modules).map(([key, enabled]) => (
                      <div key={key}>
                        <Badge
                          variant="secondary"
                          className={enabled === true ? "bg-green-100 text-green-800" : "bg-slate-200 text-slate-600"}
                        >
                          {MODULE_LABELS[key] ?? key.replace(/_/g, " ")}: {enabled ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                    ))}
                  </>
                )}
              </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/50 p-6 text-center">
              <p className="text-slate-500 text-sm">Esta empresa no tiene un plan asignado.</p>
              <p className="text-slate-400 text-xs mt-1">Contacte al administrador para asignar un plan.</p>
            </div>
          )}
        </CardContent>
      </Card>

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
            <p className="text-xs text-slate-500">
              Solo se actualizan los datos de la empresa. El plan de suscripción no se puede modificar aquí.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
