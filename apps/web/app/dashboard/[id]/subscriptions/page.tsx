"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

const LIMIT_LABELS: Record<string, string> = {
  max_total_users: "Usuarios totales máx.",
  max_sellers: "Vendedores máx.",
  max_establishments: "Establecimientos máx.",
  max_warehouses: "Almacenes máx.",
  max_emission_points: "Puntos de emisión máx.",
  max_inventory_items: "Ítems inventario máx.",
  storage_gb: "Almacenamiento (GB)",
};

type Plan = {
  id: string;
  name: string;
  price: string;
  implementationFee: string;
  limits: Record<string, number>;
  modules: Record<string, boolean>;
  isActive: boolean;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function SubscriptionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [formName, setFormName] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formImplementationFee, setFormImplementationFee] = useState("");
  const [formLimits, setFormLimits] = useState<Record<string, number>>({});
  const [formModules, setFormModules] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/subscription-plans`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setPlans(data);
      })
      .catch(() => {
        if (!cancelled) setPlans([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (editingPlan) {
      setFormName(editingPlan.name);
      setFormPrice(editingPlan.price);
      setFormImplementationFee(editingPlan.implementationFee ?? "0");
      setFormLimits({ ...(editingPlan.limits ?? {}) });
      setFormModules({ ...(editingPlan.modules ?? {}) });
    }
  }, [editingPlan]);

  async function handleSave() {
    if (!editingPlan) return;
    const maxTotal = formLimits.max_total_users;
    const maxSellers = formLimits.max_sellers;
    if (
      maxTotal != null &&
      maxSellers != null &&
      maxTotal !== -1 &&
      maxSellers !== -1 &&
      Number(maxSellers) > Number(maxTotal)
    ) {
      toast({
        title: "Error de validación",
        description: "El límite de vendedores no puede ser superior al límite total de usuarios.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/subscription-plans/${editingPlan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          price: parseFloat(formPrice) || 0,
          implementationFee: parseFloat(formImplementationFee) || 0,
          limits: formLimits,
          modules: formModules,
        }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Error al guardar");
      setPlans((prev) =>
        prev.map((p) => (p.id === editingPlan.id ? { ...p, ...data } : p))
      );
      setEditingPlan(null);
      router.refresh();
      toast({
        title: "Plan actualizado",
        description: "Los cambios se han guardado correctamente.",
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

  function formatPrice(s: string) {
    const n = parseFloat(s);
    return isNaN(n) ? "$0" : `$${n.toFixed(0)}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Planes de Suscripción</h1>
        <p className="text-slate-500 text-sm mt-1">
          Configura los planes según el modelo Distribución 360.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Planes disponibles</CardTitle>
          <CardDescription>
            Edita límites y módulos en formato JSON. -1 significa ilimitado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-slate-500 py-8 text-center">Cargando...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Plan</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Fee Impl.</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">{plan.name}</TableCell>
                    <TableCell>{formatPrice(plan.price)}</TableCell>
                    <TableCell>{formatPrice(plan.implementationFee ?? "0")}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          plan.isActive
                            ? "bg-green-100 text-green-800 hover:bg-green-200"
                            : "bg-red-500 text-white hover:bg-red-600"
                        }
                      >
                        {plan.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label="Editar plan"
                        onClick={() => setEditingPlan(plan)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingPlan} onOpenChange={() => setEditingPlan(null)}>
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Plan</DialogTitle>
            <DialogDescription>
              Modifica los detalles del plan. Usa -1 en límites para ilimitado.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="plan-name">Nombre</Label>
                <Input
                  id="plan-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Plan Pyme"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="plan-price">Precio ($)</Label>
                <Input
                  id="plan-price"
                  type="number"
                  min={0}
                  step={0.01}
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  placeholder="45"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="plan-fee">Cargo de implementación ($)</Label>
              <Input
                id="plan-fee"
                type="number"
                min={0}
                step={0.01}
                value={formImplementationFee}
                onChange={(e) => setFormImplementationFee(e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="space-y-3">
              <Label>Límites</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                {Object.entries(LIMIT_LABELS).map(([key, label]) => (
                  <div key={key} className="grid gap-1.5">
                    <Label htmlFor={`limit-${key}`} className="text-sm font-normal text-slate-600">
                      {label}
                    </Label>
                    <Input
                      id={`limit-${key}`}
                      type="number"
                      min={-1}
                      value={formLimits[key] ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setFormLimits((prev) => {
                          const next = { ...prev };
                          if (v === "") delete next[key];
                          else {
                            const num = parseInt(v, 10);
                            if (!isNaN(num)) next[key] = num;
                          }
                          return next;
                        });
                      }}
                      placeholder="-1 = ilimitado"
                      className="max-w-[140px]"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Módulos</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                {Object.entries(MODULE_LABELS).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between gap-3 rounded border border-slate-100 bg-white px-3 py-2">
                    <Label htmlFor={`module-${key}`} className="text-sm font-normal cursor-pointer flex-1">
                      {label}
                    </Label>
                    <Switch
                      id={`module-${key}`}
                      checked={formModules[key] === true}
                      onCheckedChange={(checked) =>
                        setFormModules((prev) => ({ ...prev, [key]: checked }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPlan(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
