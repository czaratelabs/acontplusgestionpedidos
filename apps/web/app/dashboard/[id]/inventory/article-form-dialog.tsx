"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Star, Upload, Info, Pencil, X, Check, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CatalogSelectWithCreate } from "@/components/catalog-select-with-create";
import type { CatalogItem } from "@/lib/api-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const TARIFF_NAMES_KEY = "TARIFF_NAMES";
const TARIFF_PROFITABILITY_KEY = "TARIFF_PROFITABILITY";
const TARIFAS_KEYS = [1, 2, 3, 4, 5] as const;
const DEFAULT_TARIFF_LABELS: Record<string, string> = {
  "1": "Tarifa 1",
  "2": "Tarifa 2",
  "3": "Tarifa 3",
  "4": "Tarifa 4",
  "5": "Tarifa 5",
};

type PricesRow = {
  precioVenta1: string;
  precioVenta2: string;
  precioVenta3: string;
  precioVenta4: string;
  precioVenta5: string;
  pvp1: string;
  pvp2: string;
  pvp3: string;
  pvp4: string;
  pvp5: string;
  porcentajeRentabilidad1?: string;
  porcentajeRentabilidad2?: string;
  porcentajeRentabilidad3?: string;
  porcentajeRentabilidad4?: string;
  porcentajeRentabilidad5?: string;
  rentabilidad1?: string;
  rentabilidad2?: string;
  rentabilidad3?: string;
  rentabilidad4?: string;
  rentabilidad5?: string;
  rentabilidadIncIva1?: string;
  rentabilidadIncIva2?: string;
  rentabilidadIncIva3?: string;
  rentabilidadIncIva4?: string;
  rentabilidadIncIva5?: string;
};

const emptyPrices = (): PricesRow => ({
  precioVenta1: "0",
  precioVenta2: "0",
  precioVenta3: "0",
  precioVenta4: "0",
  precioVenta5: "0",
  pvp1: "0",
  pvp2: "0",
  pvp3: "0",
  pvp4: "0",
  pvp5: "0",
  porcentajeRentabilidad1: "0",
  porcentajeRentabilidad2: "0",
  porcentajeRentabilidad3: "0",
  porcentajeRentabilidad4: "0",
  porcentajeRentabilidad5: "0",
  rentabilidad1: "0",
  rentabilidad2: "0",
  rentabilidad3: "0",
  rentabilidad4: "0",
  rentabilidad5: "0",
  rentabilidadIncIva1: "0",
  rentabilidadIncIva2: "0",
  rentabilidadIncIva3: "0",
  rentabilidadIncIva4: "0",
  rentabilidadIncIva5: "0",
});

type Brand = { id: string; name: string };
type Category = { id: string; name: string; siglas?: string; secuencial?: number; secuencial_variantes?: number; secuencialVariantes?: number };
type Tax = { id: string; name: string; percentage: number };

type ArticleImage = { id: string; url: string; isMain: boolean; sortOrder: number };
type Batch = {
  id: string;
  batchNumber: string;
  expirationDate: string | null;
  currentStock: number;
};

type VariantRow = {
  id?: string;
  sku: string;
  barcode: string;
  cost: string;
  /** Valor mostrado para INC IVA; si no está definido se deriva de cost. Sincronizado bidireccionalmente con cost. */
  costIncIva?: string;
  colorId: string;
  sizeId: string;
  flavorId: string;
  measureId: string;
  weight: string;
  observations: string;
  prices: PricesRow;
};

const emptyVariant = (): VariantRow => ({
  sku: "",
  barcode: "",
  cost: "0",
  colorId: "",
  sizeId: "",
  flavorId: "",
  measureId: "",
  weight: "0",
  observations: "",
  prices: emptyPrices(),
});

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
  const [tariffLabels, setTariffLabels] = useState<Record<string, string>>({ ...DEFAULT_TARIFF_LABELS });
  const [profitabilityConfig, setProfitabilityConfig] = useState<{
    defaultPercentages: Record<string, number>;
    profiles: Array<{ name?: string; categoryIds: string[]; percentages: Record<string, number> }>;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { toast } = useToast();
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

  /** Mandatory variant fields: sku, barcode, cost (SIN IVA > 0), cost INC IVA, measure_id. Used to enable/disable Guardar and show validation. */
  function getVariantValidation(index: number): { valid: boolean; message: string } {
    const v = variants[index];
    if (!v) return { valid: false, message: "Variante no encontrada." };
    const missing: string[] = [];
    if (!v.sku?.trim()) missing.push("SKU");
    if (!v.barcode?.trim()) missing.push("Código de barras");
    const costNum = parseFloat(String(v.cost)) || 0;
    if (costNum <= 0) missing.push("Precio de Costo SIN IVA (mayor a cero)");
    const costIncIvaVal = v.costIncIva != null ? String(v.costIncIva).trim() : "";
    const costIncIvaNum = parseFloat(costIncIvaVal) || 0;
    const costIncIvaOk = (costIncIvaVal !== "" && costIncIvaNum > 0) || (costNum > 0 && Boolean(taxId?.trim()));
    if (!costIncIvaOk) missing.push("Precio de Costo INC IVA (mayor a cero)");
    if (!v.measureId?.trim()) missing.push("Medida");
    const valid = missing.length === 0;
    const message = valid ? "" : "Complete los campos obligatorios: " + missing.join(", ") + ".";
    return { valid, message };
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
    return {
      sku: vr.sku.trim(),
      barcode: vr.barcode?.trim() || null,
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
      return {
        id: vr.id as string,
        sku: String(vr.sku ?? ""),
        barcode: String(vr.barcode ?? ""),
        cost: formatDecimal(vr.cost ?? 0),
        colorId: String(vr.colorId ?? ""),
        sizeId: String(vr.sizeId ?? ""),
        flavorId: String(vr.flavorId ?? ""),
        measureId: String(vr.measureId ?? ""),
        weight: String(vr.weight ?? 0),
        observations: String(vr.observations ?? ""),
        prices,
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
        const res = await fetch(
          `${API_BASE}/articles/${effectiveArticleId}/general?companyId=${encodeURIComponent(companyId)}`,
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
        const res = await fetch(
          `${API_BASE}/articles/company/${companyId}/general`,
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
    const { valid, message } = getVariantValidation(index);
    if (!valid) {
      toast({ title: "Datos incompletos", description: message, variant: "destructive" });
      return;
    }
    const payload = buildSingleVariantPayload(index);
    if (!payload) return;

    const isNew = !v.id;
    const hasChanges = isNew || isVariantDirty(index);
    if (!hasChanges) return;

    setLoading(true);
    try {
      const url = isNew
        ? `${API_BASE}/articles/${effectiveArticleId}/variants?companyId=${encodeURIComponent(companyId)}`
        : `${API_BASE}/articles/variants/${v.id}?companyId=${encodeURIComponent(companyId)}`;
      const method = isNew ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? "Error al guardar variante");

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
    fetch(`${API_BASE}/system-settings/${TARIFF_NAMES_KEY}?companyId=${encodeURIComponent(companyId)}`, {
      credentials: "include",
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { value?: string } | null) => {
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
    fetch(`${API_BASE}/system-settings/${TARIFF_PROFITABILITY_KEY}?companyId=${encodeURIComponent(companyId)}`, {
      credentials: "include",
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { value?: string } | null) => {
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
                return {
                  id: v.id,
                  sku: v.sku,
                  barcode: v.barcode ?? "",
                  cost: formatDecimal(v.cost ?? 0),
                  colorId: v.colorId ?? v.color?.id ?? "",
                  sizeId: v.sizeId ?? v.size?.id ?? "",
                  flavorId: v.flavorId ?? v.flavor?.id ?? "",
                  measureId: v.measureId ?? v.measureUnit?.id ?? "",
                  weight: String(v.weight ?? 0),
                  observations: v.observations ?? "",
                  prices,
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
        const res = await fetch(
          `${API_BASE}/articles/catalogs/company/${companyId}/categories/${catId}`,
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
  }

  function updateVariant(index: number, field: keyof VariantRow, value: string | VariantRow["prices"]) {
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

  /**
   * handleSalePriceCalculation: dispara al pulsar Enter o blur en celda Precio de Venta.
   * Afecta solo a la fila actual. Validación: vacío, 0 o < cost → poner todo a 0.
   * Si válido: PVP = precio_venta * (1 + IVA), % Rent, Valor Rent, Valor Rent INC IVA.
   * Usa roundToFive en todos los resultados.
   */
  function handleSalePriceCalculation(variantIndex: number, key: number) {
    const v = variants[variantIndex];
    if (!v) return;
    const cost = roundToFive(parseFloat(String(v.cost)) || 0, 5);
    const ivaPct = taxId ? (taxes.find((t) => t.id === taxId)?.percentage ?? 0) : 0;
    const costIncIva = ivaPct !== 0 ? roundToFive(cost * (1 + ivaPct / 100), 5) : cost;

    const raw = v.prices[`precioVenta${key}` as keyof PricesRow];
    const precioVentaNum = parseFloat(String(raw ?? "")) || 0;
    const isEmpty = raw === "" || raw == null;
    const isInvalid = isEmpty || precioVentaNum <= 0 || precioVentaNum <= cost;

    setVariants((prev) => {
      const next = [...prev];
      const curr = next[variantIndex];
      if (!curr?.prices) return prev;
      const prices = { ...(curr.prices as Record<string, string>) };

      if (isInvalid) {
        prices[`precioVenta${key}`] = "0";
        prices[`pvp${key}`] = "0";
        prices[`porcentajeRentabilidad${key}`] = "0";
        prices[`rentabilidad${key}`] = "0";
        prices[`rentabilidadIncIva${key}`] = "0";
      } else {
        const pv = roundToFive(precioVentaNum, 5);
        const pvp = roundToFive(pv * (1 + ivaPct / 100), 5);
        const pctRent = cost > 0 ? roundToFive(((pv - cost) / cost) * 100, 5) : 0;
        const valorRent = roundToFive(pv - cost, 5);
        const valorRentIncIva = roundToFive(pvp - costIncIva, 5);

        prices[`precioVenta${key}`] = formatDecimal(pv);
        prices[`pvp${key}`] = formatDecimal(pvp);
        prices[`porcentajeRentabilidad${key}`] = formatDecimal(pctRent);
        prices[`rentabilidad${key}`] = formatDecimal(valorRent);
        prices[`rentabilidadIncIva${key}`] = formatDecimal(valorRentIncIva);
      }

      next[variantIndex] = { ...curr, prices: prices as PricesRow };
      return next;
    });
  }

  /**
   * handlePvpCalculation: dispara al pulsar Enter o blur en celda PVP.
   * Afecta solo a la fila actual. Validación: vacío, 0 o < cost_inc_iva → poner todo a 0.
   * Si válido: precio_venta = pvp/(1+IVA), % Rent (markup), Valor Rent, Valor Rent INC IVA.
   * Usa roundToFive en todos los resultados.
   */
  function handlePvpCalculation(variantIndex: number, rowIndex: number) {
    const v = variants[variantIndex];
    if (!v) return;
    const cost = roundToFive(parseFloat(String(v.cost)) || 0, 5);
    const ivaPct = taxId ? (taxes.find((t) => t.id === taxId)?.percentage ?? 0) : 0;
    const costIncIva = ivaPct !== 0 ? roundToFive(cost * (1 + ivaPct / 100), 5) : cost;

    const raw = v.prices[`pvp${rowIndex}` as keyof PricesRow];
    const pvpNum = parseFloat(String(raw ?? "")) || 0;
    const isEmpty = raw === "" || raw == null;
    const isInvalid = isEmpty || pvpNum <= 0 || pvpNum <= costIncIva;

    setVariants((prev) => {
      const next = [...prev];
      const curr = next[variantIndex];
      if (!curr?.prices) return prev;
      const prices = { ...(curr.prices as Record<string, string>) };

      if (isInvalid) {
        prices[`precioVenta${rowIndex}`] = "0";
        prices[`pvp${rowIndex}`] = "0";
        prices[`porcentajeRentabilidad${rowIndex}`] = "0";
        prices[`rentabilidad${rowIndex}`] = "0";
        prices[`rentabilidadIncIva${rowIndex}`] = "0";
      } else {
        const pvp = roundToFive(pvpNum, 5);
        const precioVenta = ivaPct !== 0 ? roundToFive(pvp / (1 + ivaPct / 100), 5) : pvp;
        const pctRent = cost > 0 ? roundToFive(((precioVenta - cost) / cost) * 100, 5) : 0;
        const valorRent = roundToFive(precioVenta - cost, 5);
        const valorRentIncIva = roundToFive(pvp - costIncIva, 5);

        prices[`precioVenta${rowIndex}`] = formatDecimal(precioVenta);
        prices[`pvp${rowIndex}`] = formatDecimal(pvp);
        prices[`porcentajeRentabilidad${rowIndex}`] = formatDecimal(pctRent);
        prices[`rentabilidad${rowIndex}`] = formatDecimal(valorRent);
        prices[`rentabilidadIncIva${rowIndex}`] = formatDecimal(valorRentIncIva);
      }

      next[variantIndex] = { ...curr, prices: prices as PricesRow };
      return next;
    });
  }

  /** Dispara recalc desde una celda PVP con Manual Input Preservation: el campo editado mantiene su valor raw. Sin redirección de foco para permitir navegación libre. */
  function applyPvpCellBlurOrEnter(
    variantIndex: number,
    preserveField: "pctRent" | "precioVenta" | "pvp",
    key: number,
  ) {
    refreshRentabilidadOnCostBlur(variantIndex, undefined, { field: preserveField, key });
  }

  /**
   * Validación estricta para % Rent: default to zero, zero-value short circuit.
   * - Si vacío o < 0: normalizar a 0.
   * - Si valor = 0: limpiar fila (Precio Venta, PVP, rentabilidades a 0) sin cálculo.
   * - Si valor > 0: ejecutar cálculo completo.
   */
  function applyPctRentBlurOrEnter(variantIndex: number, key: number) {
    const v = variants[variantIndex];
    if (!v) return;
    const raw = v.prices[`porcentajeRentabilidad${key}` as keyof PricesRow];
    const numVal = parseFloat(String(raw ?? "")) || 0;
    const finalVal = numVal < 0 || raw === "" || raw == null ? 0 : numVal;

    if (finalVal === 0) {
      setVariants((prev) => {
        const next = [...prev];
        const curr = next[variantIndex];
        if (!curr?.prices) return prev;
        const prices = { ...(curr.prices as Record<string, string>) };
        prices[`porcentajeRentabilidad${key}`] = "0";
        prices[`precioVenta${key}`] = "0";
        prices[`pvp${key}`] = "0";
        prices[`rentabilidad${key}`] = "0";
        prices[`rentabilidadIncIva${key}`] = "0";
        next[variantIndex] = { ...curr, prices: prices as PricesRow };
        return next;
      });
    } else {
      applyPvpCellBlurOrEnter(variantIndex, "pctRent", key);
    }
  }

  /**
   * Función unificada: Input Cost → Calcular 5 tarifas → Redondear (numeric 18,4) → Mover foco a PVP1.
   * Única responsable del cálculo desde coste. Usada por ambos campos (SIN IVA e INC IVA).
   * @param source Si "incIva", toma costSinIva desde costIncIva para evitar race con state asíncrono.
   */
  function handleCostToPriceCalculation(
    variantIndex: number,
    source?: "sinIva" | "incIva",
    moveFocus?: boolean,
  ) {
    const v = variants[variantIndex];
    if (!v) return;
    const ivaPct = taxId ? (taxes.find((t) => t.id === taxId)?.percentage ?? 0) : 0;

    let costSinIva: number;
    if (source === "incIva") {
      const rawIncIva = parseFloat(String(v.costIncIva ?? v.cost)) || 0;
      costSinIva = roundToFive(costIncIvaToCost(rawIncIva, ivaPct), 5);
    } else {
      costSinIva = roundToFive(parseFloat(String(v.cost)) || 0, 5);
    }

    refreshRentabilidadOnCostBlur(variantIndex, costSinIva);
    if (moveFocus) focusPvp1WithScroll(variantIndex);
  }

  /** Mueve el foco a pvp1 (primera celda PVP de la tabla Tarifas PVP) con scroll suave. */
  function focusPvp1WithScroll(variantIndex: number) {
    setTimeout(() => {
      const el = document.getElementById(`pvp-${variantIndex}-1`);
      if (el instanceof HTMLInputElement) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
        el.focus();
      }
    }, 0);
  }

  /** Mueve el foco a precio_venta1 (primera celda Precio Venta) con scroll suave. */
  function focusPrecioVenta1WithScroll(variantIndex: number) {
    setTimeout(() => {
      const el = document.getElementById(`precioVenta-${variantIndex}-1`);
      if (el instanceof HTMLInputElement) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
        el.focus();
      }
    }, 0);
  }

  /** Navegación vertical: Enter mueve al siguiente row o vuelve a 1 si está en 5. */
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

  /** Navegación vertical en % Rent: Enter mueve al siguiente row o vuelve a 1 si está en 5. */
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

  type PreserveSourceField = { field: "pctRent" | "precioVenta" | "pvp"; key: number };

  function refreshRentabilidadOnCostBlur(
    variantIndex: number,
    costOverride?: string | number,
    preserveSourceField?: PreserveSourceField,
  ): boolean {
    const v = variants[variantIndex];
    if (!v) return false;
    const cost = costOverride != null ? parseFloat(String(costOverride)) || 0 : parseFloat(v.cost) || 0;
    const ivaPct = taxId ? (taxes.find((t) => t.id === taxId)?.percentage ?? 0) : 0;
    const costIncIva = ivaPct !== 0 ? cost * (1 + ivaPct / 100) : cost;

    if (cost <= 0 || costIncIva <= 0) {
      toast({
        title: "Costo inválido",
        description: "El Precio de Costo SIN IVA e INC IVA debe ser mayor a cero.",
        variant: "destructive",
      });
      const updatedPrices: Record<string, string> = { ...v.prices } as Record<string, string>;
      for (const key of TARIFAS_KEYS) {
        updatedPrices[`precioVenta${key}`] = "0";
        updatedPrices[`pvp${key}`] = "0";
        updatedPrices[`porcentajeRentabilidad${key}`] = "0";
        updatedPrices[`rentabilidad${key}`] = "0";
        updatedPrices[`rentabilidadIncIva${key}`] = "0";
      }
      setVariants((prev) => {
        const next = [...prev];
        const curr = next[variantIndex];
        if (!curr?.prices) return prev;
        next[variantIndex] = { ...curr, prices: updatedPrices as PricesRow };
        return next;
      });
      return false;
    }

    const updatedPrices: Record<string, string> = { ...v.prices } as Record<string, string>;
    for (const key of TARIFAS_KEYS) {
      const preserve = preserveSourceField?.key === key ? preserveSourceField.field : null;

      // Manual Input Preservation: nunca sobrescribir el campo fuente — mantener valor raw del usuario.
      const pctRent = parseFloat(v.prices[`porcentajeRentabilidad${key}` as keyof PricesRow] ?? "0") || 0;
      if (preserve !== "pctRent" && pctRent <= 0) {
        if (preserve !== "precioVenta") updatedPrices[`precioVenta${key}`] = "0";
        if (preserve !== "pvp") updatedPrices[`pvp${key}`] = "0";
        updatedPrices[`rentabilidad${key}`] = "0";
        updatedPrices[`rentabilidadIncIva${key}`] = "0";
        continue;
      }

      let precioVenta: number;
      let pvp: number;

      if (preserve === "precioVenta") {
        precioVenta = parseFloat(updatedPrices[`precioVenta${key}`] ?? "0") || 0;
        pvp = ivaPct === 0 ? precioVenta : precioVenta * (1 + ivaPct / 100);
      } else if (preserve === "pvp") {
        pvp = parseFloat(updatedPrices[`pvp${key}`] ?? "0") || 0;
        precioVenta = ivaPct === 0 ? pvp : pvp / (1 + ivaPct / 100);
      } else {
        precioVenta = cost + cost * (pctRent / 100);
        pvp = ivaPct === 0 ? precioVenta : precioVenta * (1 + ivaPct / 100);
      }

      const valorRent = roundToFive(precioVenta - cost, 5);
      const valorRentIncIva = roundToFive(pvp - costIncIva, 5);

      if (preserve !== "precioVenta") updatedPrices[`precioVenta${key}`] = formatDecimal(roundToFive(precioVenta, 5));
      if (preserve !== "pvp") updatedPrices[`pvp${key}`] = formatDecimal(roundToFive(pvp, 5));
      // Recalcular % Rent cuando la fuente es Precio de Venta o PVP: ((precioVenta - cost) / precioVenta) * 100
      if (preserve === "precioVenta" || preserve === "pvp") {
        const pctRentCalculated =
          precioVenta > 0 ? roundToFive(((precioVenta - cost) / precioVenta) * 100, 5) : 0;
        updatedPrices[`porcentajeRentabilidad${key}`] = formatDecimal(pctRentCalculated);
      }
      updatedPrices[`rentabilidad${key}`] = formatDecimal(valorRent);
      updatedPrices[`rentabilidadIncIva${key}`] = formatDecimal(valorRentIncIva);
    }

    // Depuración de decimales: roundToFive SOLO en celdas calculadas (dependientes). NUNCA en el campo fuente.
    // Manual Input Preservation: omitir si tiene foco O si es el campo que disparó el recalc (preserveSourceField).
    const activeId = typeof document !== "undefined" ? document.activeElement?.id ?? "" : "";
    for (const key of TARIFAS_KEYS) {
      const pvpVal = parseFloat(updatedPrices[`pvp${key}`] ?? "0") || 0;
      if (pvpVal <= 0) continue;

      const preserve = preserveSourceField?.key === key ? preserveSourceField.field : null;
      const pvpInputId = `pvp-${variantIndex}-${key}`;
      const precioVentaInputId = `precioVenta-${variantIndex}-${key}`;

      const skipPvpUpdate = preserve === "pvp" || activeId === pvpInputId;
      const skipPrecioVentaUpdate = preserve === "precioVenta" || activeId === precioVentaInputId;

      const roundedPvp = roundToFive(pvpVal, 5);
      const pvpSource = skipPvpUpdate ? pvpVal : roundedPvp;
      if (!skipPvpUpdate) {
        updatedPrices[`pvp${key}`] = formatDecimal(roundedPvp);
      }

      const precioVentaFromPvp = ivaPct === 0 ? pvpSource : pvpSource / (1 + ivaPct / 100);
      const roundedPrecioVenta = roundToFive(precioVentaFromPvp, 5);
      const precioVentaForRent = skipPrecioVentaUpdate
        ? parseFloat(updatedPrices[`precioVenta${key}`] ?? "0") || 0
        : roundedPrecioVenta;
      if (!skipPrecioVentaUpdate) {
        updatedPrices[`precioVenta${key}`] = formatDecimal(roundedPrecioVenta);
      }

      const roundedValorRent = roundToFive(precioVentaForRent - cost, 5);
      const roundedValorRentIncIva = roundToFive(pvpSource - costIncIva, 5);
      updatedPrices[`rentabilidad${key}`] = formatDecimal(roundedValorRent);
      updatedPrices[`rentabilidadIncIva${key}`] = formatDecimal(roundedValorRentIncIva);
    }

    setVariants((prev) => {
      const next = [...prev];
      const curr = next[variantIndex];
      if (!curr?.prices) return prev;
      next[variantIndex] = { ...curr, prices: updatedPrices as PricesRow };
      return next;
    });
    return true;
  }

  /** Asigna los porcentajes del perfil activo (o por defecto) a todas las variantes y recalcula precios. */
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
      const res = await fetch(
        `${API_BASE}/articles/${effectiveArticleId}/images?companyId=${encodeURIComponent(companyId)}&isMain=${isMain}`,
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
      await fetch(
        `${API_BASE}/articles/${effectiveArticleId}/images/${imageId}/main?companyId=${encodeURIComponent(companyId)}`,
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
      await fetch(
        `${API_BASE}/articles/${effectiveArticleId}/images/${imageId}?companyId=${encodeURIComponent(companyId)}`,
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
      const res = await fetch(
        `${API_BASE}/articles/variants/${variantId}/batches?companyId=${encodeURIComponent(companyId)}`,
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
      const res = await fetch(
        `${API_BASE}/articles/variants/${variantId}/batches/${batchId}?companyId=${encodeURIComponent(companyId)}`,
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
          {trigger ?? <Button className="bg-slate-900 hover:bg-slate-800">+ Nuevo Artículo</Button>}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1.5">
          <DialogTitle>{isEditing ? "Editar Artículo" : "Nuevo Artículo"}</DialogTitle>
          <div className="flex flex-col gap-3 pt-0.5 sm:flex-row sm:items-center sm:gap-4">
            <DialogDescription className="flex-1 min-w-0 sm:pr-4">
              Puedes guardar solo los datos generales (código, nombre, marca, etc.) y añadir variantes después.
            </DialogDescription>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleNuevoClick}
              className="shrink-0 self-end sm:self-center"
            >
              <Plus className="h-4 w-4 mr-1" />
              Nuevo
            </Button>
          </div>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-4">
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
            className="space-y-4"
          >
            <TabsContent value="general" className="space-y-3 mt-3">
              <div
                className={`rounded-lg border-2 transition-colors ${
                  generalTabEditMode ? "border-amber-200 bg-amber-50/30" : "border-transparent"
                } ${generalFieldsDisabled ? "opacity-90" : ""}`}
              >
              <fieldset disabled={generalFieldsDisabled} className="disabled:opacity-70 disabled:pointer-events-none [&_*]:disabled:pointer-events-none min-w-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 p-1">
                <div>
                  <Label className="text-xs">Categoría <span className="text-red-500">*</span></Label>
                  <CatalogSelectWithCreate
                    companyId={companyId}
                    catalogKey="categories"
                    items={localCategories}
                    value={categoryId}
                    onChange={handleCategoryChange}
                    onItemCreated={(item) => setLocalCategories((prev) => [...prev, item])}
                    placeholder="Seleccionar categoría"
                    emptyLabel="— Sin categoría —"
                    valueKey="id"
                    selectClassName="h-8 mt-0.5 w-full"
                  />
                </div>
                <div>
                  <Label className="text-xs">Marca</Label>
                  <CatalogSelectWithCreate
                    companyId={companyId}
                    catalogKey="brands"
                    items={localBrands}
                    value={brandId}
                    onChange={setBrandId}
                    onItemCreated={(item) => setLocalBrands((prev) => [...prev, item])}
                    placeholder="Seleccionar marca"
                    emptyLabel="— Sin marca —"
                    valueKey="id"
                    selectClassName="h-8 mt-0.5 w-full"
                  />
                </div>
                <div>
                  <Label htmlFor="code" className="text-xs flex items-center gap-1">
                    Código de artículo (Maestro) <span className="text-red-500">*</span>
                    <span
                      className="inline-flex text-slate-400 cursor-help"
                      title="Este código identifica al modelo del producto y agrupa todas sus variantes."
                    >
                      <Info className="h-3 w-3" />
                    </span>
                  </Label>
                  <Input
                    id="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Ej: CAM-001"
                    className="h-8 mt-0.5 w-full"
                  />
                </div>
                <div>
                  <Label htmlFor="name" className="text-xs">Nombre base <span className="text-red-500">*</span></Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Camiseta Básica"
                    className="h-8 mt-0.5 w-full"
                  />
                </div>
              </div>

              {/* Fila 1: Próximo Secuencial (informativo) + IVA — misma fila, dos columnas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4 p-1">
                {categoryId && categorySecuencialInfo && (
                  <div>
                    <Label className="text-xs text-slate-500">Próximo Secuencial Categoría (Código Maestro)</Label>
                    <Input
                      value={String(categorySecuencialInfo.secuencial)}
                      readOnly
                      aria-readonly="true"
                      className="h-8 mt-0.5 w-full bg-slate-50 dark:bg-slate-900/50 font-mono text-sm border-slate-200 cursor-default"
                    />
                  </div>
                )}
                <div className={!(categoryId && categorySecuencialInfo) ? "md:col-start-2" : ""}>
                  <Label className="text-xs">IVA <span className="text-red-500">*</span></Label>
                  <Select
                    value={taxId || "none"}
                    onValueChange={(v) => handleTaxChange(v === "none" ? "" : v)}
                  >
                    <SelectTrigger className="h-8 mt-0.5 w-full">
                      <SelectValue placeholder="Seleccionar impuesto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Sin impuesto —</SelectItem>
                      {taxes.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name} ({t.percentage}%)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Fila 2: Observaciones — ancho completo */}
              <div className="w-full p-1">
                <Label htmlFor="observations" className="text-xs">Observaciones (artículo)</Label>
                <Textarea
                  id="observations"
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Notas generales sobre el artículo..."
                  rows={2}
                  className="mt-0.5 min-h-[4.5rem] text-sm w-full"
                />
              </div>
              </fieldset>
              </div>
            </TabsContent>

            <TabsContent value="variants" className="space-y-4 mt-4">
              <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                <div className="flex items-center gap-4">
                  <Label>Variantes</Label>
                  {categoryId && categorySecuencialInfo && (
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-slate-500">Próximo Secuencial Variante (SKU / Barras):</Label>
                      <span className="text-sm font-mono font-medium bg-slate-100 px-2 py-1 rounded">
                        {categorySecuencialInfo.secuencialVariantes}
                      </span>
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addVariant}
                  disabled={!canAddVariant}
                  title={
                    !effectiveArticleId
                      ? "Guarde primero el artículo en la pestaña General"
                      : !canAddVariant
                        ? "Guarde la variante actual antes de añadir otra"
                        : undefined
                  }
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Añadir variante
                </Button>
              </div>
              <div className="space-y-2">
                {variants.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 py-12 px-4 text-center">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                      No hay variantes registradas
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addVariant}
                      disabled={!canAddVariant}
                      title={
                        !effectiveArticleId
                          ? "Guarde primero el artículo en la pestaña General"
                          : undefined
                      }
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Añadir variante
                    </Button>
                  </div>
                ) : (
                variants.map((v, i) => {
                  const isEditingThis = editingVariantIndex === i;
                  const isExpanded = expandedVariantIndex === i;
                  const canEditOther = editingVariantIndex == null;
                  return (
                  <Collapsible
                    key={i}
                    open={isExpanded}
                    onOpenChange={(open) => {
                      if (!open && isEditingThis) return;
                      setExpandedVariantIndex(open ? i : null);
                    }}
                  >
                    <Card className="overflow-hidden">
                      <CardHeader className="py-2.5 px-3 flex flex-row items-center justify-between space-y-0 bg-slate-50 border-b">
                        <CollapsibleTrigger asChild>
                          <div className="flex-1 flex flex-col gap-0.5 cursor-pointer min-w-0">
                            <CardTitle className="text-sm font-semibold text-slate-900">Variante {i + 1}</CardTitle>
                            <p className="text-xs text-slate-500 mt-0.5 font-normal truncate">
                              {[
                                v.sku?.trim() || "—",
                                code?.trim() || "",
                                name?.trim() || "",
                                v.measureId ? (localMeasures.find((m) => m.id === v.measureId)?.name ?? "") : "",
                                v.colorId ? (localColors.find((c) => c.id === v.colorId)?.name ?? "") : "",
                                v.sizeId ? (localSizes.find((s) => s.id === v.sizeId)?.name ?? "") : "",
                                v.flavorId ? (localFlavors.find((f) => f.id === v.flavorId)?.name ?? "") : "",
                                (() => {
                                  const w = parseFloat(String(v.weight)) || 0;
                                  return w > 0 ? String(roundToFive(w, 5)) : "";
                                })(),
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </div>
                        </CollapsibleTrigger>
                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          {isEditingThis ? (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={
                                  !effectiveArticleId ||
                                  (v.id ? !isVariantDirty(i) : !canSave) ||
                                  !getVariantValidation(i).valid
                                }
                                onClick={() => saveSingleVariant(i)}
                                title={
                                  !effectiveArticleId
                                    ? "Guarde primero el artículo en la pestaña General"
                                    : !getVariantValidation(i).valid
                                      ? getVariantValidation(i).message
                                      : undefined
                                }
                                className="h-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Guardar
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={cancelEditVariant}
                                className="h-7 text-slate-600 hover:text-slate-700"
                              >
                                <X className="h-4 w-4 mr-1" />
                                Cancelar
                              </Button>
                            </>
                          ) : (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              disabled={!canEditOther || !effectiveArticleId}
                              onClick={() => startEditVariant(i)}
                              title="Editar variante"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={variants.length === 0 || isEditingThis}
                            onClick={() => removeVariant(i)}
                            className="h-8 w-8 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CollapsibleContent>
                    <CardContent className="p-3 space-y-3">
                      <fieldset disabled={!isEditingThis} className="disabled:opacity-70 disabled:pointer-events-none [&_*]:disabled:pointer-events-none">
                      {/* Bloque principal: SKU, código barras, IVA (info), costo, medida y 5 tarifas PVP */}
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                          <div className="sm:col-span-2">
                            <Label htmlFor={`sku-${i}`} className="text-xs">SKU <span className="text-red-500">*</span></Label>
                            <Input
                              id={`sku-${i}`}
                              value={v.sku}
                              onChange={(e) => updateVariant(i, "sku", e.target.value)}
                              placeholder="Ej: SKU001"
                              className="h-8 mt-0.5 min-w-[140px]"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <Label htmlFor={`barcode-${i}`} className="text-xs">Código de barras <span className="text-red-500">*</span></Label>
                            <Input
                              id={`barcode-${i}`}
                              value={v.barcode}
                              onChange={(e) => updateVariant(i, "barcode", e.target.value)}
                              placeholder="Ej: 7891234567890"
                              className="h-8 mt-0.5 min-w-[140px]"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-slate-500">IVA (informativo)</Label>
                            <p className="text-xs font-medium text-slate-700 mt-0.5">
                              {taxId ? (taxes.find((t) => t.id === taxId)?.percentage ?? "—") : "—"}%
                            </p>
                          </div>
                          <div>
                            <Label htmlFor={`cost-${i}`} className="text-xs">Precio de Costo SIN IVA <span className="text-red-500">*</span></Label>
                            <Input
                              id={`cost-${i}`}
                              type="number"
                              min={0}
                              step={0.00001}
                              value={v.cost ?? ""}
                              onChange={(e) => handleCostChange(i, e.target.value)}
                              onFocus={(e) => e.currentTarget.select()}
                              onBlur={() => handleCostToPriceCalculation(i, "sinIva", false)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleCostToPriceCalculation(i, "sinIva", true);
                                }
                              }}
                              className="h-8 mt-0.5 w-full"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`costIncIva-${i}`} className="text-xs">Precio de Costo INC. IVA <span className="text-red-500">*</span></Label>
                            <Input
                              id={`costIncIva-${i}`}
                              type="number"
                              min={0}
                              step={0.00001}
                              value={v.costIncIva != null ? v.costIncIva : (v.cost === "" || v.cost == null) ? "" : formatCostIncIva(v.cost ?? 0, taxId ? (taxes.find((t) => t.id === taxId)?.percentage ?? 0) : 0)}
                              onChange={(e) => handleCostIncIvaChange(i, e.target.value)}
                              onFocus={(e) => e.currentTarget.select()}
                              onBlur={() => handleCostToPriceCalculation(i, "incIva", false)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleCostToPriceCalculation(i, "incIva", true);
                                }
                              }}
                              className="h-8 mt-0.5 w-full"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`measure-${i}`} className="text-xs">Medida <span className="text-red-500">*</span></Label>
                            <CatalogSelectWithCreate
                              companyId={companyId}
                              catalogKey="measures"
                              items={localMeasures}
                              value={v.measureId}
                              onChange={(val) => updateVariant(i, "measureId", val)}
                              onItemCreated={(item) => setLocalMeasures((prev) => [...prev, item])}
                              emptyLabel="— Seleccionar —"
                              valueKey="id"
                              selectClassName="h-8 mt-0.5 w-full"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="mb-1 block text-xs">Tarifas PVP</Label>
                          <div className="rounded border bg-slate-50/50 overflow-hidden max-w-4xl [&_th]:py-1 [&_th]:px-2 [&_td]:py-0.5 [&_td]:px-1.5">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-slate-100 border-b">
                                  <TableHead className="w-24 min-w-[6rem]">Tarifa</TableHead>
                                  <TableHead className="min-w-[8rem]">Precio Venta</TableHead>
                                  <TableHead className="min-w-[8rem]">PVP</TableHead>
                                  <TableHead className="min-w-[6.5rem]">% Rent.</TableHead>
                                  <TableHead className="min-w-[5.5rem]">Valor Rent.</TableHead>
                                  <TableHead className="min-w-[5.5rem]">Valor Rent. INC IVA</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {TARIFAS_KEYS.map((key) => (
                                  <TableRow key={key} className="border-b last:border-0">
                                    <TableCell className="font-medium text-xs">{tariffLabels[String(key)] ?? `Tarifa ${key}`}</TableCell>
                                    <TableCell className="p-0.5">
                                      <Input
                                        id={`precioVenta-${i}-${key}`}
                                        type="number"
                                        min={0}
                                        step={0.00001}
                                        value={v.prices[`precioVenta${key}` as keyof PricesRow] ?? ""}
                                        onChange={(e) => updateVariantPriceField(i, `precioVenta${key}` as keyof PricesRow, e.target.value)}
                                        onFocus={(e) => e.currentTarget.select()}
                                        onBlur={() => handleSalePriceCalculation(i, key)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleSalePriceCalculation(i, key);
                                            focusPriceCellBelow(i, "precioVenta", key);
                                          }
                                        }}
                                        className="h-7 w-full min-w-[7rem] max-w-[8.5rem] text-xs"
                                      />
                                    </TableCell>
                                    <TableCell className="p-0.5">
                                      <Input
                                        id={`pvp-${i}-${key}`}
                                        type="number"
                                        min={0}
                                        step={0.00001}
                                        value={v.prices[`pvp${key}` as keyof PricesRow] ?? ""}
                                        onChange={(e) => updateVariantPriceField(i, `pvp${key}` as keyof PricesRow, e.target.value)}
                                        onFocus={(e) => e.currentTarget.select()}
                                        onBlur={() => handlePvpCalculation(i, key)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handlePvpCalculation(i, key);
                                            focusPriceCellBelow(i, "pvp", key);
                                          }
                                        }}
                                        className="h-7 w-full min-w-[7rem] max-w-[8.5rem] text-xs"
                                      />
                                    </TableCell>
                                    <TableCell className="p-0.5">
                                      <Input
                                        id={`pctRent-${i}-${key}`}
                                        type="number"
                                        min={-100}
                                        step={0.00001}
                                        placeholder="%"
                                        value={v.prices[`porcentajeRentabilidad${key}` as keyof PricesRow] ?? ""}
                                        onChange={(e) => updateVariantPriceField(i, `porcentajeRentabilidad${key}` as keyof PricesRow, e.target.value)}
                                        onFocus={(e) => e.currentTarget.select()}
                                        onBlur={() => applyPctRentBlurOrEnter(i, key)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            applyPctRentBlurOrEnter(i, key);
                                            focusPctRentBelow(i, key);
                                          }
                                        }}
                                        className="h-7 w-full min-w-[5.5rem] max-w-[6.5rem] text-xs"
                                      />
                                    </TableCell>
                                    <TableCell className="py-0.5 px-1 min-w-[5rem]">
                                      <span className="text-xs text-slate-600 tabular-nums">
                                        {(v.prices[`rentabilidad${key}` as keyof PricesRow] ?? "") === ""
                                          ? ""
                                          : formatDecimal(v.prices[`rentabilidad${key}` as keyof PricesRow] ?? 0)}
                                      </span>
                                    </TableCell>
                                    <TableCell className="py-0.5 px-1 min-w-[5rem]">
                                      <span className="text-xs text-slate-600 tabular-nums">
                                        {(v.prices[`rentabilidadIncIva${key}` as keyof PricesRow] ?? "") === ""
                                          ? ""
                                          : formatDecimal(v.prices[`rentabilidadIncIva${key}` as keyof PricesRow] ?? 0)}
                                      </span>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                            <div className="px-1.5 py-1 border-t bg-white flex items-center justify-between gap-2 flex-wrap">
                              <Label className="text-xs text-slate-600 font-normal">
                                Perfil de tarifas: {activeProfileName || "—"}
                              </Label>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs text-slate-600"
                                onClick={applyProfilePercentages}
                                disabled={!profitabilityConfig}
                              >
                                Asignar porcentajes
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Campos opcionales */}
                      <div className="rounded border border-dashed border-slate-200 bg-slate-50/30 p-2.5 space-y-2">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Campos opcionales</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                          <div>
                            <Label className="text-xs text-slate-600">Color</Label>
                            <CatalogSelectWithCreate
                              companyId={companyId}
                              catalogKey="colors"
                              items={localColors}
                              value={v.colorId}
                              onChange={(val) => updateVariant(i, "colorId", val)}
                              onItemCreated={(item) => setLocalColors((prev) => [...prev, item])}
                              emptyLabel="—"
                              valueKey="id"
                              selectClassName="h-8 mt-0.5 w-full"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-slate-600">Talla</Label>
                            <CatalogSelectWithCreate
                              companyId={companyId}
                              catalogKey="sizes"
                              items={localSizes}
                              value={v.sizeId}
                              onChange={(val) => updateVariant(i, "sizeId", val)}
                              onItemCreated={(item) => setLocalSizes((prev) => [...prev, item])}
                              emptyLabel="—"
                              valueKey="id"
                              selectClassName="h-8 mt-0.5 w-full"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-slate-600">Sabor</Label>
                            <CatalogSelectWithCreate
                              companyId={companyId}
                              catalogKey="flavors"
                              items={localFlavors}
                              value={v.flavorId}
                              onChange={(val) => updateVariant(i, "flavorId", val)}
                              onItemCreated={(item) => setLocalFlavors((prev) => [...prev, item])}
                              emptyLabel="—"
                              valueKey="id"
                              selectClassName="h-8 mt-0.5 w-full"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-slate-600">Peso</Label>
                            <Input
                              type="number"
                              min={0}
                              step={0.00001}
                              value={v.weight}
                              onChange={(e) => updateVariant(i, "weight", e.target.value)}
                              placeholder="0"
                              className="h-8 mt-0.5 w-full"
                            />
                          </div>
                          <div className="sm:col-span-2 lg:col-span-4">
                            <Label className="text-xs text-slate-600">Observaciones (variante)</Label>
                            <Input
                              value={v.observations}
                              onChange={(e) => updateVariant(i, "observations", e.target.value)}
                              placeholder="Notas opcionales para esta variante"
                              className="h-8 mt-0.5 w-full"
                            />
                          </div>
                        </div>
                      </div>
                      {isEditingThis && (
                        <div className="flex justify-end gap-2 pt-3 mt-3 border-t border-slate-200">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={
                              !effectiveArticleId ||
                              (v.id ? !isVariantDirty(i) : !canSave) ||
                              !getVariantValidation(i).valid
                            }
                            onClick={() => saveSingleVariant(i)}
                            title={
                              !effectiveArticleId
                                ? "Guarde primero el artículo en la pestaña General"
                                : !getVariantValidation(i).valid
                                  ? getVariantValidation(i).message
                                  : undefined
                            }
                            className="h-8 text-green-600 border-green-200 hover:bg-green-50 hover:border-green-300"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Guardar
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={cancelEditVariant}
                            className="h-8 text-slate-600"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Cancelar
                          </Button>
                        </div>
                      )}
                      </fieldset>
                    </CardContent>
                    </CollapsibleContent>
                    </Card>
                  </Collapsible>
                );}) )}
              </div>
            </TabsContent>

            <TabsContent value="inventory" className="space-y-4 mt-4">
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

            <TabsContent value="photos" className="space-y-4 mt-4">
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
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2" role="status">
                {validationMessage}
              </p>
            )}
            <DialogFooter className="pt-4 flex-wrap gap-2">
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
                        >
                          <Pencil className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                      ) : (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={cancelGeneralEdit}
                            disabled={loading}
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="button"
                            disabled={loading || !isGeneralDirty}
                            onClick={saveGeneralArticleData}
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
                    >
                      {loading ? "Guardando..." : "Guardar"}
                    </Button>
                  )}
                </>
              )}
              <Button type="button" variant="ghost" onClick={() => handleDialogOpenChange(false)}>
                Salir
              </Button>
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
