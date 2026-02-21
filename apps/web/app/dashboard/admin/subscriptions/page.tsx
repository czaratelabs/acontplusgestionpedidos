"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Link2, RefreshCw } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";

/** Mapa de claves de módulos a etiquetas legibles */
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

/** Mapa de claves de límites a etiquetas legibles */
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

type Company = {
  id: string;
  name: string;
  ruc_nit: string;
  planId: string | null;
  plan: Plan | null;
  subscriptionStartDate: string | null;
  subscriptionEndDate: string | null;
  subscriptionPeriod: "monthly" | "annual" | null;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function formatDate(s: string | null): string {
  if (!s) return "-";
  const d = new Date(s);
  return isNaN(d.getTime()) ? "-" : d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function isExpired(endDate: string | null): boolean {
  if (!endDate) return false;
  return new Date(endDate) < new Date();
}

export default function AdminSubscriptionsPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [formName, setFormName] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formImplementationFee, setFormImplementationFee] = useState("");
  const [formLimits, setFormLimits] = useState<Record<string, number>>({});
  const [formModules, setFormModules] = useState<Record<string, boolean>>({});
  const [formIsActive, setFormIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [renewCompany, setRenewCompany] = useState<Company | null>(null);
  const [assignCompanyId, setAssignCompanyId] = useState("");
  const [assignPlanId, setAssignPlanId] = useState("");
  const [assignStartDate, setAssignStartDate] = useState("");
  const [assignEndDate, setAssignEndDate] = useState("");
  const [assignPeriod, setAssignPeriod] = useState<"monthly" | "annual">("monthly");
  const [assignSaving, setAssignSaving] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`${API_BASE}/subscription-plans`, { credentials: "include" }).then((res) => (res.ok ? res.json() : [])),
      fetch(`${API_BASE}/companies`, { credentials: "include" }).then((res) => (res.ok ? res.json() : [])),
    ]).then(([plansData, companiesData]) => {
      if (!cancelled) {
        setPlans(Array.isArray(plansData) ? plansData : []);
        setCompanies(Array.isArray(companiesData) ? companiesData : []);
      }
    }).catch(() => {
      if (!cancelled) setPlans([]), setCompanies([]);
    }).finally(() => {
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
      setFormIsActive(editingPlan.isActive ?? true);
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
          isActive: formIsActive,
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

  function openAssign() {
    const today = new Date().toISOString().slice(0, 10);
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setAssignCompanyId("");
    setAssignPlanId("");
    setAssignStartDate(today);
    setAssignEndDate(nextMonth.toISOString().slice(0, 10));
    setAssignPeriod("monthly");
    setAssignOpen(true);
  }

  function openRenew(company: Company) {
    setRenewCompany(company);
    const today = new Date().toISOString().slice(0, 10);
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setAssignPlanId(company.planId ?? "");
    setAssignStartDate(today);
    setAssignEndDate(nextMonth.toISOString().slice(0, 10));
    setAssignPeriod("monthly");
  }

  function handlePeriodChange(value: string) {
    const period = value as "monthly" | "annual";
    setAssignPeriod(period);
    const start = assignStartDate ? new Date(assignStartDate) : new Date();
    const end = new Date(start);
    if (period === "annual") end.setFullYear(end.getFullYear() + 1);
    else end.setMonth(end.getMonth() + 1);
    setAssignEndDate(end.toISOString().slice(0, 10));
  }

  async function handleAssignOrRenew() {
    const companyId = renewCompany?.id ?? assignCompanyId;
    if (!companyId || !assignPlanId || !assignStartDate || !assignEndDate) {
      toast({ title: "Datos incompletos", description: "Completa empresa, plan, fecha inicio y fin.", variant: "destructive" });
      return;
    }
    if (new Date(assignEndDate) <= new Date(assignStartDate)) {
      toast({ title: "Fechas inválidas", description: "La fecha fin debe ser posterior a la de inicio.", variant: "destructive" });
      return;
    }
    setAssignSaving(true);
    try {
      const res = await fetch(`${API_BASE}/companies/${companyId}/subscription`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: assignPlanId,
          startDate: assignStartDate,
          endDate: assignEndDate,
          period: assignPeriod,
        }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Error al guardar");
      setCompanies((prev) =>
        prev.map((c) =>
          c.id === companyId
            ? {
                ...c,
                planId: assignPlanId,
                plan: plans.find((p) => p.id === assignPlanId) ?? c.plan,
                subscriptionStartDate: assignStartDate,
                subscriptionEndDate: assignEndDate,
                subscriptionPeriod: assignPeriod,
              }
            : c
        )
      );
      setAssignOpen(false);
      setRenewCompany(null);
      router.refresh();
      toast({ title: renewCompany ? "Suscripción renovada" : "Plan asignado", description: "Los cambios se han guardado.", variant: "default" });
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "No se pudo guardar.", variant: "destructive" });
    } finally {
      setAssignSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Planes de Suscripción</h1>
        <p className="text-slate-500 text-sm mt-1">
          Administración global de planes. Edita límites y módulos según el modelo Distribución 360.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Vincular plan a empresa</CardTitle>
            <CardDescription>
              Asigna un plan a una empresa con fechas de inicio y fin. Indica si es mensual o anual.
            </CardDescription>
          </div>
          <Button onClick={openAssign}>
            <Link2 className="h-4 w-4 mr-2" />
            Vincular plan
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Empresa</TableHead>
                  <TableHead>RUC/NIT</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Inicio</TableHead>
                  <TableHead>Fin</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-slate-500 py-8">
                      No hay empresas. Vincule un plan para comenzar.
                    </TableCell>
                  </TableRow>
                ) : (
                  companies.map((c) => {
                    const expired = isExpired(c.subscriptionEndDate);
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="font-mono text-sm">{c.ruc_nit}</TableCell>
                        <TableCell>{c.plan?.name ?? "-"}</TableCell>
                        <TableCell>
                          {c.subscriptionPeriod === "annual" ? "Anual" : c.subscriptionPeriod === "monthly" ? "Mensual" : "-"}
                        </TableCell>
                        <TableCell>{formatDate(c.subscriptionStartDate)}</TableCell>
                        <TableCell>{formatDate(c.subscriptionEndDate)}</TableCell>
                        <TableCell>
                          {!c.planId ? (
                            <Badge variant="outline" className="text-slate-500">Sin plan</Badge>
                          ) : expired ? (
                            <Badge className="bg-red-500 text-white hover:bg-red-600">Caducado</Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Activo</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant={expired ? "default" : "outline"}
                            size="sm"
                            className={expired ? "bg-amber-600 hover:bg-amber-700" : ""}
                            onClick={() => openRenew(c)}
                          >
                            <RefreshCw className="h-3.5 w-3.5 mr-1" />
                            {expired ? "Renovar" : "Modificar"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

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
            <div className="flex items-center gap-2">
              <Switch
                id="plan-active"
                checked={formIsActive}
                onCheckedChange={setFormIsActive}
              />
              <Label htmlFor="plan-active">Plan activo</Label>
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

      <Dialog
        open={assignOpen || !!renewCompany}
        onOpenChange={(open) => {
          if (!open) setAssignOpen(false), setRenewCompany(null);
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{renewCompany ? "Renovar suscripción" : "Vincular plan a empresa"}</DialogTitle>
            <DialogDescription>
              {renewCompany
                ? "Selecciona el plan, tipo de período (mensual o anual) y las nuevas fechas de inicio y fin."
                : "Selecciona la empresa, el plan, tipo de período y las fechas de suscripción."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {!renewCompany && (
              <div className="grid gap-2">
                <Label>Empresa</Label>
                <Select value={assignCompanyId} onValueChange={setAssignCompanyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.ruc_nit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-2">
              <Label>Plan</Label>
              <Select value={assignPlanId} onValueChange={setAssignPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.filter((p) => p.isActive).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} - {formatPrice(p.price)}/mes
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Tipo de plan</Label>
              <Select value={assignPeriod} onValueChange={handlePeriodChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensual</SelectItem>
                  <SelectItem value="annual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="start-date">Fecha inicio</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={assignStartDate}
                  onChange={(e) => setAssignStartDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end-date">Fecha fin</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={assignEndDate}
                  onChange={(e) => setAssignEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAssignOpen(false); setRenewCompany(null); }}>
              Cancelar
            </Button>
            <Button onClick={handleAssignOrRenew} disabled={assignSaving}>
              {assignSaving ? "Guardando..." : renewCompany ? "Renovar" : "Vincular"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
