"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Star, Upload, Pencil, X, Check, Lock, Boxes } from "lucide-react";
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
import { CatalogSelectWithCreate } from "@/components/catalog-select-with-create";
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
import {
  formatDecimal,
  formatCostIncIva,
  costToCostIncIva,
  costIncIvaToCost,
} from "@/lib/cost-iva";
import { roundToFive } from "@/lib/math.util";
import {
  apiGet,
  apiPost,
  apiPatch,
  apiFetch,
  API_BASE,
} from "@/lib/api-client";
import {
  type PricesRow,
  type VariantRow,
  type ArticleImage,
  type Batch,
  type FractionConfig,
  type AdditionalBarcode,
  TARIFAS_KEYS,
  emptyPrices,
  emptyVariant,
} from "@/lib/types/article.types";
import type {
  ArticleFormBrand as Brand,
  ArticleFormCategory as Category,
  ArticleFormTax as Tax,
} from "@/lib/types/article.types";
import { usePriceCalculation } from "@/lib/hooks/usePriceCalculation";
import { safeParseVariantAtIndex } from "@/lib/validations/article.schema";

const TARIFF_NAMES_KEY = "TARIFF_NAMES";
const TARIFF_PROFITABILITY_KEY = "TARIFF_PROFITABILITY";
const DEFAULT_TARIFF_LABELS: Record<string, string> = {
  "1": "Tarifa 1",
  "2": "Tarifa 2",
  "3": "Tarifa 3",
  "4": "Tarifa 4",
  "5": "Tarifa 5",
};

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
  const [loading, setLoading] = useState(false);

  const [localBrands, setLocalBrands] = useState<CatalogItem[]>(brands);
  const [localCategories, setLocalCategories] = useState<CatalogItem[]>(categories);
  const [localMeasures, setLocalMeasures] = useState<CatalogItem[]>(measures);
  const [localColors, setLocalColors] = useState<CatalogItem[]>(colors);
  const [localSizes, setLocalSizes] = useState<CatalogItem[]>(sizes);
  const [localFlavors, setLocalFlavors] = useState<CatalogItem[]>(flavors);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [observations, setObservations] = useState("");
  const [brandId, setBrandId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [taxId, setTaxId] = useState<string>("");
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [images, setImages] = useState<ArticleImage[]>([]);
  const [variantsWithBatches, setVariantsWithBatches] = useState<
    Array<{ id: string; sku: string; batches: Batch[] }>
  >([]);
  const [savedArticleId, setSavedArticleId] = useState<string | null>(null);
  const [categorySecuencialInfo, setCategorySecuencialInfo] = useState<{ secuencial: number; secuencialVariantes: number } | null>(null);
  const [editingVariantIndex, setEditingVariantIndex] = useState<number | null>(null);
  /** General tab: when true, fields are editable and "Actualizar"/"Cancelar" are shown (existing article only). */
  const [generalTabEditMode, setGeneralTabEditMode] = useState(false);
  /** Snapshot of general data for revert on cancel and dirty check. Updated on load and after successful update. */
  const [generalDataSnapshot, setGeneralDataSnapshot] = useState<{
    code: string;
    name: string;
    observations: string;
    brandId: string;
    categoryId: string;
    taxId: string;
  } | null>(null);
  const [expandedVariantIndex, setExpandedVariantIndex] = useState<number | null>(null);
  const [originalVariantSnapshot, setOriginalVariantSnapshot] = useState<VariantRow | null>(null);
  /** Input value for "add additional barcode" per variant index. */
  const [additionalBarcodeInputByIndex, setAdditionalBarcodeInputByIndex] = useState<Record<number, string>>({});
  /** When set, the tag at (variantIndex, barcodeIndex) is in "edit description" mode. */
  const [editingBarcodeDescription, setEditingBarcodeDescription] = useState<{
    variantIndex: number;
    barcodeIndex: number;
  } | null>(null);
  const [tariffLabels, setTariffLabels] = useState<Record<string, string>>({ ...DEFAULT_TARIFF_LABELS });
  const [profitabilityConfig, setProfitabilityConfig] = useState<{
    defaultPercentages: Record<string, number>;
    profiles: Array<{ name?: string; categoryIds: string[]; percentages: Record<string, number> }>;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { toast } = useToast();
  const pricing = usePriceCalculation({
    variants,
    setVariants,
    taxId,
    taxes,
    toast,
  });
  const {
    handleSalePriceCalculation,
    handlePvpCalculation,
    handleCostToPriceCalculation,
    applyPctRentBlurOrEnter,
    applyPvpCellBlurOrEnter,
    refreshRentabilidadOnCostBlur,
    handleFractionSalePriceCalculation,
    handleFractionPvpCalculation,
    applyFractionPctRentBlurOrEnter,
  } = pricing;
  const effectiveArticleId = initialData?.id ?? savedArticleId ?? null;
  const isEditing = Boolean(initialData) || Boolean(savedArticleId);
  /** General tab fields are read-only when existing article and not in edit mode. */
  const generalFieldsDisabled = Boolean(effectiveArticleId) && !generalTabEditMode;

  const activeProfileName = profitabilityConfig
    ? categoryId
      ? (() => {
          const p = profitabilityConfig.profiles.find((prof) => prof.categoryIds.includes(categoryId));
          return p ? (p.name || "Sin nombre") : "Por defecto";
        })()
      : "Por defecto"
    : "";

  /** Validación General tab: campos obligatorios (categoría, código maestro, nombre base, IVA). Solo datos del artículo. */
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

  /** Validación para variantes: General ok + al menos una variante completa (SKU, barras, costo, medida). */
  const { canSave, validationMessage } = useMemo(() => {
    const atLeastOneVariantOk = variants.some((v) => {
      const skuOk = Boolean(v.sku?.trim());
      const barcodeOk = Boolean(v.barcode?.trim());
      const costNum = parseFloat(String(v.cost)) || 0;
      const costOk = costNum > 0;
      const costIncIvaVal =
        v.costIncIva != null ? String(v.costIncIva).trim() : "";
      const costIncIvaOk =
        costIncIvaVal !== "" || (costNum > 0 && Boolean(taxId?.trim()));
      const measureOk = Boolean(v.measureId?.trim());
      return skuOk && barcodeOk && costOk && costIncIvaOk && measureOk;
    });
    const canSave = canSaveGeneral && atLeastOneVariantOk;
    let message = validationMessageGeneral;
    if (message) return { canSave, validationMessage: message };
    if (!atLeastOneVariantOk)
      message =
        "Complete al menos una variante: SKU, Código de barras, Costo SIN IVA, Costo INC IVA y Medida.";
    return { canSave, validationMessage: message };
  }, [canSaveGeneral, validationMessageGeneral, categoryId, code, name, taxId, variants]);

  /** Habilitar "Añadir Variante" cuando el artículo tiene id y nadie está editando. */
  const canAddVariant = effectiveArticleId != null && editingVariantIndex === null;

  /** General tab has unsaved changes (vs snapshot). */
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

  /** Variants tab: a variant form is open (adding new or editing existing). Blocks tab switch until Save or Cancel. */
  const isVariantFormOpen = editingVariantIndex !== null;

  /** Variants tab has unsaved changes (variant being edited has modifications). */
  const isVariantsDirty =
    editingVariantIndex !== null && isVariantDirty(editingVariantIndex);

  /** Form is "locked" when General has unsaved changes or a variant form is open (add/edit). Used for tab/dialog/beforeunload guards. */
  const isFormLocked = isGeneralDirty || isVariantFormOpen;

  /** Form is "empty" when key general fields are not filled (category, master code, base name). Used for new-article tab guard. */
  const isFormEmpty = useMemo(
    () =>
      !categoryId?.trim() &&
      !code?.trim() &&
      !name?.trim(),
    [categoryId, code, name]
  );

  /** Variantes tab is only available after the article has a persistent id (saved). */
  const isVariantsTabDisabled = !effectiveArticleId;

  /** Unsaved-changes confirmation: pendingTab = tab to switch to, or null = user wanted to close dialog. */
  const [unsavedConfirmOpen, setUnsavedConfirmOpen] = useState(false);
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  /** Confirmation for "Nuevo" when there are unsaved changes. */
  const [nuevoConfirmOpen, setNuevoConfirmOpen] = useState(false);

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

  /** Build a single variant payload for POST/PATCH article-variants. */
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

  /** Map API variant response to local state. */
  function mapApiVariantsToState(apiVariants: Array<Record<string, unknown>>) {
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
      const fractionPrices = emptyPrices();
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
        fractionPrices,
      };
    });
  }

  /** Saves only General tab data (Article entity). Excludes variants. Uses dedicated /general endpoints. */
  async function saveGeneralArticleData() {
    if (!canSaveGeneral) {
      toast({
        title: "Datos incompletos",
        description: validationMessageGeneral || "Complete Categoría, Código maestro, Nombre base e IVA.",
        variant: "destructive",
      });
      return;
    }
    /** Payload solo datos generales, sin variantes ni campos de variante. */
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
        const data = await res.json().catch(() => ({}));
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
      } else {
        const res = await apiFetch(
          `/articles/company/${companyId}/general`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            credentials: "include",
          }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message ?? "Error al guardar");
        if (data?.id) {
          setSavedArticleId(data.id);
          setGeneralDataSnapshot({
            code: code.trim(),
            name: name.trim(),
            observations: observations.trim(),
            brandId: brandId || "",
            categoryId: categoryId || "",
            taxId: taxId || "",
          });
        }
        const apiVariants = data?.variants ?? [];
        setVariantsWithBatches(
          apiVariants.map((v: { id: string; sku: string; batches?: Batch[] }) => ({
            id: v.id,
            sku: v.sku,
            batches: v.batches ?? [],
          }))
        );
        setVariants(
          apiVariants.length > 0 ? mapApiVariantsToState(apiVariants) : []
        );
        if (categoryId) void applyCategoryCodes(categoryId);
        setActiveTab("variants");
        setEditingVariantIndex(null);
        setExpandedVariantIndex(null);
        setOriginalVariantSnapshot(null);
        router.refresh();
        toast({ title: "Artículo creado", description: "Los datos se han guardado correctamente." });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "No se pudo guardar.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  /** Saves a single variant: POST for new, PATCH for existing. Only enabled when article has valid id. */
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
        (allVariants as Array<{ id: string; sku: string; batches?: Batch[] }>).map((vr) => ({
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

  useEffect(() => {
    setLocalBrands(brands);
    setLocalCategories(categories);
    setLocalMeasures(measures);
    setLocalColors(colors);
    setLocalSizes(sizes);
    setLocalFlavors(flavors);
  }, [brands, categories, measures, colors, sizes, flavors]);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setSavedArticleId(null);
        setCode(initialData.code ?? "");
        setName(initialData.name);
        setObservations(initialData.observations ?? "");
        setBrandId(initialData.brandId ?? "");
        setCategoryId(initialData.categoryId ?? "");
        setTaxId(initialData.taxId ?? "");
        setGeneralDataSnapshot({
          code: initialData.code ?? "",
          name: initialData.name,
          observations: initialData.observations ?? "",
          brandId: initialData.brandId ?? "",
          categoryId: initialData.categoryId ?? "",
          taxId: initialData.taxId ?? "",
        });
        setGeneralTabEditMode(false);
        setImages(initialData.images ?? []);
        setVariantsWithBatches(
          (initialData.variants ?? []).map((v) => ({
            id: v.id,
            sku: v.sku,
            batches: v.batches ?? [],
          }))
        );
        setVariants(
          (initialData.variants?.length ?? 0) > 0
            ? initialData.variants!.map((v) => {
                const p = v.prices?.[0];
                const costNum = Number(v.cost ?? 0);
                const ivaPct = initialData.taxId ? (taxes.find((t) => t.id === initialData.taxId)?.percentage ?? 0) : 0;
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
              })
            : []
        );
        if (initialData.categoryId) void applyCategoryCodes(initialData.categoryId);
        setEditingVariantIndex(null);
        setExpandedVariantIndex(null);
        setOriginalVariantSnapshot(null);
      } else {
        setSavedArticleId(null);
        setCategorySecuencialInfo(null);
        setEditingVariantIndex(null);
        setExpandedVariantIndex(null);
        setOriginalVariantSnapshot(null);
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
        setImages([]);
        setVariantsWithBatches([]);
        setVariants([]);
        setAdditionalBarcodeInputByIndex({});
        setEditingBarcodeDescription(null);
      }
    }
  }, [open, initialData]);

  // Aplica porcentajes de rentabilidad del perfil o por defecto cuando cambia la categoría
  useEffect(() => {
    if (!profitabilityConfig || isEditing) return;
    const profile = categoryId ? profitabilityConfig.profiles.find((p) => p.categoryIds.includes(categoryId)) : null;
    const percentages = profile?.percentages ?? profitabilityConfig.defaultPercentages ?? {};
    setVariants((prev) =>
      prev.map((v) => {
        const prices = { ...v.prices } as Record<string, string>;
        for (const key of TARIFAS_KEYS) {
          const pct = percentages[String(key)] ?? 0;
          prices[`porcentajeRentabilidad${key}`] = String(pct);
        }
        return { ...v, prices: prices as PricesRow };
      })
    );
  }, [categoryId, profitabilityConfig, isEditing]);

  /** Aviso nativo del navegador al recargar/cerrar pestaña si hay cambios sin guardar. */
  useEffect(() => {
    if (!open || !isFormLocked) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [open, isFormLocked]);

  /** Al seleccionar categoría: auto-rellenar código, SKU y código de barras (solo en modo nuevo artículo) */
  function handleCategoryChange(newCategoryId: string) {
    setCategoryId(newCategoryId);
    if (!newCategoryId) {
      setCategorySecuencialInfo(null);
      return;
    }
    applyCategoryCodes(newCategoryId);
  }

  async function applyCategoryCodes(catId: string) {
    let cat = localCategories.find((c) => c.id === catId) as Category | undefined;
    const hasSeqVar = cat?.secuencialVariantes != null || cat?.secuencial_variantes != null;
    const needsFetch = !cat?.siglas && cat?.secuencial == null && !hasSeqVar;
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
    const siglas = cat?.siglas?.trim();
    const secuencial = cat?.secuencial;
    const secuencialVariantes = cat?.secuencialVariantes ?? cat?.secuencial_variantes;
    if (secuencial != null && secuencialVariantes != null) {
      setCategorySecuencialInfo({ secuencial, secuencialVariantes });
    }
    if (siglas != null && secuencial != null && secuencialVariantes != null && !isEditing) {
      // Código maestro: SIGLAS + SECUENCIAL
      setCode(siglas + String(secuencial));
      // SKU: "SKU" + SIGLAS + SECUENCIAL_VARIANTES | Código barras: "CB" + SIGLAS + SECUENCIAL_VARIANTES
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

  function addVariant() {
    const cat = localCategories.find((c) => c.id === categoryId) as Category | undefined;
    const siglas = cat?.siglas?.trim();
    const secuencialVariante =
      categorySecuencialInfo?.secuencialVariantes ??
      cat?.secuencialVariantes ??
      cat?.secuencial_variantes;

    let sku = "";
    let barcode = "";
    if (siglas != null && secuencialVariante != null) {
      const num = secuencialVariante + variants.length;
      sku = "SKU" + siglas + String(num);
      barcode = "CB" + siglas + String(num);
    }

    const baseVariant = { ...emptyVariant(), sku, barcode };

    // Initialize PVP table with price profile: category-based or default
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
      setEditingBarcodeDescription((prev) => prev ? { ...prev, variantIndex: prev.variantIndex - 1 } : null);
    }
  }

  function updateVariant(
    index: number,
    field: keyof VariantRow,
    value: string | VariantRow["prices"] | AdditionalBarcode[] | boolean | FractionConfig[],
  ) {
    setVariants((prev) => {
      const next = [...prev];
      (next[index] as Record<string, unknown>)[field] = value;
      return next;
    });
  }

  /**
   * Sincronización bidireccional de costes: al editar un campo, actualiza el otro usando IVA.
   * Usa roundToFive para todos los cálculos. No dispara bucle infinito porque cada onChange
   * solo actualiza estado (no re-dispara el onChange del otro campo).
   */
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

  /** Comprueba si un código de barras está disponible (no usado por otra variante/artículo). */
  async function checkBarcodeAvailable(
    barcode: string,
    excludeVariantId?: string | null,
  ): Promise<boolean> {
    const trimmed = barcode?.trim();
    if (!trimmed) return false;
    try {
      const params = new URLSearchParams({ barcode: trimmed });
      if (excludeVariantId) params.set("excludeVariantId", excludeVariantId);
      const res = await apiFetch(
        `/articles/company/${companyId}/check-barcode?${params.toString()}`,
        { credentials: "include" },
      );
      if (!res.ok) return false;
      const data = (await res.json()) as { available?: boolean };
      return data.available === true;
    } catch {
      return false;
    }
  }

  /** Añade un código de barras adicional a la variante tras comprobar unicidad. */
  async function addAdditionalBarcode(variantIndex: number) {
    const input = (additionalBarcodeInputByIndex[variantIndex] ?? "").trim();
    if (!input) return;
    const v = variants[variantIndex];
    if (!v) return;
    const alreadyInList = (v.additionalBarcodes ?? []).some(
      (b) => b.barcode.trim().toLowerCase() === input.toLowerCase(),
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

  /** Elimina un código de barras adicional. */
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

  /** Actualiza la descripción de un código de barras adicional. */
  function updateAdditionalBarcodeDescription(variantIndex: number, barcodeIndex: number, description: string) {
    const v = variants[variantIndex];
    if (!v) return;
    const list = [...(v.additionalBarcodes ?? [])];
    if (list[barcodeIndex]) list[barcodeIndex] = { ...list[barcodeIndex], description };
    updateVariant(variantIndex, "additionalBarcodes", list);
    setEditingBarcodeDescription(null);
  }

  /** Activa/desactiva unidades fraccionarias. Al activar, añade una fracción si la lista está vacía. */
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

  /** Actualiza un campo de una fracción. */
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

  /** Añade otra fracción a la variante. */
  function addFraction(variantIndex: number) {
    const v = variants[variantIndex];
    if (!v) return;
    updateVariant(variantIndex, "fractions", [...(v.fractions ?? []), { fraction_name: "", conversion_factor: "" }]);
  }

  /** Elimina una fracción. */
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

  /**
   * Actualización reactiva al cambiar el IVA a nivel artículo: recalcula PVP y Valor Rent. INC IVA
   * en todas las filas de tarifas. Mantiene precio_venta y % Rent sin cambios. También actualiza
   * el coste INC IVA de cada variante para coherencia.
   */
  function handleTaxChange(newTaxId: string) {
    const newIvaPct = newTaxId ? (taxes.find((t) => t.id === newTaxId)?.percentage ?? 0) : 0;
    setTaxId(newTaxId);
    setVariants((prev) =>
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
    if (!profitabilityConfig) return;
    const profile = categoryId
      ? profitabilityConfig.profiles.find((p) => p.categoryIds.includes(categoryId))
      : null;
    const percentages = profile?.percentages ?? profitabilityConfig.defaultPercentages ?? {};
    const ivaPct = taxId ? (taxes.find((t) => t.id === taxId)?.percentage ?? 0) : 0;

    setVariants((prev) =>
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
        throw new Error(err.message ?? "Error al crear lote");
      }
      const batch = await res.json();
      setVariantsWithBatches((prev) =>
        prev.map((v) =>
          v.id === variantId
            ? { ...v, batches: [...v.batches, batch] }
            : v
        )
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
        prev.map((v) =>
          v.id === variantId ? { ...v, batches: v.batches.filter((b) => b.id !== batchId) } : v
        )
      );
      router.refresh();
      toast({ title: "Lote eliminado", description: "El lote se ha eliminado correctamente." });
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar.", variant: "destructive" });
    }
  }

  /** Reverts general tab to snapshot and exits edit mode (existing article). */
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
    if (activeTab === "general" && isGeneralDirty && generalDataSnapshot != null) {
      setCode(generalDataSnapshot.code);
      setName(generalDataSnapshot.name);
      setObservations(generalDataSnapshot.observations);
      setBrandId(generalDataSnapshot.brandId);
      setCategoryId(generalDataSnapshot.categoryId);
      setTaxId(generalDataSnapshot.taxId);
      setGeneralTabEditMode(false);
    }
    if (activeTab === "variants" && isVariantFormOpen) cancelEditVariant();
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

  /** Full reset to "new article" mode: General tab, clear all state, clear article id. Próximo Secuencial is cleared (no category). */
  function performResetToNew() {
    setActiveTab("general");
    setSavedArticleId(null);
    setCategorySecuencialInfo(null);
    setEditingVariantIndex(null);
    setExpandedVariantIndex(null);
    setOriginalVariantSnapshot(null);
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
    setImages([]);
    setVariantsWithBatches([]);
    setVariants([]);
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
              if (effectiveArticleId && generalTabEditMode) saveGeneralArticleData();
              else if (!effectiveArticleId) saveGeneralArticleData();
            }}
            className="flex flex-col min-h-0 flex-1 overflow-hidden"
          >
            <GeneralTab
              companyId={companyId}
              categoryId={categoryId}
              onCategoryChange={handleCategoryChange}
              localCategories={localCategories}
              setLocalCategories={setLocalCategories}
              brandId={brandId}
              onBrandIdChange={setBrandId}
              localBrands={localBrands}
              setLocalBrands={setLocalBrands}
              code={code}
              onCodeChange={setCode}
              name={name}
              onNameChange={setName}
              categorySecuencialInfo={categorySecuencialInfo}
              taxId={taxId}
              onTaxChange={handleTaxChange}
              taxes={taxes}
              observations={observations}
              onObservationsChange={setObservations}
              generalFieldsDisabled={generalFieldsDisabled}
              generalTabEditMode={generalTabEditMode}
            />

            <VariantsTab
              code={code}
              name={name}
              categoryId={categoryId}
              categoryName={
                localCategories.find((c) => c.id === categoryId)?.name ?? "Sin Categoría"
              }
              categorySecuencialInfo={categorySecuencialInfo}
              companyId={companyId}
              canAddVariant={canAddVariant}
              effectiveArticleId={effectiveArticleId}
              canSave={canSave}
              variants={variants}
              addVariant={addVariant}
              removeVariant={removeVariant}
              editingVariantIndex={editingVariantIndex}
              setEditingVariantIndex={setEditingVariantIndex}
              expandedVariantIndex={expandedVariantIndex}
              setExpandedVariantIndex={setExpandedVariantIndex}
              localMeasures={localMeasures}
              setLocalMeasures={setLocalMeasures}
              localColors={localColors}
              setLocalColors={setLocalColors}
              localSizes={localSizes}
              setLocalSizes={setLocalSizes}
              localFlavors={localFlavors}
              setLocalFlavors={setLocalFlavors}
              taxId={taxId}
              taxes={taxes}
              tariffLabels={tariffLabels}
              pricing={pricing}
              focusPriceCellBelow={focusPriceCellBelow}
              focusPctRentBelow={focusPctRentBelow}
              updateVariant={updateVariant}
              updateVariantPriceField={updateVariantPriceField}
              updateVariantFractionPriceField={updateVariantFractionPriceField}
              handleCostChange={handleCostChange}
              handleCostIncIvaChange={handleCostIncIvaChange}
              toggleFractionEnabled={toggleFractionEnabled}
              updateFractionField={updateFractionField}
              addFraction={addFraction}
              removeFraction={removeFraction}
              additionalBarcodeInputByIndex={additionalBarcodeInputByIndex}
              setAdditionalBarcodeInputByIndex={setAdditionalBarcodeInputByIndex}
              editingBarcodeDescription={editingBarcodeDescription}
              setEditingBarcodeDescription={setEditingBarcodeDescription}
              addAdditionalBarcode={addAdditionalBarcode}
              removeAdditionalBarcode={removeAdditionalBarcode}
              updateAdditionalBarcodeDescription={updateAdditionalBarcodeDescription}
              isVariantDirty={isVariantDirty}
              saveSingleVariant={saveSingleVariant}
              cancelEditVariant={cancelEditVariant}
              startEditVariant={startEditVariant}
              activeProfileName={activeProfileName}
              profitabilityConfig={profitabilityConfig}
              applyProfilePercentages={applyProfilePercentages}
              formatCostIncIva={formatCostIncIva}
            />

            <TabsContent value="inventory" className="flex-1 overflow-y-auto min-h-0 mt-0 p-4 sm:p-6 md:p-8 space-y-4 data-[state=inactive]:hidden">
              {!isEditing ? (
                <p className="text-slate-500 text-sm">Guarda el artículo primero para gestionar lotes por variante.</p>
              ) : variantsWithBatches.length === 0 ? (
                <p className="text-slate-500 text-sm">Guarda las variantes para añadir lotes.</p>
              ) : (
                <div className="space-y-6">
                  {variantsWithBatches.map((v) => (
                    <div key={v.id} className="border rounded-lg p-4">
                      <h4 className="font-medium text-sm mb-3">Variante: {v.sku}</h4>
                      <BatchForm
                        variantId={v.id}
                        batches={v.batches}
                        onAdd={addBatch}
                        onRemove={removeBatch}
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
                      {!generalTabEditMode ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setGeneralTabEditMode(true)}
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
                            onClick={cancelGeneralEdit}
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
