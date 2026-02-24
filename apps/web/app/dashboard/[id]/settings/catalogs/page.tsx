"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { CatalogsContent } from "./catalogs-content";
import { getBrandsClient, getCategoriesClient, getMeasuresClient, getColorsClient, getSizesClient, getFlavorsClient } from "@/lib/api-client";

export default function CatalogsSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: companyId } = use(params);
  const [loading, setLoading] = useState(true);
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
    Promise.all([
      getBrandsClient(companyId),
      getCategoriesClient(companyId),
      getMeasuresClient(companyId),
      getColorsClient(companyId),
      getSizesClient(companyId),
      getFlavorsClient(companyId),
    ]).then(([brands, categories, measures, colors, sizes, flavors]) => {
      if (!cancelled) {
        setData({
          brands: Array.isArray(brands) ? brands : [],
          categories: Array.isArray(categories) ? categories : [],
          measures: Array.isArray(measures) ? measures : [],
          colors: Array.isArray(colors) ? colors : [],
          sizes: Array.isArray(sizes) ? sizes : [],
          flavors: Array.isArray(flavors) ? flavors : [],
        });
      }
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [companyId, router]);

  const refresh = () => {
    Promise.all([
      getBrandsClient(companyId),
      getCategoriesClient(companyId),
      getMeasuresClient(companyId),
      getColorsClient(companyId),
      getSizesClient(companyId),
      getFlavorsClient(companyId),
    ]).then(([brands, categories, measures, colors, sizes, flavors]) => {
      setData({
        brands: Array.isArray(brands) ? brands : [],
        categories: Array.isArray(categories) ? categories : [],
        measures: Array.isArray(measures) ? measures : [],
        colors: Array.isArray(colors) ? colors : [],
        sizes: Array.isArray(sizes) ? sizes : [],
        flavors: Array.isArray(flavors) ? flavors : [],
      });
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Catálogos de inventario</h1>
        <p className="text-slate-500 text-sm mt-1">
          Gestiona marcas, categorías, medidas, colores, tallas y sabores para usar en artículos.
        </p>
      </div>

      {loading ? (
        <p className="text-slate-500 py-8">Cargando catálogos...</p>
      ) : (
        <CatalogsContent companyId={companyId} data={data} onRefresh={refresh} />
      )}
    </div>
  );
}
