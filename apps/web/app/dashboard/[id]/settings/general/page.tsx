"use client";

import { useState, useEffect, use } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { CURRENCY_OPTIONS } from "@/lib/currency";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const SYSTEM_TIMEZONE_KEY = "SYSTEM_TIMEZONE";
const SYSTEM_CURRENCY_KEY = "SYSTEM_CURRENCY";

const TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  { value: "America/Guayaquil", label: "America/Guayaquil (Ecuador)" },
  { value: "America/Bogota", label: "America/Bogota (Colombia)" },
  { value: "America/New_York", label: "America/New_York (EST/EDT)" },
  { value: "Europe/Madrid", label: "Europe/Madrid (España)" },
  { value: "UTC", label: "UTC" },
];

type Company = {
  id: string;
  name: string;
  decimal_precision?: number;
  prevent_negative_stock?: boolean;
};

type Tax = {
  id: string;
  name: string;
  percentage: number;
  code: string | null;
  is_active: boolean;
};

const companyRulesSchema = z.object({
  decimal_precision: z.union([z.literal(2), z.literal(3), z.literal(4)]),
  prevent_negative_stock: z.boolean(),
});

const taxFormSchema = z.object({
  name: z.string().min(2, "Nombre requerido"),
  percentage: z.coerce.number().min(0).max(100),
  code: z.string().optional(),
});

export default function GeneralSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: companyId } = use(params);
  const [company, setCompany] = useState<Company | null>(null);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [savingRules, setSavingRules] = useState(false);
  const [taxDialogOpen, setTaxDialogOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<Tax | null>(null);
  const [taxFormLoading, setTaxFormLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [systemTimezone, setSystemTimezone] = useState<string>("America/Guayaquil");
  const [loadingTimezone, setLoadingTimezone] = useState(true);
  const [savingTimezone, setSavingTimezone] = useState(false);
  const [systemCurrency, setSystemCurrency] = useState<string>("USD");
  const [loadingCurrency, setLoadingCurrency] = useState(true);
  const [savingCurrency, setSavingCurrency] = useState(false);
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
      setUserRole(role);
      if (role !== "admin" && role !== "owner") {
        router.replace(`/dashboard/${companyId}`);
      }
    } catch {
      router.replace(`/dashboard/${companyId}`);
    }
  }, [companyId, router]);

  const isAdminOrOwnerForEffect = userRole === "admin" || userRole === "owner";
  const companyIdStable = companyId ?? "";
  useEffect(() => {
    if (!isAdminOrOwnerForEffect || !companyIdStable) return;
    setLoadingTimezone(true);
    const url = `${API_BASE}/system-settings/${SYSTEM_TIMEZONE_KEY}?companyId=${encodeURIComponent(companyIdStable)}`;
    const controller = new AbortController();
    fetch(url, { credentials: "include", signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { value?: string } | null) => {
        if (data?.value) setSystemTimezone(data.value);
      })
      .catch(() => {})
      .finally(() => setLoadingTimezone(false));
    return () => controller.abort();
  }, [isAdminOrOwnerForEffect, companyIdStable]);

  useEffect(() => {
    if (!isAdminOrOwnerForEffect || !companyIdStable) return;
    setLoadingCurrency(true);
    const url = `${API_BASE}/system-settings/${SYSTEM_CURRENCY_KEY}?companyId=${encodeURIComponent(companyIdStable)}`;
    const controller = new AbortController();
    fetch(url, { credentials: "include", signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { value?: string } | null) => {
        if (data?.value) setSystemCurrency(data.value);
      })
      .catch(() => {})
      .finally(() => setLoadingCurrency(false));
    return () => controller.abort();
  }, [isAdminOrOwnerForEffect, companyIdStable]);

  async function onSaveTimezone(value: string) {
    setSavingTimezone(true);
    try {
      const res = await fetch(`${API_BASE}/system-settings/${SYSTEM_TIMEZONE_KEY}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, value }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Error al guardar");
      setSystemTimezone(value);
      router.refresh();
      toast({
        title: "Éxito",
        description: "Zona horaria actualizada. Los nuevos registros de auditoría usarán esta zona.",
        variant: "default",
      });
    } catch {
      toast({
        title: "Error",
        description: "No se pudo actualizar la zona horaria.",
        variant: "destructive",
      });
    } finally {
      setSavingTimezone(false);
    }
  }

  async function onSaveCurrency(value: string) {
    setSavingCurrency(true);
    try {
      const res = await fetch(`${API_BASE}/system-settings/${SYSTEM_CURRENCY_KEY}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, value }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Error al guardar");
      setSystemCurrency(value);
      router.refresh();
      toast({
        title: "Éxito",
        description: "Moneda principal actualizada. Los precios y totales usarán este formato.",
        variant: "default",
      });
    } catch {
      toast({
        title: "Error",
        description: "No se pudo actualizar la moneda.",
        variant: "destructive",
      });
    } finally {
      setSavingCurrency(false);
    }
  }

  const {
    register: registerRules,
    handleSubmit: handleSubmitRules,
    setValue: setRulesValue,
    watch: watchRules,
    reset: resetRules,
  } = useForm<z.infer<typeof companyRulesSchema>>({
    resolver: zodResolver(companyRulesSchema),
    defaultValues: { decimal_precision: 2, prevent_negative_stock: false },
  });

  const {
    register: registerTax,
    handleSubmit: handleSubmitTax,
    reset: resetTaxForm,
    formState: { errors: taxErrors },
  } = useForm<z.infer<typeof taxFormSchema>>({
    resolver: zodResolver(taxFormSchema),
    defaultValues: { name: "", percentage: 0, code: "" },
  });

  const decimalPrecision = watchRules("decimal_precision");
  const preventNegativeStock = watchRules("prevent_negative_stock");

  async function fetchCompany() {
    try {
      const res = await fetch(`${API_BASE}/companies/${companyId}`, { credentials: "include" });
      if (!res.ok) return;
      const data: Company = await res.json();
      setCompany(data);
      resetRules({
        decimal_precision: (data.decimal_precision ?? 2) as 2 | 3 | 4,
        prevent_negative_stock: data.prevent_negative_stock ?? false,
      });
    } finally {
      setLoadingCompany(false);
    }
  }

  async function fetchTaxes() {
    try {
      const res = await fetch(`${API_BASE}/taxes/company/${companyId}`, { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      setTaxes(data);
    } catch {
      setTaxes([]);
    }
  }

  useEffect(() => {
    fetchCompany();
  }, [companyId]);

  useEffect(() => {
    fetchTaxes();
  }, [companyId, taxDialogOpen]);

  useEffect(() => {
    if (taxDialogOpen && editingTax) {
      resetTaxForm({
        name: editingTax.name,
        percentage: Number(editingTax.percentage),
        code: editingTax.code ?? "",
      });
    } else if (taxDialogOpen && !editingTax) {
      resetTaxForm({ name: "", percentage: 0, code: "" });
    }
  }, [taxDialogOpen, editingTax, resetTaxForm]);

  async function onSaveRules(values: z.infer<typeof companyRulesSchema>) {
    setSavingRules(true);
    try {
      const res = await fetch(`${API_BASE}/companies/${companyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decimal_precision: values.decimal_precision,
          prevent_negative_stock: values.prevent_negative_stock,
        }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Error al guardar");
      setCompany(data);
      router.refresh();
      toast({
        title: "Éxito",
        description: "Reglas actualizadas correctamente.",
        variant: "default",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "No se pudieron guardar las reglas.",
        variant: "destructive",
      });
    } finally {
      setSavingRules(false);
    }
  }

  function openTaxDialog(tax: Tax | null) {
    setEditingTax(tax);
    setTaxDialogOpen(true);
  }

  function closeTaxDialog() {
    setTaxDialogOpen(false);
    setEditingTax(null);
  }

  async function onSaveTax(values: z.infer<typeof taxFormSchema>) {
    setTaxFormLoading(true);
    try {
      const payload = {
        name: values.name.trim(),
        percentage: Number(values.percentage),
        code: values.code?.trim() || undefined,
      };
      const url = editingTax
        ? `${API_BASE}/taxes/${editingTax.id}`
        : `${API_BASE}/taxes/company/${companyId}`;
      const method = editingTax ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Error al guardar");
      closeTaxDialog();
      fetchTaxes();
      router.refresh();
      toast({
        title: "Éxito",
        description: editingTax ? "Impuesto actualizado." : "Impuesto creado.",
        variant: "default",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Error al guardar el impuesto.",
        variant: "destructive",
      });
    } finally {
      setTaxFormLoading(false);
    }
  }

  async function onDeleteTax(taxId: string) {
    if (!confirm("¿Eliminar este impuesto?")) return;
    try {
      const res = await fetch(`${API_BASE}/taxes/${taxId}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Error al eliminar");
      fetchTaxes();
      router.refresh();
      toast({
        title: "Éxito",
        description: "Impuesto eliminado.",
        variant: "default",
      });
    } catch {
      toast({
        title: "Error",
        description: "Error al eliminar el impuesto.",
        variant: "destructive",
      });
    }
  }

  const isAdminOrOwner = userRole === "admin" || userRole === "owner";

  if (userRole === null) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Configuración General</h1>
        <Card><CardContent className="pt-6">Cargando...</CardContent></Card>
      </div>
    );
  }

  if (!isAdminOrOwner) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Configuración General</h1>
        <Card><CardContent className="pt-6">Redirigiendo...</CardContent></Card>
      </div>
    );
  }

  if (loadingCompany) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Configuración General</h1>
        <Card><CardContent className="pt-6">Cargando...</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Configuración General</h1>
        <p className="text-slate-500 text-sm mt-1">
          Reglas del negocio, zona horaria del sistema e impuestos (IVA) de la empresa.
        </p>
      </div>

      {/* Section: System Settings (timezone + currency, solo admin/owner) */}
      {isAdminOrOwner && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Zona Horaria del Sistema</CardTitle>
              <CardDescription>
                Define la zona horaria para los registros de auditoría y fechas del sistema. Los cambios aplican a los nuevos registros sin reiniciar el servidor.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-end gap-4 max-w-md">
                <div className="grid gap-2 flex-1 min-w-[200px]">
                  <Label htmlFor="system-timezone">Zona horaria</Label>
                  <Select
                    value={systemTimezone}
                    onValueChange={(v) => setSystemTimezone(v)}
                    disabled={loadingTimezone}
                  >
                    <SelectTrigger id="system-timezone">
                      <SelectValue placeholder="Seleccione zona horaria" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => onSaveTimezone(systemTimezone)}
                  disabled={loadingTimezone || savingTimezone}
                >
                  {savingTimezone ? "Guardando…" : "Guardar zona horaria"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Moneda Principal</CardTitle>
              <CardDescription>
                Define la moneda para precios, totales y facturación. El formato (símbolo, decimales) se aplicará en toda la aplicación.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-end gap-4 max-w-md">
                <div className="grid gap-2 flex-1 min-w-[200px]">
                  <Label htmlFor="system-currency">Moneda</Label>
                  <Select
                    value={systemCurrency}
                    onValueChange={(v) => setSystemCurrency(v)}
                    disabled={loadingCurrency}
                  >
                    <SelectTrigger id="system-currency">
                      <SelectValue placeholder="Seleccione moneda" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => onSaveCurrency(systemCurrency)}
                  disabled={loadingCurrency || savingCurrency}
                >
                  {savingCurrency ? "Guardando…" : "Guardar moneda"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Section A: Company Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Reglas del Negocio</CardTitle>
          <CardDescription>
            Precisión decimal para precios y política de stock.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitRules(onSaveRules)} className="space-y-6 max-w-md">
            <div className="grid gap-2">
              <Label>Decimales en precios</Label>
              <Select
                value={String(decimalPrecision)}
                onValueChange={(v) => setRulesValue("decimal_precision", Number(v) as 2 | 3 | 4)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 decimales</SelectItem>
                  <SelectItem value="3">3 decimales</SelectItem>
                  <SelectItem value="4">4 decimales</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label htmlFor="prevent-stock">Impedir venta sin stock</Label>
                <p className="text-sm text-slate-500">
                  Si está activo, no se podrá vender si el stock es 0.
                </p>
              </div>
              <Switch
                id="prevent-stock"
                checked={preventNegativeStock}
                onCheckedChange={(checked) => setRulesValue("prevent_negative_stock", checked)}
              />
            </div>
            <Button type="submit" disabled={savingRules}>
              {savingRules ? "Guardando..." : "Guardar reglas"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Section B: Taxes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Impuestos / IVA</CardTitle>
            <CardDescription>
              Gestiona los impuestos aplicables a facturación (ej. IVA 15%, IVA 0%).
            </CardDescription>
          </div>
          <Dialog
            open={taxDialogOpen}
            onOpenChange={(o) => {
              setTaxDialogOpen(o);
              if (!o) setEditingTax(null);
            }}
          >
            <DialogTrigger asChild>
              <Button onClick={() => openTaxDialog(null)}>+ Agregar impuesto</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{editingTax ? "Editar impuesto" : "Agregar impuesto"}</DialogTitle>
                <DialogDescription>
                  Nombre, porcentaje y código (opcional, ej. SRI).
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmitTax(onSaveTax)} className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="tax-name">Nombre</Label>
                  <Input
                    id="tax-name"
                    placeholder="Ej: IVA 15%"
                    {...registerTax("name")}
                  />
                  {taxErrors.name && (
                    <p className="text-red-500 text-xs">{taxErrors.name.message}</p>
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
                    {...registerTax("percentage")}
                  />
                  {taxErrors.percentage && (
                    <p className="text-red-500 text-xs">{taxErrors.percentage.message}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="tax-code">Código (opcional)</Label>
                  <Input
                    id="tax-code"
                    placeholder="Ej: código SRI"
                    {...registerTax("code")}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={taxFormLoading}>
                    {taxFormLoading ? "Guardando..." : editingTax ? "Actualizar" : "Crear"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Porcentaje</TableHead>
                <TableHead>Código</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {taxes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-slate-500">
                    No hay impuestos. Agrega uno con el botón superior.
                  </TableCell>
                </TableRow>
              ) : (
                taxes.map((tax) => (
                  <TableRow key={tax.id}>
                    <TableCell className="font-medium">{tax.name}</TableCell>
                    <TableCell>{Number(tax.percentage)}%</TableCell>
                    <TableCell className="text-slate-500">{tax.code || "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label="Editar impuesto"
                          onClick={() => openTaxDialog(tax)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700"
                          aria-label="Eliminar impuesto"
                          onClick={() => onDeleteTax(tax.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
