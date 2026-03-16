"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useArticleGeneralForm } from "@/app/dashboard/[id]/inventory/hooks/useArticleGeneralForm";
import { useVariantForm } from "@/app/dashboard/[id]/inventory/hooks/useVariantForm";
import { Plus, Trash2, Star, Upload, Pencil, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { GeneralTab } from "@/components/articles/GeneralTab";
import { VariantsTab } from "@/components/articles/VariantsTab";
import type { CatalogItem } from "@/lib/api-client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { formatDecimal, formatCostIncIva } from "@/lib/cost-iva";
import { roundToFive } from "@/lib/math.util";
import { apiFetch, API_BASE } from "@/lib/api-client";
import {
  type PricesRow,
  type VariantRow,
  type ArticleImage,
  type Batch,
  type FractionConfig,
  type AdditionalBarcode,
  TARIFAS_KEYS,
  emptyPrices,
} from "@/lib/types/article.types";
import type {
  ArticleFormBrand as Brand,
  ArticleFormCategory as Category,
  ArticleFormTax as Tax,
} from "@/lib/types/article.types";
import { usePriceCalculation } from "@/lib/hooks/usePriceCalculation";

function getBatchRowClass(expirationDate: string | null): string {
  if (!expirationDate) return "";
  const days = differenceInDays(new Date(expirationDate), new Date());
  if (days < 0) return "bg-red-100 dark:bg-red-900/20";
  if (days <= 30) return "bg-amber-100 dark:bg-amber-900/20";
  return "";
}

/**
 * Recalcula porcentajes de utilidad y valores de rentabilidad para la tabla Tarifas PVP
 * cuando el precio de venta es distinto de cero. Se usa al abrir el artículo para editar.
 */
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

type ArticleFormDialogProps = {
  companyId: string;
  brands: Brand[];
  categories: Category[];
  taxes: Tax[];
  measures?: CatalogItem[];
  colors?: CatalogItem[];
  sizes?: CatalogItem[];
  flavors?: CatalogItem[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Called when user clicks "Nuevo" and confirms (if needed). Parent should clear initialData so dialog stays in creation mode. */
  onRequestNew?: () => void;
  trigger?: React.ReactNode;
  initialData?: {
    id: string;
    code?: string | null;
    name: string;
    observations?: string | null;
    brandId?: string | null;
    categoryId?: string | null;
    taxId?: string | null;
    images?: ArticleImage[];
    variants: Array<{
      id: string;
      sku: string;
      barcode?: string | null;
      barcodes?: Array<{ barcode: string; description?: string | null }>;
      cost: number;
      colorId?: string | null;
      sizeId?: string | null;
      flavorId?: string | null;
      color?: { id: string; name: string } | null;
      size?: { id: string; name: string } | null;
      flavor?: { id: string; name: string } | null;
      measureId?: string | null;
      measureUnit?: { id: string; name: string } | null;
      stockActual: number;
      stockMin: number;
      weight?: number;
      observations?: string | null;
      prices?: Array<{
        precioVenta1?: number;
        precioVenta2?: number;
        precioVenta3?: number;
        precioVenta4?: number;
        precioVenta5?: number;
        pvp1?: number;
        pvp2?: number;
        pvp3?: number;
        pvp4?: number;
        pvp5?: number;
        rentabilidad1?: number;
        rentabilidad2?: number;
        rentabilidad3?: number;
        rentabilidad4?: number;
        rentabilidad5?: number;
      }>;
      batches?: Batch[];
    }>;
  } | null;
};

export function ArticleFormDialog({
  companyId,
  brands,
  categories,
  taxes,
  measures = [],
  colors = [],
  sizes = [],
  flavors = [],
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onRequestNew,
  trigger,
  initialData = null,
}: ArticleFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (controlledOnOpenChange ?? (() => {})) : setInternalOpen;
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [images, setImages] = useState<ArticleImage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { toast } = useToast();

  const applyCategoryCodesRef = useRef<((catId: string) => Promise<void>) | null>(null);
  const setVariantsRef = useRef<React.Dispatch<React.SetStateAction<VariantRow[]>> | undefined>(undefined);

  const generalForm = useArticleGeneralForm({
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
  });

  const variantForm = useVariantForm({
    companyId,
    taxId: generalForm.taxId,
    taxes,
    effectiveArticleId: generalForm.effectiveArticleId,
    canSaveGeneral: generalForm.canSaveGeneral,
    validationMessageGeneral: generalForm.validationMessageGeneral,
    toast,
    localCategories: generalForm.localCategories,
    categoryId: generalForm.categoryId,
    profitabilityConfig: generalForm.profitabilityConfig,
    applyCategoryCodes: (catId: string) => applyCategoryCodesRef.current?.(catId) ?? Promise.resolve(),
    setVariantsRef,
  });
  setVariantsRef.current = variantForm.setVariants;
  applyCategoryCodesRef.current = generalForm.applyCategoryCodes;

  const loading = generalForm.loading || variantForm.loading;
  const effectiveArticleId = generalForm.effectiveArticleId;
  const isEditing = generalForm.isEditing;
  const generalFieldsDisabled = generalForm.generalFieldsDisabled;
  const activeProfileName = generalForm.activeProfileName;
  const canSaveGeneral = generalForm.canSaveGeneral;
  const validationMessageGeneral = generalForm.validationMessageGeneral;
  const canSave = variantForm.canSave;
  const validationMessage = variantForm.validationMessage;
  const canAddVariant = variantForm.canAddVariant;

  const isGeneralDirty = generalForm.isGeneralDirty;
  const isVariantFormOpen = variantForm.isVariantFormOpen;
  const isFormLocked = isGeneralDirty || isVariantFormOpen;
  const isFormEmpty = useMemo(
    () =>
      !generalForm.categoryId?.trim() &&
      !generalForm.code?.trim() &&
      !generalForm.name?.trim(),
    [generalForm.categoryId, generalForm.code, generalForm.name]
  );
  const isVariantsTabDisabled = !effectiveArticleId;

  const pricing = usePriceCalculation({
    variants: variantForm.variants,
    setVariants: variantForm.setVariants,
    taxId: generalForm.taxId,
    taxes,
    toast,
  });

  /** Unsaved-changes confirmation: pendingTab = tab to switch to, or null = user wanted to close dialog. */
  const [unsavedConfirmOpen, setUnsavedConfirmOpen] = useState(false);
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  /** Confirmation for "Nuevo" when there are unsaved changes. */
  const [nuevoConfirmOpen, setNuevoConfirmOpen] = useState(false);

  async function saveGeneralArticleData() {
    const result = await generalForm.saveGeneralArticleData();
    if (result) {
      variantForm.loadInitialVariants({
        variants: result.variants,
        variantsWithBatches: result.variantsWithBatches,
        articleId: result.id,
      });
      setActiveTab("variants");
      variantForm.setEditingVariantIndex(null);
      variantForm.setExpandedVariantIndex(null);
      variantForm.setOriginalVariantSnapshot(null);
      if (generalForm.categoryId) void generalForm.applyCategoryCodes(generalForm.categoryId);
    }
  }

  function handleTaxChange(newTaxId: string) {
    generalForm.handleTaxChange(newTaxId);
    const newIvaPct = newTaxId ? (taxes.find((t) => t.id === newTaxId)?.percentage ?? 0) : 0;
    variantForm.setVariants((prev) =>
      prev.map((variant) => {
        const costNum = roundToFive(parseFloat(String(variant.cost)) || 0, 5);
        const costIncIva =
          newIvaPct !== 0 ? roundToFive(costNum * (1 + newIvaPct / 100), 5) : costNum;
        const costIncIvaStr = formatDecimal(costIncIva);
        const prices = { ...(variant.prices as Record<string, string>) };
        for (const key of TARIFAS_KEYS) {
          const precioVentaNum = parseFloat(String(prices[`precioVenta${key}`] ?? "")) || 0;
          if (precioVentaNum > 0) {
            const pvp = roundToFive(precioVentaNum * (1 + newIvaPct / 100), 5);
            const valorRentIncIva = roundToFive(pvp - costIncIva, 5);
            prices[`pvp${key}`] = formatDecimal(pvp);
            prices[`rentabilidadIncIva${key}`] = formatDecimal(valorRentIncIva);
          } else {
            prices[`pvp${key}`] = "0";
            prices[`rentabilidadIncIva${key}`] = "0";
          }
        }
        return { ...variant, costIncIva: costIncIvaStr, prices: prices as PricesRow };
      })
    );
  }

  useEffect(() => {
    if (!open) return;
    generalForm.loadInitialGeneral(initialData);
    if (initialData) {
      setImages(initialData.images ?? []);
      const taxIdForIva = initialData.taxId ?? "";
      const ivaPct = taxIdForIva ? (taxes.find((t) => t.id === taxIdForIva)?.percentage ?? 0) : 0;
      const variantsMapped = (initialData.variants ?? []).map((v) => {
        const p = v.prices?.[0];
        const costNum = Number(v.cost ?? 0);
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
        const barcodesRaw = v.barcodes ?? [];
        const additionalBarcodes: AdditionalBarcode[] = barcodesRaw.map((b) => ({
          barcode: b.barcode ?? "",
          description: b.description ?? "",
        }));
        const fractionEnabled = Boolean((v as Record<string, unknown>).fractionEnabled);
        const fractionsRaw = (v as Record<string, unknown>).fractions as FractionConfig[] | undefined;
        const fractions: FractionConfig[] = Array.isArray(fractionsRaw)
          ? fractionsRaw.map((f) => ({ fraction_name: String(f?.fraction_name ?? ""), conversion_factor: String(f?.conversion_factor ?? "") }))
          : [];
        return {
          id: v.id,
          sku: v.sku,
          barcode: v.barcode ?? "",
          additionalBarcodes,
          cost: formatDecimal(v.cost ?? 0),
          colorId: v.colorId ?? v.color?.id ?? "",
          sizeId: v.sizeId ?? v.size?.id ?? "",
          flavorId: v.flavorId ?? v.flavor?.id ?? "",
          measureId: v.measureId ?? v.measureUnit?.id ?? "",
          weight: String(v.weight ?? 0),
          observations: v.observations ?? "",
          prices,
          fractionEnabled,
          fractions,
          fractionPrices: emptyPrices(),
        };
      });
      variantForm.loadInitialVariants({
        variants: variantsMapped,
        variantsWithBatches: (initialData.variants ?? []).map((v) => ({
          id: v.id,
          sku: v.sku,
          batches: v.batches ?? [],
        })),
      });
      if (initialData.categoryId) void generalForm.applyCategoryCodes(initialData.categoryId);
    } else {
      setImages([]);
      variantForm.loadInitialVariants(null);
    }
  }, [open, initialData]);

  useEffect(() => {
    if (!generalForm.profitabilityConfig || generalForm.isEditing) return;
    const profile = generalForm.categoryId
      ? generalForm.profitabilityConfig.profiles.find((p) => p.categoryIds.includes(generalForm.categoryId))
      : null;
    const percentages = profile?.percentages ?? generalForm.profitabilityConfig.defaultPercentages ?? {};
    variantForm.setVariants((prev) =>
      prev.map((v) => {
        const prices = { ...v.prices } as Record<string, string>;
        for (const key of TARIFAS_KEYS) {
          const pct = percentages[String(key)] ?? 0;
          prices[`porcentajeRentabilidad${key}`] = String(pct);
        }
        return { ...v, prices: prices as PricesRow };
      })
    );
  }, [generalForm.categoryId, generalForm.profitabilityConfig, generalForm.isEditing]);

  /** Aviso nativo del navegador al recargar/cerrar pestaña si hay cambios sin guardar. */
  useEffect(() => {
    if (!open || !isFormLocked) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [open, isFormLocked]);

  /** Navegación vertical en celdas de precio / % Rent (keyboard). */
  function focusPriceCellBelow(
    variantIndex: number,
    column: "precioVenta" | "pvp",
    currentKey: number,
  ) {
    setTimeout(() => {
      const nextKey = currentKey < 5 ? currentKey + 1 : 1;
      const el = document.getElementById(`${column}-${variantIndex}-${nextKey}`);
      if (el instanceof HTMLInputElement) {
        el.focus();
        el.select();
      }
    }, 0);
  }
  function focusPctRentBelow(variantIndex: number, currentKey: number) {
    setTimeout(() => {
      const nextKey = currentKey < 5 ? currentKey + 1 : 1;
      const el = document.getElementById(`pctRent-${variantIndex}-${nextKey}`);
      if (el instanceof HTMLInputElement) {
        el.focus();
        el.select();
      }
    }, 0);
  }

  function applyProfilePercentages(): void {
    if (!generalForm.profitabilityConfig) return;
    const profile = generalForm.categoryId
      ? generalForm.profitabilityConfig.profiles.find((p) => p.categoryIds.includes(generalForm.categoryId))
      : null;
    const percentages = profile?.percentages ?? generalForm.profitabilityConfig.defaultPercentages ?? {};
    const ivaPct = generalForm.taxId ? (taxes.find((t) => t.id === generalForm.taxId)?.percentage ?? 0) : 0;

    variantForm.setVariants((prev) =>
      prev.map((v) => {
        const cost = parseFloat(v.cost) || 0;
        const costIncIva = ivaPct !== 0 ? cost * (1 + ivaPct / 100) : cost;
        const prices = { ...v.prices } as Record<string, string>;

        if (cost <= 0 || costIncIva <= 0) {
          for (const key of TARIFAS_KEYS) {
            prices[`porcentajeRentabilidad${key}`] = String(percentages[String(key)] ?? 0);
            prices[`precioVenta${key}`] = "0";
            prices[`pvp${key}`] = "0";
            prices[`rentabilidad${key}`] = "0";
            prices[`rentabilidadIncIva${key}`] = "0";
          }
          return { ...v, prices: prices as PricesRow };
        }

        for (const key of TARIFAS_KEYS) {
          const pct = Number(percentages[String(key)]) || 0;
          prices[`porcentajeRentabilidad${key}`] = String(pct);

          if (pct <= 0) {
            prices[`precioVenta${key}`] = "0";
            prices[`pvp${key}`] = "0";
            prices[`rentabilidad${key}`] = "0";
            prices[`rentabilidadIncIva${key}`] = "0";
            continue;
          }

          const precioVenta = roundToFive(cost + cost * (pct / 100), 5);
          const pvp = ivaPct === 0 ? precioVenta : roundToFive(precioVenta * (1 + ivaPct / 100), 5);
          const valorRent = roundToFive(precioVenta - cost, 5);
          const valorRentIncIva = roundToFive(pvp - costIncIva, 5);

          prices[`precioVenta${key}`] = formatDecimal(precioVenta);
          prices[`pvp${key}`] = formatDecimal(pvp);
          prices[`rentabilidad${key}`] = formatDecimal(valorRent);
          prices[`rentabilidadIncIva${key}`] = formatDecimal(valorRentIncIva);
        }
        return { ...v, prices: prices as PricesRow };
      })
    );
    toast({ title: "Porcentajes asignados", description: "Se han aplicado los porcentajes del perfil a todas las variantes." });
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>, isMain = false) {
    const file = e.target.files?.[0];
    if (!file || !effectiveArticleId) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiFetch(
        `/articles/${effectiveArticleId}/images?companyId=${encodeURIComponent(companyId)}&isMain=${isMain}`,
        {
          method: "POST",
          body: formData,
          credentials: "include",
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Error al subir imagen");
      }
      const img = await res.json();
      setImages((prev) => [
        ...prev.filter((i) => i.id !== img.id).map((i) => ({ ...i, isMain: false })),
        { ...img, isMain: img.isMain ?? isMain },
      ]);
      router.refresh();
      toast({ title: "Imagen subida", description: "La imagen se ha añadido correctamente." });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "No se pudo subir.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function setMainImage(imageId: string) {
    if (!effectiveArticleId) return;
    try {
      await apiFetch(
        `/articles/${effectiveArticleId}/images/${imageId}/main?companyId=${encodeURIComponent(companyId)}`,
        { method: "PATCH", credentials: "include" }
      );
      setImages((prev) =>
        prev.map((i) => ({ ...i, isMain: i.id === imageId }))
      );
      router.refresh();
      toast({ title: "Imagen principal", description: "Se ha actualizado la imagen principal." });
    } catch {
      toast({ title: "Error", description: "No se pudo actualizar.", variant: "destructive" });
    }
  }

  async function removeImage(imageId: string) {
    if (!effectiveArticleId) return;
    try {
      await apiFetch(
        `/articles/${effectiveArticleId}/images/${imageId}?companyId=${encodeURIComponent(companyId)}`,
        { method: "DELETE", credentials: "include" }
      );
      setImages((prev) => prev.filter((i) => i.id !== imageId));
      router.refresh();
      toast({ title: "Imagen eliminada", description: "La imagen se ha eliminado correctamente." });
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar.", variant: "destructive" });
    }
  }

  /** Handles tab change: blocks Variantes until article is saved; shows empty vs unsaved messaging. */
  function handleTabChange(newTab: string) {
    if (newTab === "variants" && !effectiveArticleId) {
      if (isFormEmpty) {
        toast({
          title: "Complete la información general",
          description: "Por favor, primero registre la información general del artículo para habilitar las demás secciones.",
          variant: "destructive",
        });
      } else {
        setPendingTab(newTab);
        setUnsavedConfirmOpen(true);
      }
      return;
    }
    if (isFormLocked) {
      setPendingTab(newTab);
      setUnsavedConfirmOpen(true);
      return;
    }
    setActiveTab(newTab);
  }

  /** Reverts current tab's unsaved changes, then navigates to pendingTab or closes dialog. */
  function discardChangesAndProceed() {
    if (activeTab === "general" && isGeneralDirty) generalForm.cancelGeneralEdit();
    if (activeTab === "variants" && isVariantFormOpen) variantForm.cancelEditVariant();
    setUnsavedConfirmOpen(false);
    if (pendingTab !== null) {
      setActiveTab(pendingTab);
      setPendingTab(null);
    } else {
      setOpen(false);
      setPendingTab(null);
    }
    toast({ title: "Cambios descartados", description: "Se han restaurado los datos sin guardar." });
  }

  /** Full reset to "new article" mode: General tab, clear all state, clear article id. */
  function performResetToNew() {
    generalForm.performResetToNew();
    variantForm.resetToNew();
    setImages([]);
    setActiveTab("general");
    onRequestNew?.();
  }

  /** Click on global "Nuevo": if dirty, show confirmation; else reset to new article. */
  function handleNuevoClick() {
    if (isFormLocked) {
      setNuevoConfirmOpen(true);
      return;
    }
    performResetToNew();
  }

  /** User confirmed "Descartar e iniciar nuevo" in nuevo confirm dialog. */
  function confirmNuevoAndReset() {
    setNuevoConfirmOpen(false);
    performResetToNew();
  }

  /** Intercepts dialog close: if form locked, show confirmation instead of closing. */
  function handleDialogOpenChange(nextOpen: boolean) {
    if (!nextOpen && isFormLocked) {
      setPendingTab(null);
      setUnsavedConfirmOpen(true);
      return;
    }
    setOpen(nextOpen);
  }

  return (
    <>
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger ?? <Button className="bg-acont-secondary text-slate-900 hover:bg-acont-secondary/90 border-0">+ Nuevo Artículo</Button>}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-white text-slate-800 font-acont p-0 w-[95vw] sm:w-full rounded-lg shadow-[0_4px_15px_rgba(0,0,0,0.1)] border border-slate-200">
        {/* Toolbar superior: solo título y descripción (el botón Nuevo está en el footer para no solaparse con cerrar) */}
        <div className="flex flex-col gap-1 px-4 py-3 sm:px-6 sm:py-4 pr-12 sm:pr-14 border-b border-slate-200 bg-white shrink-0">
          <DialogTitle className="text-lg sm:text-xl font-semibold text-slate-800 m-0">
            {isEditing ? "Editar Artículo" : "Gestión de Artículos"}
          </DialogTitle>
          <DialogDescription className="text-slate-500 text-sm mt-0.5">
            Guarda los datos generales y añade variantes después.
          </DialogDescription>
        </div>
        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-col min-h-0 flex-1 overflow-hidden">
          <TabsList className="w-full grid grid-cols-4 rounded-none border-b-0 px-0 overflow-x-auto touch-pan-x shrink-0">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger
              value="variants"
              className={isVariantsTabDisabled ? "opacity-60 pointer-events-auto data-[state=inactive]:opacity-60" : ""}
              title={isVariantsTabDisabled ? "Guarde primero la información general para habilitar Variantes" : undefined}
            >
              <span className="flex items-center gap-1.5">
                {isVariantsTabDisabled && <Lock className="h-3.5 w-3.5 shrink-0" />}
                Variantes
              </span>
            </TabsTrigger>
            <TabsTrigger value="inventory">Inventario</TabsTrigger>
            <TabsTrigger value="photos">Fotos</TabsTrigger>
          </TabsList>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (effectiveArticleId && generalForm.generalTabEditMode) saveGeneralArticleData();
              else if (!effectiveArticleId) saveGeneralArticleData();
            }}
            className="flex flex-col min-h-0 flex-1 overflow-hidden"
          >
            <GeneralTab
              companyId={companyId}
              categoryId={generalForm.categoryId}
              onCategoryChange={generalForm.handleCategoryChange}
              localCategories={generalForm.localCategories}
              setLocalCategories={generalForm.setLocalCategories}
              brandId={generalForm.brandId}
              onBrandIdChange={generalForm.setBrandId}
              localBrands={generalForm.localBrands}
              setLocalBrands={generalForm.setLocalBrands}
              code={generalForm.code}
              onCodeChange={generalForm.setCode}
              name={generalForm.name}
              onNameChange={generalForm.setName}
              categorySecuencialInfo={generalForm.categorySecuencialInfo}
              taxId={generalForm.taxId}
              onTaxChange={handleTaxChange}
              taxes={taxes}
              observations={generalForm.observations}
              onObservationsChange={generalForm.setObservations}
              generalFieldsDisabled={generalFieldsDisabled}
              generalTabEditMode={generalForm.generalTabEditMode}
            />

            <VariantsTab
              code={generalForm.code}
              name={generalForm.name}
              categoryId={generalForm.categoryId}
              categoryName={
                generalForm.localCategories.find((c) => c.id === generalForm.categoryId)?.name ?? "Sin Categoría"
              }
              categorySecuencialInfo={generalForm.categorySecuencialInfo}
              companyId={companyId}
              canAddVariant={canAddVariant}
              effectiveArticleId={effectiveArticleId}
              canSave={canSave}
              variants={variantForm.variants}
              addVariant={variantForm.addVariant}
              removeVariant={variantForm.removeVariant}
              editingVariantIndex={variantForm.editingVariantIndex}
              setEditingVariantIndex={variantForm.setEditingVariantIndex}
              expandedVariantIndex={variantForm.expandedVariantIndex}
              setExpandedVariantIndex={variantForm.setExpandedVariantIndex}
              localMeasures={generalForm.localMeasures}
              setLocalMeasures={generalForm.setLocalMeasures}
              localColors={generalForm.localColors}
              setLocalColors={generalForm.setLocalColors}
              localSizes={generalForm.localSizes}
              setLocalSizes={generalForm.setLocalSizes}
              localFlavors={generalForm.localFlavors}
              setLocalFlavors={generalForm.setLocalFlavors}
              taxId={generalForm.taxId}
              taxes={taxes}
              tariffLabels={generalForm.tariffLabels}
              pricing={pricing}
              focusPriceCellBelow={focusPriceCellBelow}
              focusPctRentBelow={focusPctRentBelow}
              updateVariant={variantForm.updateVariant}
              updateVariantPriceField={variantForm.updateVariantPriceField}
              updateVariantFractionPriceField={variantForm.updateVariantFractionPriceField}
              handleCostChange={variantForm.handleCostChange}
              handleCostIncIvaChange={variantForm.handleCostIncIvaChange}
              toggleFractionEnabled={variantForm.toggleFractionEnabled}
              updateFractionField={variantForm.updateFractionField}
              addFraction={variantForm.addFraction}
              removeFraction={variantForm.removeFraction}
              additionalBarcodeInputByIndex={variantForm.additionalBarcodeInputByIndex}
              setAdditionalBarcodeInputByIndex={variantForm.setAdditionalBarcodeInputByIndex}
              editingBarcodeDescription={variantForm.editingBarcodeDescription}
              setEditingBarcodeDescription={variantForm.setEditingBarcodeDescription}
              addAdditionalBarcode={variantForm.addAdditionalBarcode}
              removeAdditionalBarcode={variantForm.removeAdditionalBarcode}
              updateAdditionalBarcodeDescription={variantForm.updateAdditionalBarcodeDescription}
              isVariantDirty={variantForm.isVariantDirty}
              saveSingleVariant={variantForm.saveSingleVariant}
              cancelEditVariant={variantForm.cancelEditVariant}
              startEditVariant={variantForm.startEditVariant}
              activeProfileName={activeProfileName}
              profitabilityConfig={generalForm.profitabilityConfig}
              applyProfilePercentages={applyProfilePercentages}
              formatCostIncIva={formatCostIncIva}
            />

            <TabsContent value="inventory" className="flex-1 overflow-y-auto min-h-0 mt-0 p-4 sm:p-6 md:p-8 space-y-4 data-[state=inactive]:hidden">
              {!isEditing ? (
                <p className="text-slate-500 text-sm">Guarda el artículo primero para gestionar lotes por variante.</p>
              ) : variantForm.variantsWithBatches.length === 0 ? (
                <p className="text-slate-500 text-sm">Guarda las variantes para añadir lotes.</p>
              ) : (
                <div className="space-y-6">
                  {variantForm.variantsWithBatches.map((v) => (
                    <div key={v.id} className="border rounded-lg p-4">
                      <h4 className="font-medium text-sm mb-3">Variante: {v.sku}</h4>
                      <BatchForm
                        variantId={v.id}
                        batches={v.batches}
                        onAdd={variantForm.addBatch}
                        onRemove={variantForm.removeBatch}
                      />
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="photos" className="flex-1 overflow-y-auto min-h-0 mt-0 p-4 sm:p-6 md:p-8 space-y-4 data-[state=inactive]:hidden">
              {!isEditing ? (
                <p className="text-slate-500 text-sm">Guarda el artículo primero para subir imágenes.</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, images.length === 0)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {uploading ? "Subiendo..." : "Subir imagen"}
                    </Button>
                    <span className="text-sm text-slate-500">
                      Una imagen debe marcarse como principal (click en la estrella).
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {images.map((img) => (
                      <div
                        key={img.id}
                        className="relative group rounded-lg overflow-hidden border w-24 h-24 bg-slate-100"
                      >
                        <img
                          src={img.url.startsWith("http") ? img.url : `${API_BASE}${img.url}`}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1">
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setMainImage(img.id)}
                            title="Marcar como principal"
                          >
                            <Star
                              className={`h-4 w-4 ${img.isMain ? "fill-amber-400 text-amber-400" : ""}`}
                            />
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removeImage(img.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        {img.isMain && (
                          <span className="absolute top-1 left-1 bg-amber-500 text-white text-xs px-1 rounded">
                            Principal
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {!canSave && validationMessage && (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 shrink-0 mx-4 sm:mx-6 md:mx-8" role="status">
                {validationMessage}
              </p>
            )}
            {/* Footer: Nuevo Artículo a la izquierda (zona práctica); acciones a la derecha según pestaña */}
            <DialogFooter className="border-t border-slate-200 py-4 px-4 sm:px-6 md:px-8 flex flex-wrap items-center justify-between gap-3 sm:gap-4 shrink-0 bg-white">
              <Button
                type="button"
                size="sm"
                onClick={handleNuevoClick}
                className="order-first sm:order-none bg-acont-secondary text-white hover:bg-acont-secondary/90 border-0 font-semibold px-4 py-2.5 h-9 rounded-md shadow-sm"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Nuevo Artículo
              </Button>
              <div className="flex flex-wrap justify-end gap-3 sm:gap-4 ml-auto">
              {activeTab === "general" && (
                <>
                  {effectiveArticleId ? (
                    <>
                      {!generalForm.generalTabEditMode ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => generalForm.setGeneralTabEditMode(true)}
                          disabled={loading}
                          className="border-slate-300 bg-[#ecf0f1] text-slate-800 hover:bg-slate-200 font-semibold px-5 py-2.5"
                        >
                          <Pencil className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                      ) : (
                        <>
                          <Button
                            type="button"
                            onClick={generalForm.cancelGeneralEdit}
                            disabled={loading}
                            className="bg-[#ecf0f1] text-slate-800 hover:bg-slate-200 border-0 font-semibold px-5 py-2.5"
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="button"
                            disabled={loading || !isGeneralDirty}
                            onClick={saveGeneralArticleData}
                            className="bg-acont-primary text-white hover:bg-acont-primary/90 border-0 font-semibold px-5 py-2.5"
                          >
                            {loading ? "Guardando..." : "Actualizar"}
                          </Button>
                        </>
                      )}
                    </>
                  ) : (
                    <Button
                      type="button"
                      disabled={loading || !canSaveGeneral}
                      onClick={saveGeneralArticleData}
                      title={!canSaveGeneral ? validationMessageGeneral : undefined}
                      className="bg-acont-primary text-white hover:bg-acont-primary/90 border-0 font-semibold px-5 py-2.5"
                    >
                      {loading ? "Guardando..." : "Guardar Artículo"}
                    </Button>
                  )}
                </>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDialogOpenChange(false)}
                className="border-slate-300 bg-[#ecf0f1] text-slate-800 hover:bg-slate-200 font-semibold px-5 py-2.5"
              >
                Salir
              </Button>
              </div>
            </DialogFooter>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>

    {/* Confirmación: cambios sin guardar (cambiar pestaña o cerrar) */}
    <Dialog open={unsavedConfirmOpen} onOpenChange={setUnsavedConfirmOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cambios sin guardar</DialogTitle>
          <DialogDescription>
            {isVariantFormOpen
              ? "Tienes cambios sin guardar en la variante. ¿Deseas continuar con la edición o descartar los cambios?"
              : "Tienes cambios sin guardar. ¿Deseas descartarlos o continuar editando?"}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setUnsavedConfirmOpen(false);
              setPendingTab(null);
            }}
          >
            {isVariantFormOpen ? "Continuar con la edición" : "Continuar editando"}
          </Button>
          <Button type="button" variant="destructive" onClick={discardChangesAndProceed}>
            Descartar cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Confirmación: Nuevo artículo con cambios sin guardar */}
    <Dialog open={nuevoConfirmOpen} onOpenChange={setNuevoConfirmOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cambios sin guardar</DialogTitle>
          <DialogDescription>
            Tienes cambios sin guardar. ¿Deseas descartarlos para iniciar el registro de un nuevo artículo?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => setNuevoConfirmOpen(false)}>
            Continuar editando
          </Button>
          <Button type="button" variant="destructive" onClick={confirmNuevoAndReset}>
            Descartar e iniciar nuevo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

function BatchForm({
  variantId,
  batches,
  onAdd,
  onRemove,
}: {
  variantId: string;
  batches: Batch[];
  onAdd: (variantId: string, batchNumber: string, expirationDate: string, currentStock: string) => void;
  onRemove: (variantId: string, batchId: string) => void;
}) {
  const [batchNumber, setBatchNumber] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [currentStock, setCurrentStock] = useState("0");

  function handleAdd(e?: React.SyntheticEvent) {
    e?.preventDefault();
    onAdd(variantId, batchNumber, expirationDate, currentStock);
    setBatchNumber("");
    setExpirationDate("");
    setCurrentStock("0");
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-end" role="group" aria-label="Añadir lote">
        <div>
          <Label className="text-xs">Nº Lote</Label>
          <Input
            value={batchNumber}
            onChange={(e) => setBatchNumber(e.target.value)}
            placeholder="LOTE-001"
            className="h-8 w-32"
            onKeyDown={(e) => e.key === "Enter" && handleAdd(e)}
          />
        </div>
        <div>
          <Label className="text-xs">Vencimiento</Label>
          <Input
            type="date"
            value={expirationDate}
            onChange={(e) => setExpirationDate(e.target.value)}
            className="h-8 w-36"
            onKeyDown={(e) => e.key === "Enter" && handleAdd(e)}
          />
        </div>
        <div>
          <Label className="text-xs">Stock</Label>
          <Input
            type="number"
            min={0}
            step={0.00001}
            value={currentStock}
            onChange={(e) => setCurrentStock(e.target.value)}
            className="h-8 w-24"
            onKeyDown={(e) => e.key === "Enter" && handleAdd(e)}
          />
        </div>
        <Button type="button" size="sm" onClick={() => handleAdd()}>Añadir lote</Button>
      </div>
      <div className="rounded border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Nº Lote</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-slate-500 text-sm py-4">
                  Sin lotes. Añade uno arriba.
                </TableCell>
              </TableRow>
            ) : (
              batches.map((b) => (
                <TableRow key={b.id} className={getBatchRowClass(b.expirationDate)}>
                  <TableCell className="font-medium">{b.batchNumber}</TableCell>
                  <TableCell>
                    {b.expirationDate
                      ? format(new Date(b.expirationDate), "dd MMM yyyy", { locale: es })
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">{Number(b.currentStock)}</TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500"
                      onClick={() => onRemove(variantId, b.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
