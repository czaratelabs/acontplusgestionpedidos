"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  type VariantRow,
  type PricesRow,
  type Batch,
  type FractionConfig,
  type AdditionalBarcode,
  TARIFAS_KEYS,
  emptyPrices,
  emptyVariant,
} from "@/lib/types/article.types";
import type { ArticleFormTax as Tax } from "@/lib/types/article.types";
import type { ArticleFormCategory as Category } from "@/lib/types/article.types";
import { formatDecimal, costToCostIncIva, costIncIvaToCost } from "@/lib/cost-iva";
import { roundToFive } from "@/lib/math.util";
import { apiFetch, apiPost, apiPatch } from "@/lib/api-client";
import { safeParseVariantAtIndex } from "@/lib/validations/article.schema";

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

export type VariantsWithBatchesItem = { id: string; sku: string; batches: Batch[] };

export type LoadInitialVariantsPayload = {
  variants: VariantRow[];
  variantsWithBatches: VariantsWithBatchesItem[];
  articleId?: string;
} | null;

export type UseVariantFormParams = {
  companyId: string;
  taxId: string;
  taxes: Tax[];
  effectiveArticleId: string | null;
  canSaveGeneral: boolean;
  validationMessageGeneral: string;
  toast: (opts: { title: string; description?: string; variant?: "default" | "destructive" }) => void;
  localCategories: Array<{ id: string; name: string }>;
  categoryId: string;
  profitabilityConfig: {
    defaultPercentages: Record<string, number>;
    profiles: Array<{ name?: string; categoryIds: string[]; percentages: Record<string, number> }>;
  } | null;
  applyCategoryCodes: (catId: string) => Promise<void>;
  setVariantsRef?: React.MutableRefObject<React.Dispatch<React.SetStateAction<VariantRow[]>> | undefined>;
};

export function useVariantForm({
  companyId,
  taxId,
  taxes,
  effectiveArticleId: effectiveArticleIdParam,
  canSaveGeneral,
  validationMessageGeneral,
  toast,
  localCategories,
  categoryId,
  profitabilityConfig,
  applyCategoryCodes,
  setVariantsRef,
}: UseVariantFormParams) {
  const router = useRouter();
  const [effectiveArticleIdState, setEffectiveArticleIdState] = useState<string | null>(effectiveArticleIdParam);

  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [editingVariantIndex, setEditingVariantIndex] = useState<number | null>(null);
  const [expandedVariantIndex, setExpandedVariantIndex] = useState<number | null>(null);
  const [originalVariantSnapshot, setOriginalVariantSnapshot] = useState<VariantRow | null>(null);
  const [additionalBarcodeInputByIndex, setAdditionalBarcodeInputByIndex] = useState<Record<number, string>>({});
  const [editingBarcodeDescription, setEditingBarcodeDescription] = useState<{
    variantIndex: number;
    barcodeIndex: number;
  } | null>(null);
  const [variantsWithBatches, setVariantsWithBatches] = useState<VariantsWithBatchesItem[]>([]);
  const [loading, setLoading] = useState(false);

  const isVariantFormOpen = editingVariantIndex !== null;
  const isVariantsDirty = editingVariantIndex !== null && (() => {
    if (originalVariantSnapshot == null || editingVariantIndex === null) return false;
    const current = variants[editingVariantIndex];
    if (!current) return false;
    return JSON.stringify(current) !== JSON.stringify(originalVariantSnapshot);
  })();

  const { canSave, validationMessage } = useMemo(() => {
    const atLeastOneVariantOk = variants.some((v) => {
      const skuOk = Boolean(v.sku?.trim());
      const barcodeOk = Boolean(v.barcode?.trim());
      const costNum = parseFloat(String(v.cost)) || 0;
      const costOk = costNum > 0;
      const costIncIvaVal = v.costIncIva != null ? String(v.costIncIva).trim() : "";
      const costIncIvaOk = costIncIvaVal !== "" || (costNum > 0 && Boolean(taxId?.trim()));
      const measureOk = Boolean(v.measureId?.trim());
      return skuOk && barcodeOk && costOk && costIncIvaOk && measureOk;
    });
    const can = canSaveGeneral && atLeastOneVariantOk;
    let message = validationMessageGeneral;
    if (message) return { canSave: can, validationMessage: message };
    if (!atLeastOneVariantOk)
      message =
        "Complete al menos una variante: SKU, Código de barras, Costo SIN IVA, Costo INC IVA y Medida.";
    return { canSave: can, validationMessage: message };
  }, [canSaveGeneral, validationMessageGeneral, taxId, variants]);

  const effectiveArticleId = effectiveArticleIdState;
  const canAddVariant = effectiveArticleId != null && editingVariantIndex === null;

  useEffect(() => {
    setEffectiveArticleIdState(effectiveArticleIdParam);
  }, [effectiveArticleIdParam]);

  useEffect(() => {
    if (setVariantsRef) {
      setVariantsRef.current = setVariants;
      return () => {
        setVariantsRef.current = undefined;
      };
    }
  }, [setVariants, setVariantsRef]);

  function isVariantDirty(index: number): boolean {
    if (originalVariantSnapshot == null || editingVariantIndex !== index) return false;
    const current = variants[index];
    if (!current) return false;
    return JSON.stringify(current) !== JSON.stringify(originalVariantSnapshot);
  }

  function startEditVariant(index: number) {
    const v = variants[index];
    if (!v) return;
    setOriginalVariantSnapshot(JSON.parse(JSON.stringify(v)));
    setEditingVariantIndex(index);
    setExpandedVariantIndex(index);
  }

  function cancelEditVariant() {
    if (editingVariantIndex == null) return;
    if (originalVariantSnapshot) {
      setVariants((prev) => {
        const next = [...prev];
        next[editingVariantIndex] = originalVariantSnapshot;
        return next;
      });
    } else {
      removeVariant(editingVariantIndex);
    }
    setEditingVariantIndex(null);
    setOriginalVariantSnapshot(null);
    setExpandedVariantIndex(null);
  }

  function buildSingleVariantPayload(index: number) {
    const vr = variants[index];
    if (!vr) return null;
    const p = vr.prices;
    const barcodes = (vr.additionalBarcodes ?? [])
      .filter((b) => (b.barcode ?? "").trim() !== "")
      .map((b) => ({ barcode: b.barcode.trim(), description: (b.description ?? "").trim() || undefined }));
    return {
      sku: vr.sku.trim(),
      barcode: vr.barcode?.trim() || null,
      barcodes: barcodes.length > 0 ? barcodes : undefined,
      cost: parseFloat(vr.cost) || 0,
      colorId: vr.colorId?.trim() || null,
      sizeId: vr.sizeId?.trim() || null,
      flavorId: vr.flavorId?.trim() || null,
      measureId: vr.measureId?.trim() || null,
      stockActual: 0,
      stockMin: 0,
      weight: parseFloat(vr.weight) || 0,
      observations: vr.observations?.trim() || null,
      prices: {
        precioVenta1: parseFloat(p.precioVenta1) || 0,
        precioVenta2: parseFloat(p.precioVenta2) || 0,
        precioVenta3: parseFloat(p.precioVenta3) || 0,
        precioVenta4: parseFloat(p.precioVenta4) || 0,
        precioVenta5: parseFloat(p.precioVenta5) || 0,
        pvp1: parseFloat(p.pvp1) || 0,
        pvp2: parseFloat(p.pvp2) || 0,
        pvp3: parseFloat(p.pvp3) || 0,
        pvp4: parseFloat(p.pvp4) || 0,
        pvp5: parseFloat(p.pvp5) || 0,
      },
    };
  }

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

  async function saveSingleVariant(index: number) {
    if (!effectiveArticleId) return;
    const v = variants[index];
    if (!v) return;
    const parsed = safeParseVariantAtIndex(variants, index);
    if (!parsed.success) {
      toast({ title: "Datos incompletos", description: parsed.error, variant: "destructive" });
      return;
    }
    const payload = buildSingleVariantPayload(index);
    if (!payload) return;
    const isNew = !v.id;
    const hasChanges = isNew || isVariantDirty(index);
    if (!hasChanges) return;

    setLoading(true);
    try {
      const data = isNew
        ? await apiPost<{ variants?: Array<{ id: string; sku: string; batches?: Batch[] }>; message?: string }>(
            `/articles/${effectiveArticleId}/variants?companyId=${encodeURIComponent(companyId)}`,
            payload
          )
        : await apiPatch<{ variants?: Array<{ id: string; sku: string; batches?: Batch[] }>; message?: string }>(
            `/articles/variants/${v.id}?companyId=${encodeURIComponent(companyId)}`,
            payload
          );

      const allVariants = data?.variants ?? [];
      setVariantsWithBatches(
        (allVariants as VariantsWithBatchesItem[]).map((vr) => ({
          id: vr.id,
          sku: vr.sku,
          batches: vr.batches ?? [],
        }))
      );
      setVariants(
        (allVariants as Array<Record<string, unknown>>).length > 0
          ? mapApiVariantsToState(allVariants as Array<Record<string, unknown>>)
          : []
      );
      setOriginalVariantSnapshot(null);
      setEditingVariantIndex(null);
      setExpandedVariantIndex(null);
      router.refresh();
      toast({ title: isNew ? "Variante creada" : "Variante actualizada", description: "Los datos se han guardado correctamente." });
      if (categoryId) void applyCategoryCodes(categoryId);
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "No se pudo guardar la variante.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  function addVariant() {
    const cat = localCategories.find((c) => c.id === categoryId) as Category | undefined;
    const siglas = (cat as Category & { siglas?: string })?.siglas?.trim();
    const secuencialVariante =
      (cat as Category & { secuencialVariantes?: number })?.secuencialVariantes ??
      (cat as Category)?.secuencial_variantes;

    let sku = "";
    let barcode = "";
    if (siglas != null && secuencialVariante != null) {
      const num = secuencialVariante + variants.length;
      sku = "SKU" + siglas + String(num);
      barcode = "CB" + siglas + String(num);
    }

    const baseVariant = { ...emptyVariant(), sku, barcode };
    const profile = categoryId && profitabilityConfig
      ? profitabilityConfig.profiles.find((p) => p.categoryIds.includes(categoryId))
      : null;
    const percentages = profile?.percentages ?? profitabilityConfig?.defaultPercentages ?? {};
    const prices = { ...baseVariant.prices } as Record<string, string>;
    for (const key of TARIFAS_KEYS) {
      prices[`porcentajeRentabilidad${key}`] = String(percentages[String(key)] ?? 0);
    }
    const newVariant = { ...baseVariant, prices: prices as PricesRow };

    const newIndex = variants.length;
    setVariants((prev) => [...prev, newVariant]);
    setOriginalVariantSnapshot(null);
    setEditingVariantIndex(newIndex);
    setExpandedVariantIndex(newIndex);

    if (profitabilityConfig) {
      const profileName = profile?.name ?? "Por defecto";
      toast({ title: "Perfil aplicado", description: `Tarifas inicializadas con perfil: ${profileName}. Introduce el costo para calcular los PVP.` });
    }
  }

  function removeVariant(index: number) {
    if (variants.length <= 0) return;
    setVariants((prev) => prev.filter((_, i) => i !== index));
    setAdditionalBarcodeInputByIndex((prev) => {
      const next: Record<number, string> = {};
      const newLen = variants.length - 1;
      for (let newIdx = 0; newIdx < newLen; newIdx++) {
        const oldIdx = newIdx >= index ? newIdx + 1 : newIdx;
        if (prev[oldIdx] !== undefined && prev[oldIdx] !== "") next[newIdx] = prev[oldIdx];
      }
      return next;
    });
    if (editingBarcodeDescription?.variantIndex === index) setEditingBarcodeDescription(null);
    else if (editingBarcodeDescription && editingBarcodeDescription.variantIndex > index) {
      setEditingBarcodeDescription((prev) => (prev ? { ...prev, variantIndex: prev.variantIndex - 1 } : null));
    }
  }

  function updateVariant(
    index: number,
    field: keyof VariantRow,
    value: string | PricesRow | AdditionalBarcode[] | boolean | FractionConfig[]
  ) {
    setVariants((prev) => {
      const next = [...prev];
      (next[index] as Record<string, unknown>)[field] = value;
      return next;
    });
  }

  function handleCostChange(variantIndex: number, rawValue: string) {
    const ivaPct = taxId ? (taxes.find((t) => t.id === taxId)?.percentage ?? 0) : 0;
    const costNum = parseFloat(rawValue) || 0;
    const costRounded = roundToFive(costNum, 5);
    const costIncIvaNum = costToCostIncIva(costRounded, ivaPct);
    const costIncIvaStr = formatDecimal(roundToFive(costIncIvaNum, 5));
    setVariants((prev) => {
      const next = [...prev];
      const v = next[variantIndex];
      if (!v) return prev;
      next[variantIndex] = { ...v, cost: rawValue, costIncIva: costIncIvaStr };
      return next;
    });
  }

  function handleCostIncIvaChange(variantIndex: number, rawValue: string) {
    const ivaPct = taxId ? (taxes.find((t) => t.id === taxId)?.percentage ?? 0) : 0;
    const costIncIvaNum = parseFloat(rawValue) || 0;
    const costIncIvaRounded = roundToFive(costIncIvaNum, 5);
    const costNum = costIncIvaToCost(costIncIvaRounded, ivaPct);
    const costStr = formatDecimal(roundToFive(costNum, 5));
    setVariants((prev) => {
      const next = [...prev];
      const v = next[variantIndex];
      if (!v) return prev;
      next[variantIndex] = { ...v, cost: costStr, costIncIva: rawValue };
      return next;
    });
  }

  function updateVariantPriceField(variantIndex: number, field: keyof PricesRow, value: string) {
    setVariants((prev) => {
      const next = [...prev];
      (next[variantIndex].prices as Record<string, string>)[field] = value;
      return next;
    });
  }

  function updateVariantFractionPriceField(variantIndex: number, field: keyof PricesRow, value: string) {
    setVariants((prev) => {
      const next = [...prev];
      const v = next[variantIndex];
      if (!v) return prev;
      const fp = { ...(v.fractionPrices ?? emptyPrices()) } as Record<string, string>;
      fp[field] = value;
      next[variantIndex] = { ...v, fractionPrices: fp as PricesRow };
      return next;
    });
  }

  async function checkBarcodeAvailable(barcode: string, excludeVariantId?: string | null): Promise<boolean> {
    const trimmed = barcode?.trim();
    if (!trimmed) return false;
    try {
      const params = new URLSearchParams({ barcode: trimmed });
      if (excludeVariantId) params.set("excludeVariantId", excludeVariantId);
      const res = await apiFetch(
        `/articles/company/${companyId}/check-barcode?${params.toString()}`,
        { credentials: "include" }
      );
      if (!res.ok) return false;
      const data = (await res.json()) as { available?: boolean };
      return data.available === true;
    } catch {
      return false;
    }
  }

  async function addAdditionalBarcode(variantIndex: number) {
    const input = (additionalBarcodeInputByIndex[variantIndex] ?? "").trim();
    if (!input) return;
    const v = variants[variantIndex];
    if (!v) return;
    const alreadyInList = (v.additionalBarcodes ?? []).some(
      (b) => b.barcode.trim().toLowerCase() === input.toLowerCase()
    );
    if (alreadyInList) {
      toast({ title: "Código duplicado", description: "Ese código ya está en la lista de esta variante.", variant: "destructive" });
      return;
    }
    const excludeVariantId = v.id ?? undefined;
    const available = await checkBarcodeAvailable(input, excludeVariantId);
    if (!available) {
      toast({
        title: "Código no disponible",
        description: "Ese código de barras ya está asignado a otro artículo o variante.",
        variant: "destructive",
      });
      return;
    }
    const newList: AdditionalBarcode[] = [...(v.additionalBarcodes ?? []), { barcode: input, description: "" }];
    updateVariant(variantIndex, "additionalBarcodes", newList);
    setAdditionalBarcodeInputByIndex((prev) => ({ ...prev, [variantIndex]: "" }));
  }

  function removeAdditionalBarcode(variantIndex: number, barcodeIndex: number) {
    const v = variants[variantIndex];
    if (!v) return;
    const list = [...(v.additionalBarcodes ?? [])];
    list.splice(barcodeIndex, 1);
    updateVariant(variantIndex, "additionalBarcodes", list);
    if (editingBarcodeDescription?.variantIndex === variantIndex && editingBarcodeDescription?.barcodeIndex === barcodeIndex) {
      setEditingBarcodeDescription(null);
    }
  }

  function updateAdditionalBarcodeDescription(variantIndex: number, barcodeIndex: number, description: string) {
    const v = variants[variantIndex];
    if (!v) return;
    const list = [...(v.additionalBarcodes ?? [])];
    if (list[barcodeIndex]) list[barcodeIndex] = { ...list[barcodeIndex], description };
    updateVariant(variantIndex, "additionalBarcodes", list);
    setEditingBarcodeDescription(null);
  }

  function toggleFractionEnabled(variantIndex: number) {
    const v = variants[variantIndex];
    if (!v) return;
    const nextEnabled = !v.fractionEnabled;
    setVariants((prev) => {
      const next = [...prev];
      const curr = next[variantIndex];
      if (!curr) return prev;
      const fractions = curr.fractions ?? [];
      const newFractions =
        nextEnabled && fractions.length === 0 ? [{ fraction_name: "", conversion_factor: "" }] : fractions;
      next[variantIndex] = {
        ...curr,
        fractionEnabled: nextEnabled,
        fractions: newFractions,
        fractionPrices: nextEnabled ? curr.fractionPrices ?? emptyPrices() : emptyPrices(),
      };
      return next;
    });
  }

  function updateFractionField(variantIndex: number, fractionIndex: number, field: keyof FractionConfig, value: string) {
    setVariants((prev) => {
      const next = [...prev];
      const curr = next[variantIndex];
      if (!curr?.fractions?.length) return prev;
      const list = [...curr.fractions];
      if (list[fractionIndex]) list[fractionIndex] = { ...list[fractionIndex], [field]: value };
      next[variantIndex] = { ...curr, fractions: list };
      return next;
    });
  }

  function addFraction(variantIndex: number) {
    const v = variants[variantIndex];
    if (!v) return;
    updateVariant(variantIndex, "fractions", [...(v.fractions ?? []), { fraction_name: "", conversion_factor: "" }]);
  }

  function removeFraction(variantIndex: number, fractionIndex: number) {
    const v = variants[variantIndex];
    if (!v) return;
    const list = (v.fractions ?? []).filter((_, j) => j !== fractionIndex);
    updateVariant(variantIndex, "fractions", list);
    if (list.length === 0) {
      setVariants((prev) => {
        const next = [...prev];
        if (next[variantIndex]) next[variantIndex] = { ...next[variantIndex], fractionEnabled: false, fractionPrices: emptyPrices() };
        return next;
      });
    }
  }

  async function addBatch(variantId: string, batchNumber: string, expirationDate: string, currentStock: string) {
    if (!batchNumber.trim()) {
      toast({ title: "Error", description: "El número de lote es obligatorio.", variant: "destructive" });
      return;
    }
    try {
      const res = await apiFetch(
        `/articles/variants/${variantId}/batches?companyId=${encodeURIComponent(companyId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            batchNumber: batchNumber.trim(),
            expirationDate: expirationDate || null,
            currentStock: parseFloat(currentStock) || 0,
          }),
          credentials: "include",
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? "Error al crear lote");
      }
      const batch = (await res.json()) as Batch;
      setVariantsWithBatches((prev) =>
        prev.map((v) => (v.id === variantId ? { ...v, batches: [...v.batches, batch] } : v))
      );
      router.refresh();
      toast({ title: "Lote añadido", description: "El lote se ha creado correctamente." });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "No se pudo crear.",
        variant: "destructive",
      });
    }
  }

  async function removeBatch(variantId: string, batchId: string) {
    try {
      const res = await apiFetch(
        `/articles/variants/${variantId}/batches/${batchId}?companyId=${encodeURIComponent(companyId)}`,
        { method: "DELETE", credentials: "include" }
      );
      if (!res.ok) throw new Error("Error al eliminar");
      setVariantsWithBatches((prev) =>
        prev.map((v) => (v.id === variantId ? { ...v, batches: v.batches.filter((b) => b.id !== batchId) } : v))
      );
      router.refresh();
      toast({ title: "Lote eliminado", description: "El lote se ha eliminado correctamente." });
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar.", variant: "destructive" });
    }
  }

  function resetToNew() {
    setVariants([]);
    setVariantsWithBatches([]);
    setEditingVariantIndex(null);
    setExpandedVariantIndex(null);
    setOriginalVariantSnapshot(null);
    setAdditionalBarcodeInputByIndex({});
    setEditingBarcodeDescription(null);
  }

  function loadInitialVariants(data: LoadInitialVariantsPayload) {
    if (data) {
      setVariants(data.variants);
      setVariantsWithBatches(data.variantsWithBatches);
      setEditingVariantIndex(null);
      setExpandedVariantIndex(null);
      setOriginalVariantSnapshot(null);
      if (data.articleId != null) setEffectiveArticleIdState(data.articleId);
    } else {
      setVariants([]);
      setVariantsWithBatches([]);
      setEditingVariantIndex(null);
      setExpandedVariantIndex(null);
      setOriginalVariantSnapshot(null);
      setAdditionalBarcodeInputByIndex({});
      setEditingBarcodeDescription(null);
    }
  }

  return {
    variants,
    setVariants,
    editingVariantIndex,
    setEditingVariantIndex,
    expandedVariantIndex,
    setExpandedVariantIndex,
    originalVariantSnapshot,
    setOriginalVariantSnapshot,
    additionalBarcodeInputByIndex,
    setAdditionalBarcodeInputByIndex,
    editingBarcodeDescription,
    setEditingBarcodeDescription,
    variantsWithBatches,
    setVariantsWithBatches,
    loading,
    isVariantFormOpen,
    isVariantsDirty,
    canAddVariant,
    canSave,
    validationMessage,
    isVariantDirty,
    startEditVariant,
    cancelEditVariant,
    buildSingleVariantPayload,
    addVariant,
    removeVariant,
    saveSingleVariant,
    updateVariant,
    handleCostChange,
    handleCostIncIvaChange,
    updateVariantPriceField,
    updateVariantFractionPriceField,
    toggleFractionEnabled,
    updateFractionField,
    addFraction,
    removeFraction,
    addAdditionalBarcode,
    removeAdditionalBarcode,
    updateAdditionalBarcodeDescription,
    addBatch,
    removeBatch,
    resetToNew,
    loadInitialVariants,
  };
}
