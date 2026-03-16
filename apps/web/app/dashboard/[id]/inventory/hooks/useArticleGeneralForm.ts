"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { CatalogItem } from "@/lib/api-client";
import {
  type Batch,
  type PricesRow,
  type VariantRow,
  type ArticleFormCategory as Category,
  type ArticleFormTax as Tax,
} from "@/lib/types/article.types";
import { formatDecimal } from "@/lib/cost-iva";
import { roundToFive } from "@/lib/math.util";
import { apiFetch, apiGet } from "@/lib/api-client";
import { TARIFAS_KEYS, emptyPrices } from "@/lib/types/article.types";

const TARIFF_NAMES_KEY = "TARIFF_NAMES";
const TARIFF_PROFITABILITY_KEY = "TARIFF_PROFITABILITY";
const DEFAULT_TARIFF_LABELS: Record<string, string> = {
  "1": "Tarifa 1",
  "2": "Tarifa 2",
  "3": "Tarifa 3",
  "4": "Tarifa 4",
  "5": "Tarifa 5",
};

type AdditionalBarcode = { barcode: string; description: string };
type FractionConfig = { fraction_name: string; conversion_factor: string };

function recalculateRentabilidadFromPrices(
  cost: number,
  ivaPct: number,
  prices: PricesRow
): PricesRow {
  const costNum = roundToFive(cost, 5);
  const costIncIva = ivaPct !== 0 ? roundToFive(costNum * (1 + ivaPct / 100), 5) : costNum;
  const result = { ...prices } as Record<string, string>;
  for (const key of TARIFAS_KEYS) {
    const precioVentaNum = parseFloat(String(prices[`precioVenta${key}` as keyof PricesRow] ?? "")) || 0;
    if (precioVentaNum > 0 && costNum > 0) {
      const pv = roundToFive(precioVentaNum, 5);
      const pctRent = roundToFive(((pv - costNum) / costNum) * 100, 5);
      const valorRent = roundToFive(pv - costNum, 5);
      const pvpNum = parseFloat(String(prices[`pvp${key}` as keyof PricesRow] ?? "")) || 0;
      const pvp = roundToFive(pvpNum > 0 ? pvpNum : pv * (1 + ivaPct / 100), 5);
      const valorRentIncIva = roundToFive(pvp - costIncIva, 5);
      result[`porcentajeRentabilidad${key}`] = formatDecimal(pctRent);
      result[`rentabilidad${key}`] = formatDecimal(valorRent);
      result[`rentabilidadIncIva${key}`] = formatDecimal(valorRentIncIva);
    } else {
      result[`porcentajeRentabilidad${key}`] = "0";
      result[`rentabilidad${key}`] = "0";
      result[`rentabilidadIncIva${key}`] = "0";
    }
  }
  return result as PricesRow;
}

export type GeneralFormInitialData = {
  id: string;
  code?: string | null;
  name: string;
  observations?: string | null;
  brandId?: string | null;
  categoryId?: string | null;
  taxId?: string | null;
  variants?: Array<Record<string, unknown>>;
} | null;

export type SaveGeneralResult = {
  id: string;
  variants: VariantRow[];
  variantsWithBatches: Array<{ id: string; sku: string; batches: Batch[] }>;
} | null;

export type UseArticleGeneralFormParams = {
  companyId: string;
  taxes: Tax[];
  initialData: GeneralFormInitialData;
  brands: CatalogItem[];
  categories: CatalogItem[];
  measures: CatalogItem[];
  colors: CatalogItem[];
  sizes: CatalogItem[];
  flavors: CatalogItem[];
  onRequestNew?: () => void;
  setVariantsRef: React.MutableRefObject<React.Dispatch<React.SetStateAction<VariantRow[]>> | undefined>;
  toast: (opts: { title: string; description?: string; variant?: "default" | "destructive" }) => void;
  open: boolean;
};

export function useArticleGeneralForm({
  companyId,
  taxes,
  initialData,
  brands,
  categories,
  measures,
  colors,
  sizes,
  flavors,
  onRequestNew,
  setVariantsRef,
  toast,
  open,
}: UseArticleGeneralFormParams) {
  const setVariants = (arg: React.SetStateAction<VariantRow[]>) => setVariantsRef.current?.(arg);
  const router = useRouter();

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [observations, setObservations] = useState("");
  const [brandId, setBrandId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [taxId, setTaxId] = useState("");
  const [savedArticleId, setSavedArticleId] = useState<string | null>(null);
  const [categorySecuencialInfo, setCategorySecuencialInfo] = useState<{
    secuencial: number;
    secuencialVariantes: number;
  } | null>(null);
  const [generalTabEditMode, setGeneralTabEditMode] = useState(false);
  const [generalDataSnapshot, setGeneralDataSnapshot] = useState<{
    code: string;
    name: string;
    observations: string;
    brandId: string;
    categoryId: string;
    taxId: string;
  } | null>(null);
  const [localBrands, setLocalBrands] = useState<CatalogItem[]>(brands);
  const [localCategories, setLocalCategories] = useState<CatalogItem[]>(categories);
  const [localMeasures, setLocalMeasures] = useState<CatalogItem[]>(measures);
  const [localColors, setLocalColors] = useState<CatalogItem[]>(colors);
  const [localSizes, setLocalSizes] = useState<CatalogItem[]>(sizes);
  const [localFlavors, setLocalFlavors] = useState<CatalogItem[]>(flavors);
  const [tariffLabels, setTariffLabels] = useState<Record<string, string>>({ ...DEFAULT_TARIFF_LABELS });
  const [profitabilityConfig, setProfitabilityConfig] = useState<{
    defaultPercentages: Record<string, number>;
    profiles: Array<{ name?: string; categoryIds: string[]; percentages: Record<string, number> }>;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const effectiveArticleId = initialData?.id ?? savedArticleId ?? null;
  const isEditing = Boolean(initialData) || Boolean(savedArticleId);
  const generalFieldsDisabled = Boolean(effectiveArticleId) && !generalTabEditMode;

  const activeProfileName = profitabilityConfig
    ? categoryId
      ? (() => {
          const p = profitabilityConfig.profiles.find((prof) => prof.categoryIds.includes(categoryId));
          return p ? (p.name || "Sin nombre") : "Por defecto";
        })()
      : "Por defecto"
    : "";

  const { canSaveGeneral, validationMessageGeneral } = useMemo(() => {
    const ok =
      Boolean(categoryId?.trim()) &&
      Boolean(code?.trim()) &&
      Boolean(name?.trim()) &&
      Boolean(taxId?.trim());
    let msg = "";
    if (!ok) {
      if (!categoryId?.trim()) msg = "Seleccione Categoría.";
      else if (!code?.trim()) msg = "El Código Maestro es obligatorio.";
      else if (!name?.trim()) msg = "El Nombre base es obligatorio.";
      else msg = "Seleccione IVA.";
    }
    return { canSaveGeneral: ok, validationMessageGeneral: msg };
  }, [categoryId, code, name, taxId]);

  const isGeneralDirty = useMemo(() => {
    if (generalDataSnapshot == null) return false;
    return (
      code !== generalDataSnapshot.code ||
      name !== generalDataSnapshot.name ||
      observations !== generalDataSnapshot.observations ||
      brandId !== generalDataSnapshot.brandId ||
      categoryId !== generalDataSnapshot.categoryId ||
      taxId !== generalDataSnapshot.taxId
    );
  }, [generalDataSnapshot, code, name, observations, brandId, categoryId, taxId]);

  useEffect(() => {
    setLocalBrands(brands);
    setLocalCategories(categories);
    setLocalMeasures(measures);
    setLocalColors(colors);
    setLocalSizes(sizes);
    setLocalFlavors(flavors);
  }, [brands, categories, measures, colors, sizes, flavors]);

  useEffect(() => {
    if (!open || !companyId) return;
    const controller = new AbortController();
    apiGet<{ value?: string }>(`/system-settings/${TARIFF_NAMES_KEY}?companyId=${encodeURIComponent(companyId)}`, {
      signal: controller.signal,
    })
      .then((data) => {
        if (data?.value) {
          try {
            const parsed = JSON.parse(data.value) as Record<string, string>;
            if (parsed && typeof parsed === "object")
              setTariffLabels({ ...DEFAULT_TARIFF_LABELS, ...parsed });
          } catch {
            /* usar defaults */
          }
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [open, companyId]);

  useEffect(() => {
    if (!open || !companyId) return;
    const controller = new AbortController();
    apiGet<{ value?: string }>(`/system-settings/${TARIFF_PROFITABILITY_KEY}?companyId=${encodeURIComponent(companyId)}`, {
      signal: controller.signal,
    })
      .then((data) => {
        if (data?.value) {
          try {
            const parsed = JSON.parse(data.value) as {
              defaultPercentages?: Record<string, number>;
              profiles?: Array<{ name?: string; categoryIds?: string[]; percentages?: Record<string, number> }>;
            };
            if (parsed) {
              const defaultPct = (parsed.defaultPercentages ?? {}) as Record<string, number>;
              const profiles = (parsed.profiles ?? []).map((p) => ({
                name: typeof p.name === "string" ? p.name : "",
                categoryIds: Array.isArray(p.categoryIds) ? p.categoryIds : [],
                percentages: (p.percentages ?? {}) as Record<string, number>,
              }));
              setProfitabilityConfig({ defaultPercentages: defaultPct, profiles });
            }
          } catch {
            /* usar defaults */
          }
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [open, companyId]);

  function mapApiVariantsToState(apiVariants: Array<Record<string, unknown>>): VariantRow[] {
    return apiVariants.map((vr) => {
      const p = (vr.prices as Record<string, number>[])?.[0];
      const costNum = Number(vr.cost ?? 0);
      const ivaPct = taxId ? (taxes.find((t) => t.id === taxId)?.percentage ?? 0) : 0;
      const pricesBase: PricesRow = {
        precioVenta1: formatDecimal(p?.precioVenta1 ?? 0),
        precioVenta2: formatDecimal(p?.precioVenta2 ?? 0),
        precioVenta3: formatDecimal(p?.precioVenta3 ?? 0),
        precioVenta4: formatDecimal(p?.precioVenta4 ?? 0),
        precioVenta5: formatDecimal(p?.precioVenta5 ?? 0),
        pvp1: formatDecimal(p?.pvp1 ?? 0),
        pvp2: formatDecimal(p?.pvp2 ?? 0),
        pvp3: formatDecimal(p?.pvp3 ?? 0),
        pvp4: formatDecimal(p?.pvp4 ?? 0),
        pvp5: formatDecimal(p?.pvp5 ?? 0),
        porcentajeRentabilidad1: "0",
        porcentajeRentabilidad2: "0",
        porcentajeRentabilidad3: "0",
        porcentajeRentabilidad4: "0",
        porcentajeRentabilidad5: "0",
        rentabilidad1: p?.rentabilidad1 != null ? formatDecimal(p.rentabilidad1) : "0",
        rentabilidad2: p?.rentabilidad2 != null ? formatDecimal(p.rentabilidad2) : "0",
        rentabilidad3: p?.rentabilidad3 != null ? formatDecimal(p.rentabilidad3) : "0",
        rentabilidad4: p?.rentabilidad4 != null ? formatDecimal(p.rentabilidad4) : "0",
        rentabilidad5: p?.rentabilidad5 != null ? formatDecimal(p.rentabilidad5) : "0",
        rentabilidadIncIva1: "0",
        rentabilidadIncIva2: "0",
        rentabilidadIncIva3: "0",
        rentabilidadIncIva4: "0",
        rentabilidadIncIva5: "0",
      };
      const prices = recalculateRentabilidadFromPrices(costNum, ivaPct, pricesBase);
      const barcodesRaw = vr.barcodes as Array<{ barcode?: string; description?: string | null }> | undefined;
      const additionalBarcodes: AdditionalBarcode[] = Array.isArray(barcodesRaw)
        ? barcodesRaw.map((b) => ({ barcode: String(b.barcode ?? ""), description: String(b.description ?? "") }))
        : [];
      const fractionEnabled = Boolean((vr as Record<string, unknown>).fractionEnabled);
      const fractionsRaw = (vr as Record<string, unknown>).fractions as FractionConfig[] | undefined;
      const fractions: FractionConfig[] = Array.isArray(fractionsRaw)
        ? fractionsRaw.map((f) => ({ fraction_name: String(f?.fraction_name ?? ""), conversion_factor: String(f?.conversion_factor ?? "") }))
        : [];
      return {
        id: vr.id as string,
        sku: String(vr.sku ?? ""),
        barcode: String(vr.barcode ?? ""),
        additionalBarcodes,
        cost: formatDecimal(Number(vr.cost) || 0),
        colorId: String(vr.colorId ?? ""),
        sizeId: String(vr.sizeId ?? ""),
        flavorId: String(vr.flavorId ?? ""),
        measureId: String(vr.measureId ?? ""),
        weight: String(vr.weight ?? 0),
        observations: String(vr.observations ?? ""),
        prices,
        fractionEnabled,
        fractions,
        fractionPrices: emptyPrices(),
      };
    });
  }

  async function applyCategoryCodes(catId: string) {
    let cat = localCategories.find((c) => c.id === catId) as Category | undefined;
    const hasSeqVar = (cat as Category & { secuencialVariantes?: number })?.secuencialVariantes != null || (cat as Category)?.secuencial_variantes != null;
    const needsFetch = !(cat as Category & { siglas?: string })?.siglas && (cat as Category)?.secuencial == null && !hasSeqVar;
    if (needsFetch) {
      try {
        const res = await apiFetch(
          `/articles/catalogs/company/${companyId}/categories/${catId}`,
          { credentials: "include" }
        );
        if (res.ok) {
          const data = await res.json();
          cat = data;
          setLocalCategories((prev) => {
            const idx = prev.findIndex((c) => c.id === catId);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = { ...next[idx], ...data };
              return next;
            }
            return [...prev, data];
          });
        }
      } catch {
        /* ignorar */
      }
    }
    const siglas = (cat as Category & { siglas?: string })?.siglas?.trim();
    const secuencial = (cat as Category)?.secuencial;
    const secuencialVariantes = (cat as Category & { secuencialVariantes?: number })?.secuencialVariantes ?? (cat as Category)?.secuencial_variantes;
    if (secuencial != null && secuencialVariantes != null) {
      setCategorySecuencialInfo({ secuencial, secuencialVariantes });
    }
    if (siglas != null && secuencial != null && secuencialVariantes != null && !isEditing) {
      setCode(siglas + String(secuencial));
      const baseVariante = siglas + String(secuencialVariantes);
      setVariants((prev) => {
        const next = [...prev];
        if (next[0]) {
          next[0] = {
            ...next[0],
            sku: "SKU" + baseVariante,
            barcode: "CB" + baseVariante,
          };
        }
        return next;
      });
    }
  }

  function handleCategoryChange(newCategoryId: string) {
    setCategoryId(newCategoryId);
    if (!newCategoryId) {
      setCategorySecuencialInfo(null);
      return;
    }
    applyCategoryCodes(newCategoryId);
  }

  function handleTaxChange(newTaxId: string) {
    setTaxId(newTaxId);
  }

  function cancelGeneralEdit() {
    if (generalDataSnapshot == null) return;
    setCode(generalDataSnapshot.code);
    setName(generalDataSnapshot.name);
    setObservations(generalDataSnapshot.observations);
    setBrandId(generalDataSnapshot.brandId);
    setCategoryId(generalDataSnapshot.categoryId);
    setTaxId(generalDataSnapshot.taxId);
    setGeneralTabEditMode(false);
    toast({ title: "Cambios descartados", description: "Se han restaurado los datos originales." });
  }

  async function saveGeneralArticleData(): Promise<SaveGeneralResult> {
    if (!canSaveGeneral) {
      toast({
        title: "Datos incompletos",
        description: validationMessageGeneral || "Complete Categoría, Código maestro, Nombre base e IVA.",
        variant: "destructive",
      });
      return null;
    }
    const payload = {
      categoryId: categoryId.trim(),
      code: code.trim(),
      name: name.trim(),
      taxId: taxId.trim(),
      brandId: brandId || null,
      observations: observations.trim() || null,
    };
    setLoading(true);
    try {
      if (effectiveArticleId) {
        const res = await apiFetch(
          `/articles/${effectiveArticleId}/general?companyId=${encodeURIComponent(companyId)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            credentials: "include",
          }
        );
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        if (!res.ok) throw new Error(data.message ?? "Error al actualizar");
        setGeneralDataSnapshot({
          code: code.trim(),
          name: name.trim(),
          observations: observations.trim(),
          brandId: brandId || "",
          categoryId: categoryId || "",
          taxId: taxId || "",
        });
        setGeneralTabEditMode(false);
        router.refresh();
        toast({ title: "Datos generales actualizados", description: "Los datos se han guardado correctamente." });
        return null;
      }
      const res = await apiFetch(`/articles/company/${companyId}/general`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as {
        id?: string;
        variants?: Array<Record<string, unknown>>;
        message?: string;
      };
      if (!res.ok) throw new Error(data.message ?? "Error al guardar");
      if (data?.id && Array.isArray(data.variants)) {
        setSavedArticleId(data.id);
        setGeneralDataSnapshot({
          code: code.trim(),
          name: name.trim(),
          observations: observations.trim(),
          brandId: brandId || "",
          categoryId: categoryId || "",
          taxId: taxId || "",
        });
        const variantsMapped = mapApiVariantsToState(data.variants);
        const variantsWithBatches = data.variants.map((v: Record<string, unknown>) => ({
          id: String(v.id ?? ""),
          sku: String(v.sku ?? ""),
          batches: (Array.isArray(v.batches) ? v.batches : []) as Batch[],
        }));
        router.refresh();
        toast({ title: "Artículo creado", description: "Los datos se han guardado correctamente." });
        return {
          id: data.id,
          variants: variantsMapped,
          variantsWithBatches,
        };
      }
      return null;
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "No se pudo guardar.",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }

  function performResetToNew() {
    setSavedArticleId(null);
    setCategorySecuencialInfo(null);
    setCode("");
    setName("");
    setObservations("");
    setBrandId("");
    setCategoryId("");
    setTaxId("");
    setGeneralDataSnapshot({
      code: "",
      name: "",
      observations: "",
      brandId: "",
      categoryId: "",
      taxId: "",
    });
    setGeneralTabEditMode(false);
    onRequestNew?.();
  }

  function loadInitialGeneral(data: GeneralFormInitialData) {
    if (data) {
      setSavedArticleId(null);
      setCode(data.code ?? "");
      setName(data.name);
      setObservations(data.observations ?? "");
      setBrandId(data.brandId ?? "");
      setCategoryId(data.categoryId ?? "");
      setTaxId(data.taxId ?? "");
      setGeneralDataSnapshot({
        code: data.code ?? "",
        name: data.name,
        observations: data.observations ?? "",
        brandId: data.brandId ?? "",
        categoryId: data.categoryId ?? "",
        taxId: data.taxId ?? "",
      });
      setGeneralTabEditMode(false);
    } else {
      setSavedArticleId(null);
      setCategorySecuencialInfo(null);
      setCode("");
      setName("");
      setObservations("");
      setBrandId("");
      setCategoryId("");
      setTaxId("");
      setGeneralDataSnapshot({
        code: "",
        name: "",
        observations: "",
        brandId: "",
        categoryId: "",
        taxId: "",
      });
      setGeneralTabEditMode(false);
    }
  }

  return {
    code,
    setCode,
    name,
    setName,
    observations,
    setObservations,
    brandId,
    setBrandId,
    categoryId,
    setCategoryId,
    taxId,
    setTaxId,
    generalDataSnapshot,
    setGeneralDataSnapshot,
    generalTabEditMode,
    setGeneralTabEditMode,
    savedArticleId,
    setSavedArticleId,
    categorySecuencialInfo,
    setCategorySecuencialInfo,
    localBrands,
    setLocalBrands,
    localCategories,
    setLocalCategories,
    localMeasures,
    setLocalMeasures,
    localColors,
    setLocalColors,
    localSizes,
    setLocalSizes,
    localFlavors,
    setLocalFlavors,
    profitabilityConfig,
    setProfitabilityConfig,
    tariffLabels,
    setTariffLabels,
    loading,
    effectiveArticleId,
    isEditing,
    generalFieldsDisabled,
    canSaveGeneral,
    validationMessageGeneral,
    isGeneralDirty,
    activeProfileName,
    handleCategoryChange,
    handleTaxChange,
    cancelGeneralEdit,
    saveGeneralArticleData,
    performResetToNew,
    loadInitialGeneral,
    applyCategoryCodes,
  };
}
