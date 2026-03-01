"use client";

import { useState, useEffect, use, useMemo } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { CURRENCY_OPTIONS } from "@/lib/currency";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const SYSTEM_TIMEZONE_KEY = "SYSTEM_TIMEZONE";
const SYSTEM_CURRENCY_KEY = "SYSTEM_CURRENCY";
const SYSTEM_DATE_FORMAT_KEY = "SYSTEM_DATE_FORMAT";

const TIMEZONE_RAW: { value: string; key: string }[] = [
  { value: "America/Guayaquil", key: "Guayaquil" },
  { value: "America/Bogota", key: "Bogota" },
  { value: "America/New_York", key: "NewYork" },
  { value: "Europe/Madrid", key: "Madrid" },
  { value: "UTC", key: "UTC" },
];

export default function GeneralSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: companyId } = use(params);

  const DATE_FORMAT_OPTIONS = useMemo(
    () => [
      { value: "DD/MM/YYYY", label: "DD/MM/AAAA" },
      { value: "YYYY-MM-DD", label: "AAAA-MM-DD" },
      { value: "MM/DD/YYYY", label: "MM/DD/AAAA" },
      { value: "DD de MMM, YYYY", label: "DD de MMM, AAAA" },
    ],
    []
  );

  const TIMEZONE_LABELS: Record<string, string> = {
    Guayaquil: "Guayaquil",
    Bogota: "Bogotá",
    NewYork: "Nueva York",
    Madrid: "Madrid",
    UTC: "UTC",
  };
  const TIMEZONE_OPTIONS = useMemo(
    () => TIMEZONE_RAW.map((opt) => ({ value: opt.value, label: TIMEZONE_LABELS[opt.key] ?? opt.value })),
    []
  );

  const CURRENCY_OPTIONS_TRANSLATED = CURRENCY_OPTIONS;

  const [userRole, setUserRole] = useState<string | null>(null);
  const [systemTimezone, setSystemTimezone] = useState<string>("America/Guayaquil");
  const [loadingTimezone, setLoadingTimezone] = useState(true);
  const [savingTimezone, setSavingTimezone] = useState(false);
  const [systemCurrency, setSystemCurrency] = useState<string>("USD");
  const [loadingCurrency, setLoadingCurrency] = useState(true);
  const [savingCurrency, setSavingCurrency] = useState(false);
  const [systemDateFormat, setSystemDateFormat] = useState<string>("DD/MM/YYYY");
  const [loadingDateFormat, setLoadingDateFormat] = useState(true);
  const [savingDateFormat, setSavingDateFormat] = useState(false);
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

  useEffect(() => {
    if (!isAdminOrOwnerForEffect || !companyIdStable) return;
    setLoadingDateFormat(true);
    const url = `${API_BASE}/system-settings/${SYSTEM_DATE_FORMAT_KEY}?companyId=${encodeURIComponent(companyIdStable)}`;
    const controller = new AbortController();
    fetch(url, { credentials: "include", signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { value?: string } | null) => {
        if (data?.value) setSystemDateFormat(data.value);
      })
      .catch(() => {})
      .finally(() => setLoadingDateFormat(false));
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
        description: "Zona horaria guardada.",
        variant: "default",
      });
    } catch {
      toast({
        title: "Error",
        description: "Error al guardar la zona horaria.",
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
        description: "Moneda guardada.",
        variant: "default",
      });
    } catch {
      toast({
        title: "Error",
        description: "Error al guardar la moneda.",
        variant: "destructive",
      });
    } finally {
      setSavingCurrency(false);
    }
  }

  async function onSaveDateFormat(value: string) {
    setSavingDateFormat(true);
    try {
      const res = await fetch(`${API_BASE}/system-settings/${SYSTEM_DATE_FORMAT_KEY}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, value }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Error al guardar");
      setSystemDateFormat(value);
      router.refresh();
      toast({
        title: "Éxito",
        description: "Formato de fecha guardado.",
        variant: "default",
      });
    } catch {
      toast({
        title: "Error",
        description: "Error al guardar el formato de fecha.",
        variant: "destructive",
      });
    } finally {
      setSavingDateFormat(false);
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Configuración General</h1>
        <p className="text-slate-500 text-sm mt-1">
          Ajustes generales del sistema para tu empresa.
        </p>
      </div>

      {isAdminOrOwner && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Zona horaria</CardTitle>
              <CardDescription>
                Zona horaria para fechas y horas del sistema.
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
                      <SelectValue placeholder="Seleccionar zona horaria" />
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
                  {savingTimezone ? "Guardando..." : "Guardar zona horaria"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Moneda</CardTitle>
              <CardDescription>
                Moneda por defecto para importes.
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
                      <SelectValue placeholder="Seleccionar moneda" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCY_OPTIONS_TRANSLATED.map((opt) => (
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
                  {savingCurrency ? "Guardando..." : "Guardar moneda"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Formato de fecha</CardTitle>
              <CardDescription>
                Formato de visualización de fechas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-4 max-w-2xl">
                <div className="grid gap-2 flex-1 min-w-0">
                  <Label htmlFor="system-dateformat">Formato de fecha</Label>
                  <Select
                    value={systemDateFormat}
                    onValueChange={(v) => setSystemDateFormat(v)}
                    disabled={loadingDateFormat}
                  >
                    <SelectTrigger id="system-dateformat">
                      <SelectValue placeholder="Seleccionar formato" />
                    </SelectTrigger>
                    <SelectContent>
                      {DATE_FORMAT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => onSaveDateFormat(systemDateFormat)}
                  disabled={loadingDateFormat || savingDateFormat}
                >
                  {savingDateFormat ? "Guardando..." : "Guardar formato"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
