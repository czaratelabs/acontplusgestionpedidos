"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { CatalogsContent } from "./catalogs-content";
import { fetchCatalogStrict } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export default function CatalogsSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: companyId } = use(params);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [data, setData] = useState<{
    brands: { id: string; name: string }[];
    categories: { id: string; name: string }[];
    measures: { id: string; name: string }[];
    colors: { id: string; name: string }[];
    sizes: { id: string; name: string }[];
    flavors: { id: string; name: string }[];
  }>({
    brands: [],
    categories: [],
    measures: [],
    colors: [],
    sizes: [],
    flavors: [],
  });
  const router = useRouter();

  const loadData = useCallback(async () => {
    setFetchError(null);
    const fetchers = [
      fetchCatalogStrict(companyId, "brands"),
      fetchCatalogStrict(companyId, "categories"),
      fetchCatalogStrict(companyId, "measures"),
      fetchCatalogStrict(companyId, "colors"),
      fetchCatalogStrict(companyId, "sizes"),
      fetchCatalogStrict(companyId, "flavors"),
    ];
    const results = await Promise.allSettled(fetchers);
    const keys = ["brands", "categories", "measures", "colors", "sizes", "flavors"] as const;
    const next: Record<string, { id: string; name: string }[]> = {};
    let hasRejection = false;
    results.forEach((r, i) => {
      if (r.status === "fulfilled") {
        next[keys[i]] = Array.isArray(r.value) ? r.value : [];
      } else {
        next[keys[i]] = [];
        hasRejection = true;
      }
    });
    setData(next as typeof data);
    if (hasRejection) {
      setFetchError("Algunos catálogos no se pudieron cargar. Comprueba la conexión y vuelve a intentar.");
    }
  }, [companyId]);

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) {
      router.replace(`/dashboard/${companyId}`);
      return;
    }
    try {
      const decoded = jwtDecode<{ role?: string }>(token);
      const role = decoded?.role ?? "seller";
      if (role !== "admin" && role !== "owner" && role?.toUpperCase() !== "SUPER_ADMIN") {
        router.replace(`/dashboard/${companyId}`);
        return;
      }
    } catch {
      router.replace(`/dashboard/${companyId}`);
      return;
    }

    let cancelled = false;
    loadData().finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
    // loadData estable para companyId; omitir de deps evita "array size changed" en React
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, router]);

  const refresh = async () => {
    setLoading(true);
    setFetchError(null);
    await loadData();
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Catálogos de inventario</h1>
          <p className="text-slate-500 text-sm mt-1">
            Gestiona marcas, categorías, medidas, colores, tallas y sabores para usar en artículos.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          Refrescar
        </Button>
      </div>

      {loading && !data.brands.length && !data.categories.length ? (
        <p className="text-slate-500 py-8">Cargando catálogos...</p>
      ) : fetchError ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
          <p className="text-sm">{fetchError}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={refresh}>
            Reintentar
          </Button>
        </div>
      ) : null}

      <CatalogsContent
        companyId={companyId}
        data={data}
        onRefresh={refresh}
        loading={loading}
      />
    </div>
  );
}
