"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const RULE_INVENTORY_PREVENT_NEGATIVE_STOCK = "INVENTORY_PREVENT_NEGATIVE_STOCK";

type BusinessRule = {
  id: string;
  companyId: string;
  ruleKey: string;
  isEnabled: boolean;
  metadata: Record<string, unknown> | null;
};

export default function BusinessRulesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: companyId } = use(params);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preventNegativeStock, setPreventNegativeStock] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) {
      router.replace(`/dashboard/${companyId}`);
      return;
    }
    try {
      const decoded = jwtDecode<{ role?: string }>(token);
      const role = decoded?.role ?? "seller";
      if (role !== "admin" && role !== "owner") {
        router.replace(`/dashboard/${companyId}`);
        return;
      }
    } catch {
      router.replace(`/dashboard/${companyId}`);
      return;
    }

    let cancelled = false;
    fetch(`${API_BASE}/business-rules?companyId=${encodeURIComponent(companyId)}`, {
      credentials: "include",
    })
      .then((res) => {
        if (res.status === 403) {
          toast({
            title: "Acceso denegado",
            description: "Este módulo no está activo en tu plan actual.",
            variant: "destructive",
          });
          router.replace(`/dashboard/${companyId}`);
          return null;
        }
        return res.ok ? res.json() : [];
      })
      .then((data: BusinessRule[] | null) => {
        if (cancelled || data === null) return;
        if (Array.isArray(data)) {
          const rule = data.find((r) => r.ruleKey === RULE_INVENTORY_PREVENT_NEGATIVE_STOCK);
          setPreventNegativeStock(rule?.isEnabled ?? false);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [companyId, router]);

  async function onTogglePreventNegativeStock(checked: boolean) {
    setSaving(true);
    try {
      const res = await fetch(
        `${API_BASE}/business-rules/${companyId}/${RULE_INVENTORY_PREVENT_NEGATIVE_STOCK}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isEnabled: checked }),
          credentials: "include",
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Error al guardar");
      setPreventNegativeStock(checked);
      router.refresh();
      toast({
        title: "Éxito",
        description: "Regla actualizada correctamente.",
        variant: "default",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "No se pudo guardar.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reglas de Negocio</h1>
        <p className="text-slate-500 text-sm mt-1">
          Configura las reglas que aplican a las operaciones de tu empresa.
        </p>
      </div>

      {loading ? (
        <Card>
          <CardContent className="pt-6">Cargando...</CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Inventario</CardTitle>
            <CardDescription>
              Reglas relacionadas con stock e inventario.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="prevent-negative-stock" className="text-base">
                  Impedir Ventas sin Stock
                </Label>
                <p className="text-sm text-slate-500">
                  Si está activo, no se podrá vender un producto si no hay stock
                  suficiente. La venta será rechazada con un mensaje de error.
                </p>
              </div>
              <Switch
                id="prevent-negative-stock"
                checked={preventNegativeStock}
                onCheckedChange={onTogglePreventNegativeStock}
                disabled={saving}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
