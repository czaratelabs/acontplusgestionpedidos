"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Trash2, X } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const TARIFF_NAMES_KEY = "TARIFF_NAMES";
const TARIFF_PROFITABILITY_KEY = "TARIFF_PROFITABILITY";

const DEFAULT_TARIFF_NAMES: Record<string, string> = {
  "1": "Tarifa 1",
  "2": "Tarifa 2",
  "3": "Tarifa 3",
  "4": "Tarifa 4",
  "5": "Tarifa 5",
};

const DEFAULT_PERCENTAGES: Record<string, number> = {
  "1": 0,
  "2": 0,
  "3": 0,
  "4": 0,
  "5": 0,
};

type ProfitabilityProfile = {
  id: string;
  name: string;
  percentages: Record<string, number>;
  categoryIds: string[];
};

type TariffProfitabilityConfig = {
  defaultPercentages: Record<string, number>;
  profiles: ProfitabilityProfile[];
};

const emptyProfile = (): ProfitabilityProfile => ({
  id: crypto.randomUUID(),
  name: "",
  percentages: { ...DEFAULT_PERCENTAGES },
  categoryIds: [],
});

type Category = { id: string; name: string };

export default function TariffsSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: companyId } = use(params);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [tariffNames, setTariffNames] = useState<Record<string, string>>({ ...DEFAULT_TARIFF_NAMES });
  const [loadingTariffNames, setLoadingTariffNames] = useState(true);
  const [savingTariffNames, setSavingTariffNames] = useState(false);

  const [defaultPercentages, setDefaultPercentages] = useState<Record<string, number>>({ ...DEFAULT_PERCENTAGES });
  const [profiles, setProfiles] = useState<ProfitabilityProfile[]>([]);
  const [loadingProfitability, setLoadingProfitability] = useState(true);
  const [savingProfitability, setSavingProfitability] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
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
    setLoadingTariffNames(true);
    const url = `${API_BASE}/system-settings/${TARIFF_NAMES_KEY}?companyId=${encodeURIComponent(companyIdStable)}`;
    const controller = new AbortController();
    fetch(url, { credentials: "include", signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { value?: string } | null) => {
        if (data?.value) {
          try {
            const parsed = JSON.parse(data.value) as Record<string, string>;
            if (parsed && typeof parsed === "object")
              setTariffNames({ ...DEFAULT_TARIFF_NAMES, ...parsed });
          } catch {
            /* usar defaults */
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoadingTariffNames(false));
    return () => controller.abort();
  }, [isAdminOrOwnerForEffect, companyIdStable]);

  useEffect(() => {
    if (!isAdminOrOwnerForEffect || !companyIdStable) return;
    setLoadingProfitability(true);
    const url = `${API_BASE}/system-settings/${TARIFF_PROFITABILITY_KEY}?companyId=${encodeURIComponent(companyIdStable)}`;
    const controller = new AbortController();
    fetch(url, { credentials: "include", signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { value?: string } | null) => {
        if (data?.value) {
          try {
            const parsed = JSON.parse(data.value) as TariffProfitabilityConfig;
            if (parsed?.defaultPercentages && typeof parsed.defaultPercentages === "object")
              setDefaultPercentages({ ...DEFAULT_PERCENTAGES, ...parsed.defaultPercentages });
            if (Array.isArray(parsed.profiles))
              setProfiles(parsed.profiles.map((p) => ({ id: p.id ?? crypto.randomUUID(), name: p.name ?? "", percentages: { ...DEFAULT_PERCENTAGES, ...(p.percentages ?? {}) }, categoryIds: Array.isArray(p.categoryIds) ? [...p.categoryIds] : [] })));
          } catch {
            /* usar defaults */
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoadingProfitability(false));
    return () => controller.abort();
  }, [isAdminOrOwnerForEffect, companyIdStable]);

  useEffect(() => {
    if (!companyIdStable) return;
    fetch(`${API_BASE}/articles/catalogs/company/${companyIdStable}/categories`, {
      credentials: "include",
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]));
  }, [companyIdStable]);

  async function onSaveTariffNames() {
    setSavingTariffNames(true);
    try {
      const payload = { ...DEFAULT_TARIFF_NAMES, ...tariffNames };
      const value = JSON.stringify(payload);
      const res = await fetch(`${API_BASE}/system-settings/${TARIFF_NAMES_KEY}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, value }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Error al guardar");
      router.refresh();
      toast({
        title: "Éxito",
        description: "Nombres de tarifas guardados.",
        variant: "default",
      });
    } catch {
      toast({
        title: "Error",
        description: "Error al guardar los nombres de tarifas.",
        variant: "destructive",
      });
    } finally {
      setSavingTariffNames(false);
    }
  }

  async function onSaveProfitability() {
    setSavingProfitability(true);
    try {
      const config: TariffProfitabilityConfig = {
        defaultPercentages: { ...DEFAULT_PERCENTAGES, ...defaultPercentages },
        profiles: profiles.map((p) => ({
          id: p.id,
          name: p.name.trim(),
          percentages: { ...DEFAULT_PERCENTAGES, ...p.percentages },
          categoryIds: [...p.categoryIds],
        })),
      };
      const value = JSON.stringify(config);
      const res = await fetch(`${API_BASE}/system-settings/${TARIFF_PROFITABILITY_KEY}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, value }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Error al guardar");
      router.refresh();
      toast({
        title: "Éxito",
        description: "Porcentajes de rentabilidad guardados.",
        variant: "default",
      });
    } catch {
      toast({
        title: "Error",
        description: "Error al guardar los porcentajes de rentabilidad.",
        variant: "destructive",
      });
    } finally {
      setSavingProfitability(false);
    }
  }

  function addProfile() {
    setProfiles((prev) => [...prev, emptyProfile()]);
  }

  function removeProfile(index: number) {
    setProfiles((prev) => prev.filter((_, i) => i !== index));
  }

  function updateProfile(index: number, updates: Partial<ProfitabilityProfile>) {
    setProfiles((prev) => {
      const next = [...prev];
      const curr = next[index];
      if (!curr) return prev;
      next[index] = { ...curr, ...updates };
      return next;
    });
  }

  function toggleCategoryInProfile(profileIndex: number, categoryId: string) {
    setProfiles((prev) => {
      const next = [...prev];
      const curr = next[profileIndex];
      if (!curr) return prev;
      const ids = curr.categoryIds.includes(categoryId)
        ? curr.categoryIds.filter((id) => id !== categoryId)
        : [...curr.categoryIds, categoryId];
      next[profileIndex] = { ...curr, categoryIds: ids };
      return next;
    });
  }

  const isAdminOrOwner = userRole === "admin" || userRole === "owner";

  if (userRole === null) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Tarifas de venta</h1>
        <Card><CardContent className="pt-6">Cargando...</CardContent></Card>
      </div>
    );
  }

  if (!isAdminOrOwner) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Tarifas de venta</h1>
        <Card><CardContent className="pt-6">Redirigiendo...</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Tarifas de venta</h1>
        <p className="text-slate-500 text-sm mt-1">
          Etiquetas, porcentajes por defecto y perfiles de rentabilidad por categoría para el grid de precios.
        </p>
      </div>

      {isAdminOrOwner && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Nombres de tarifas</CardTitle>
              <CardDescription>
                Personaliza los nombres de cada tarifa que aparecen en el grid de precios de artículos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 max-w-3xl">
                {[1, 2, 3, 4, 5].map((key) => (
                  <div key={key} className="grid gap-1.5">
                    <Label htmlFor={`tariff-${key}`} className="text-xs">Tarifa {key}</Label>
                    <Input
                      id={`tariff-${key}`}
                      value={tariffNames[String(key)] ?? ""}
                      onChange={(e) =>
                        setTariffNames((prev) => ({ ...prev, [String(key)]: e.target.value }))
                      }
                      placeholder={DEFAULT_TARIFF_NAMES[String(key)]}
                      disabled={loadingTariffNames}
                      className="h-8"
                    />
                  </div>
                ))}
              </div>
              <Button
                onClick={onSaveTariffNames}
                disabled={loadingTariffNames || savingTariffNames}
                className="mt-4"
              >
                {savingTariffNames ? "Guardando..." : "Guardar nombres de tarifas"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Porcentajes de rentabilidad por defecto</CardTitle>
              <CardDescription>
                Usados cuando la categoría del artículo no tiene ningún perfil asignado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 max-w-3xl">
                {[1, 2, 3, 4, 5].map((key) => (
                  <div key={key} className="grid gap-1.5">
                    <Label htmlFor={`default-pct-${key}`} className="text-xs">{tariffNames[String(key)] ?? `Tarifa ${key}`} (%)</Label>
                    <Input
                      id={`default-pct-${key}`}
                      type="number"
                      min={-100}
                      step={0.01}
                      value={defaultPercentages[String(key)] ?? 0}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        setDefaultPercentages((prev) => ({ ...prev, [String(key)]: isNaN(v) ? 0 : v }));
                      }}
                      disabled={loadingProfitability}
                      className="h-8"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Perfiles de rentabilidad</CardTitle>
                  <CardDescription>
                    Asigna porcentajes por tarifa y vincúlalos a una o más categorías. Las categorías sin perfil usan los porcentajes por defecto.
                  </CardDescription>
                </div>
                <Button onClick={addProfile} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" /> Añadir perfil
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {profiles.length === 0 ? (
                <p className="text-slate-500 text-sm py-4">
                  No hay perfiles. Haz clic en &quot;Añadir perfil&quot; para crear uno.
                </p>
              ) : (
                profiles.map((profile, idx) => (
                  <div
                    key={profile.id}
                    className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-4"
                  >
                    <div className="flex justify-between items-center gap-4">
                      <div className="grid gap-1.5 flex-1 max-w-[200px]">
                        <Label className="text-xs">Nombre del perfil</Label>
                        <Input
                          value={profile.name}
                          onChange={(e) => updateProfile(idx, { name: e.target.value })}
                          placeholder="Ej: Electrónica, Alimentos"
                          className="h-8"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeProfile(idx)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                      {[1, 2, 3, 4, 5].map((key) => (
                        <div key={key} className="grid gap-1.5">
                          <Label className="text-xs">{tariffNames[String(key)] ?? `T${key}`} (%)</Label>
                          <Input
                            type="number"
                            min={-100}
                            step={0.01}
                            value={profile.percentages[String(key)] ?? 0}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              const pct = { ...profile.percentages, [String(key)]: isNaN(v) ? 0 : v };
                              updateProfile(idx, { percentages: pct });
                            }}
                            className="h-8"
                          />
                        </div>
                      ))}
                    </div>
                    <div>
                      <Label className="text-xs mb-2 block">Categorías asignadas</Label>
                      <div className="flex flex-wrap gap-2">
                        {categories.length === 0 ? (
                          <span className="text-slate-400 text-sm">No hay categorías. Configúralas en Catálogos.</span>
                        ) : (
                          categories.map((cat) => (
                            <label
                              key={cat.id}
                              className="flex items-center gap-1.5 cursor-pointer rounded-full border px-2.5 py-1 text-xs transition-colors hover:bg-slate-100"
                            >
                              <input
                                type="checkbox"
                                checked={profile.categoryIds.includes(cat.id)}
                                onChange={() => toggleCategoryInProfile(idx, cat.id)}
                                className="rounded border-slate-300"
                              />
                              <span>{cat.name}</span>
                            </label>
                          ))
                        )}
                      </div>
                      {profile.categoryIds.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {profile.categoryIds.map((cid) => {
                            const cat = categories.find((c) => c.id === cid);
                            return cat ? (
                              <Badge key={cid} variant="secondary" className="gap-1">
                                {cat.name}
                                <button
                                  type="button"
                                  onClick={() => toggleCategoryInProfile(idx, cid)}
                                  className="hover:bg-slate-300 rounded-full p-0.5"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              <Button
                onClick={onSaveProfitability}
                disabled={loadingProfitability || savingProfitability}
                className="mt-2"
              >
                {savingProfitability ? "Guardando..." : "Guardar porcentajes y perfiles"}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
