"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Star, Upload, Info } from "lucide-react";
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
type Category = { id: string; name: string };
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
  /** Valor mostrado para INC IVA; si no está definido se deriva de cost. Solo se actualiza en blur/enter (campo opuesto). */
  costIncIva?: string;
  colorId: string;
  sizeId: string;
  flavorId: string;
  measure: string;
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
  measure: "",
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

type CatalogItem = { id: string; name: string };
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
      measure?: string | null;
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
  const [variants, setVariants] = useState<VariantRow[]>([emptyVariant()]);
  const [images, setImages] = useState<ArticleImage[]>([]);
  const [variantsWithBatches, setVariantsWithBatches] = useState<
    Array<{ id: string; sku: string; batches: Batch[] }>
  >([]);
  const [tariffLabels, setTariffLabels] = useState<Record<string, string>>({ ...DEFAULT_TARIFF_LABELS });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { toast } = useToast();
  const isEditing = Boolean(initialData);

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
        setCode(initialData.code ?? "");
        setName(initialData.name);
        setObservations(initialData.observations ?? "");
        setBrandId(initialData.brandId ?? "");
        setCategoryId(initialData.categoryId ?? "");
        setTaxId(initialData.taxId ?? "");
        setImages(initialData.images ?? []);
        setVariantsWithBatches(
          (initialData.variants ?? []).map((v) => ({
            id: v.id,
            sku: v.sku,
            batches: v.batches ?? [],
          }))
        );
        setVariants(
          initialData.variants?.length
            ? initialData.variants.map((v) => ({
                id: v.id,
                sku: v.sku,
                barcode: v.barcode ?? "",
                cost: formatDecimal(v.cost ?? 0),
                colorId: v.colorId ?? v.color?.id ?? "",
                sizeId: v.sizeId ?? v.size?.id ?? "",
                flavorId: v.flavorId ?? v.flavor?.id ?? "",
                measure: v.measure ?? "",
                weight: String(v.weight ?? 0),
                observations: v.observations ?? "",
                prices: (() => {
                  const p = v.prices?.[0];
                  return {
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
                    porcentajeRentabilidad1: p?.porcentajeRentabilidad1 != null ? formatDecimal(p.porcentajeRentabilidad1) : "0",
                    porcentajeRentabilidad2: p?.porcentajeRentabilidad2 != null ? formatDecimal(p.porcentajeRentabilidad2) : "0",
                    porcentajeRentabilidad3: p?.porcentajeRentabilidad3 != null ? formatDecimal(p.porcentajeRentabilidad3) : "0",
                    porcentajeRentabilidad4: p?.porcentajeRentabilidad4 != null ? formatDecimal(p.porcentajeRentabilidad4) : "0",
                    porcentajeRentabilidad5: p?.porcentajeRentabilidad5 != null ? formatDecimal(p.porcentajeRentabilidad5) : "0",
                    rentabilidad1: p?.rentabilidad1 != null ? formatDecimal(p.rentabilidad1) : "0",
                    rentabilidad2: p?.rentabilidad2 != null ? formatDecimal(p.rentabilidad2) : "0",
                    rentabilidad3: p?.rentabilidad3 != null ? formatDecimal(p.rentabilidad3) : "0",
                    rentabilidad4: p?.rentabilidad4 != null ? formatDecimal(p.rentabilidad4) : "0",
                    rentabilidad5: p?.rentabilidad5 != null ? formatDecimal(p.rentabilidad5) : "0",
                    rentabilidadIncIva1: p?.rentabilidadIncIva1 != null ? formatDecimal(p.rentabilidadIncIva1) : "0",
                    rentabilidadIncIva2: p?.rentabilidadIncIva2 != null ? formatDecimal(p.rentabilidadIncIva2) : "0",
                    rentabilidadIncIva3: p?.rentabilidadIncIva3 != null ? formatDecimal(p.rentabilidadIncIva3) : "0",
                    rentabilidadIncIva4: p?.rentabilidadIncIva4 != null ? formatDecimal(p.rentabilidadIncIva4) : "0",
                    rentabilidadIncIva5: p?.rentabilidadIncIva5 != null ? formatDecimal(p.rentabilidadIncIva5) : "0",
                  };
                })(),
              }))
            : [emptyVariant()]
        );
      } else {
        setCode("");
        setName("");
        setObservations("");
        setBrandId("");
        setCategoryId("");
        setTaxId("");
        setImages([]);
        setVariantsWithBatches([]);
        setVariants([emptyVariant()]);
      }
    }
  }, [open, initialData]);

  function addVariant() {
    setVariants((prev) => [...prev, emptyVariant()]);
  }

  function removeVariant(index: number) {
    if (variants.length <= 1) return;
    setVariants((prev) => prev.filter((_, i) => i !== index));
  }

  function updateVariant(index: number, field: keyof VariantRow, value: string | VariantRow["prices"]) {
    setVariants((prev) => {
      const next = [...prev];
      (next[index] as Record<string, unknown>)[field] = value;
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

  /** Dispara recalc desde una celda PVP con Manual Input Preservation: el campo editado mantiene su valor raw. Sin redirección de foco para permitir navegación libre. */
  function applyPvpCellBlurOrEnter(
    variantIndex: number,
    preserveField: "pctRent" | "precioVenta" | "pvp",
    key: number,
  ) {
    refreshRentabilidadOnCostBlur(variantIndex, undefined, { field: preserveField, key });
  }

  /**
   * Al Enter en Precio de Costo SIN IVA:
   * - CRITICAL: No modificar NINGÚN campo de costo. Mantener ambos intactos.
   * - Usar cost (raw) solo para calcular tarifas PVP 1-5 y redondear resultados.
   * - Redirigir foco a PVP1.
   */
  function applyCostSinIvaBlurOrEnter(variantIndex: number) {
    const v = variants[variantIndex];
    if (!v) return;
    const rawSinIva = parseFloat(String(v.cost)) || 0;
    refreshRentabilidadOnCostBlur(variantIndex, rawSinIva);
  }

  /**
   * Al Enter en Precio de Costo INC IVA:
   * - CRITICAL: No modificar NINGÚN campo de costo. Mantener ambos intactos.
   * - Derivar cost internamente para cálculos de tarifas (no actualizar state).
   * - Calcular y redondear PVP 1-5 con roundToFive.
   * - Redirigir foco a PVP1.
   */
  function applyCostIncIvaBlurOrEnter(variantIndex: number) {
    const v = variants[variantIndex];
    if (!v) return;
    const ivaPct = taxId ? (taxes.find((t) => t.id === taxId)?.percentage ?? 0) : 0;
    const rawIncIva = parseFloat(String(v.costIncIva ?? v.cost)) || 0;

    const costSinIva = costIncIvaToCost(rawIncIva, ivaPct);
    const roundedSinIva = roundToFive(costSinIva);

    refreshRentabilidadOnCostBlur(variantIndex, roundedSinIva);
  }

  /** Mueve el foco a pvp1 (primera celda PVP) con scroll suave para pipeline Cost -> PVP. */
  function focusPvp1WithScroll(variantIndex: number) {
    setTimeout(() => {
      const el = document.getElementById(`pvp-${variantIndex}-1`);
      if (el instanceof HTMLInputElement) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
        el.focus();
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

      const valorRent = precioVenta - cost;
      const valorRentIncIva = pvp - costIncIva;

      if (preserve !== "precioVenta") updatedPrices[`precioVenta${key}`] = formatDecimal(precioVenta);
      if (preserve !== "pvp") updatedPrices[`pvp${key}`] = formatDecimal(pvp);
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

      const roundedPvp = roundToFive(pvpVal);
      const pvpSource = skipPvpUpdate ? pvpVal : roundedPvp;
      if (!skipPvpUpdate) {
        updatedPrices[`pvp${key}`] = formatDecimal(roundedPvp);
      }

      const precioVentaFromPvp = ivaPct === 0 ? pvpSource : pvpSource / (1 + ivaPct / 100);
      const roundedPrecioVenta = roundToFive(precioVentaFromPvp);
      const precioVentaForRent = skipPrecioVentaUpdate
        ? parseFloat(updatedPrices[`precioVenta${key}`] ?? "0") || 0
        : roundedPrecioVenta;
      if (!skipPrecioVentaUpdate) {
        updatedPrices[`precioVenta${key}`] = formatDecimal(roundedPrecioVenta);
      }

      const roundedValorRent = roundToFive(precioVentaForRent - cost);
      const roundedValorRentIncIva = roundToFive(pvpSource - costIncIva);
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

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>, isMain = false) {
    const file = e.target.files?.[0];
    if (!file || !initialData) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(
        `${API_BASE}/articles/${initialData.id}/images?companyId=${encodeURIComponent(companyId)}&isMain=${isMain}`,
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
    if (!initialData) return;
    try {
      await fetch(
        `${API_BASE}/articles/${initialData.id}/images/${imageId}/main?companyId=${encodeURIComponent(companyId)}`,
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
    if (!initialData) return;
    try {
      await fetch(
        `${API_BASE}/articles/${initialData.id}/images/${imageId}?companyId=${encodeURIComponent(companyId)}`,
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) {
      toast({ title: "Error", description: "El código de artículo (maestro) es obligatorio.", variant: "destructive" });
      return;
    }
    if (!name.trim()) {
      toast({ title: "Error", description: "El nombre es obligatorio.", variant: "destructive" });
      return;
    }
    const validVariants = variants.filter((v) => v.sku.trim());
    setLoading(true);
    try {
      const payload = {
        code: code.trim(),
        name: name.trim(),
        brandId: brandId || null,
        categoryId: categoryId || null,
        taxId: taxId || null,
        observations: observations.trim() || null,
        variants: validVariants.length ? validVariants.map((v) => ({
          sku: v.sku.trim(),
          barcode: v.barcode.trim() || null,
          cost: parseFloat(v.cost) || 0,
          colorId: v.colorId?.trim() || null,
          sizeId: v.sizeId?.trim() || null,
          flavorId: v.flavorId?.trim() || null,
          measure: v.measure.trim() || null,
          stockActual: 0,
          stockMin: 0,
          weight: parseFloat(v.weight) || 0,
          observations: v.observations?.trim() || null,
          prices: {
            precioVenta1: parseFloat(v.prices.precioVenta1) || 0,
            precioVenta2: parseFloat(v.prices.precioVenta2) || 0,
            precioVenta3: parseFloat(v.prices.precioVenta3) || 0,
            precioVenta4: parseFloat(v.prices.precioVenta4) || 0,
            precioVenta5: parseFloat(v.prices.precioVenta5) || 0,
            pvp1: parseFloat(v.prices.pvp1) || 0,
            pvp2: parseFloat(v.prices.pvp2) || 0,
            pvp3: parseFloat(v.prices.pvp3) || 0,
            pvp4: parseFloat(v.prices.pvp4) || 0,
            pvp5: parseFloat(v.prices.pvp5) || 0,
          },
        })) : [],
      };

      const url = isEditing
        ? `${API_BASE}/articles/${initialData!.id}?companyId=${encodeURIComponent(companyId)}`
        : `${API_BASE}/articles/company/${companyId}`;
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      const errData = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(errData.message ?? "Error al guardar");
      }

      const data = await res.json();
      setOpen(false);
      router.refresh();
      toast({
        title: isEditing ? "Artículo actualizado" : "Artículo creado",
        description: "Los datos se han guardado correctamente.",
      });
      if (!isEditing && data?.id) {
        setVariantsWithBatches(
          (data.variants ?? []).map((v: { id: string; sku: string; batches?: Batch[] }) => ({
            id: v.id,
            sku: v.sku,
            batches: v.batches ?? [],
          }))
        );
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger ?? <Button className="bg-slate-900 hover:bg-slate-800">+ Nuevo Artículo</Button>}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Artículo" : "Nuevo Artículo"}</DialogTitle>
          <DialogDescription>
            Puedes guardar solo los datos generales (código, nombre, marca, etc.) y añadir variantes después.
          </DialogDescription>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="variants">Variantes</TabsTrigger>
            <TabsTrigger value="inventory">Inventario</TabsTrigger>
            <TabsTrigger value="photos">Fotos</TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit} className="space-y-4">
            <TabsContent value="general" className="space-y-3 mt-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
                <div>
                  <Label className="text-xs">Categoría</Label>
                  <CatalogSelectWithCreate
                    companyId={companyId}
                    catalogKey="categories"
                    items={localCategories}
                    value={categoryId}
                    onChange={setCategoryId}
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
                    Código de artículo (Maestro)
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
                  <Label htmlFor="name" className="text-xs">Nombre base</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Camiseta Básica"
                    className="h-8 mt-0.5 w-full"
                  />
                </div>
                <div>
                  <Label className="text-xs">IVA</Label>
                  <Select value={taxId || "none"} onValueChange={(v) => setTaxId(v === "none" ? "" : v)}>
                    <SelectTrigger className="h-8 mt-0.5">
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
              <div>
                <Label htmlFor="observations" className="text-xs">Observaciones (artículo)</Label>
                <Textarea
                  id="observations"
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Notas generales sobre el artículo..."
                  rows={2}
                  className="mt-0.5 min-h-[4.5rem] text-sm"
                />
              </div>
            </TabsContent>

            <TabsContent value="variants" className="space-y-4 mt-4">
              <div className="flex justify-between items-center mb-2">
                <Label>Variantes</Label>
                <Button type="button" variant="outline" size="sm" onClick={addVariant}>
                  <Plus className="h-4 w-4 mr-1" />
                  Añadir variante
                </Button>
              </div>
              <div className="space-y-4">
                {variants.map((v, i) => (
                  <Card key={i} className="overflow-hidden">
                    <CardHeader className="py-2.5 px-3 flex flex-row items-center justify-between space-y-0 bg-slate-50 border-b">
                      <div>
                        <CardTitle className="text-sm">Variante {i + 1}</CardTitle>
                        <p className="text-xs text-slate-500 mt-0.5 font-normal">
                          Código: <span className="font-medium text-slate-700">{code || "—"}</span>
                          {" · "}
                          Nombre: <span className="font-medium text-slate-700">{name || "—"}</span>
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={variants.length <= 1}
                        onClick={() => removeVariant(i)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardHeader>
                    <CardContent className="p-3 space-y-3">
                      {/* Bloque principal: SKU, código barras, IVA (info), costo, medida y 5 tarifas PVP */}
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                          <div className="sm:col-span-2">
                            <Label htmlFor={`sku-${i}`} className="text-xs">SKU</Label>
                            <Input
                              id={`sku-${i}`}
                              value={v.sku}
                              onChange={(e) => updateVariant(i, "sku", e.target.value)}
                              placeholder="Ej: SKU001"
                              className="h-8 mt-0.5 min-w-[140px]"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <Label htmlFor={`barcode-${i}`} className="text-xs">Código de barras</Label>
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
                            <Label htmlFor={`cost-${i}`} className="text-xs">Precio de Costo SIN IVA</Label>
                            <Input
                              id={`cost-${i}`}
                              type="number"
                              min={0}
                              step={0.00001}
                              value={v.cost ?? ""}
                              onChange={(e) => updateVariant(i, "cost", e.target.value)}
                              onBlur={() => applyCostSinIvaBlurOrEnter(i)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  applyCostSinIvaBlurOrEnter(i);
                                  focusPvp1WithScroll(i);
                                }
                              }}
                              className="h-8 mt-0.5 w-full"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`costIncIva-${i}`} className="text-xs">Precio de Costo INC. IVA</Label>
                            <Input
                              id={`costIncIva-${i}`}
                              type="number"
                              min={0}
                              step={0.00001}
                              value={v.costIncIva != null ? v.costIncIva : (v.cost === "" || v.cost == null) ? "" : formatCostIncIva(v.cost ?? 0, taxId ? (taxes.find((t) => t.id === taxId)?.percentage ?? 0) : 0)}
                              onChange={(e) => updateVariant(i, "costIncIva", e.target.value)}
                              onBlur={() => applyCostIncIvaBlurOrEnter(i)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  applyCostIncIvaBlurOrEnter(i);
                                  focusPvp1WithScroll(i);
                                }
                              }}
                              className="h-8 mt-0.5 w-full"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`measure-${i}`} className="text-xs">Medida</Label>
                            <CatalogSelectWithCreate
                              companyId={companyId}
                              catalogKey="measures"
                              items={localMeasures}
                              value={v.measure}
                              onChange={(val) => updateVariant(i, "measure", val)}
                              onItemCreated={(item) => setLocalMeasures((prev) => [...prev, item])}
                              emptyLabel="— Seleccionar —"
                              valueKey="name"
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
                                        onBlur={() => applyPvpCellBlurOrEnter(i, "precioVenta", key)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            applyPvpCellBlurOrEnter(i, "precioVenta", key);
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
                                        onBlur={() => applyPvpCellBlurOrEnter(i, "pvp", key)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            applyPvpCellBlurOrEnter(i, "pvp", key);
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
                                        onBlur={() => applyPvpCellBlurOrEnter(i, "pctRent", key)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            applyPvpCellBlurOrEnter(i, "pctRent", key);
                                          }
                                        }}
                                        className="h-7 w-full min-w-[5.5rem] max-w-[6.5rem] text-xs"
                                      />
                                    </TableCell>
                                    <TableCell className="py-0.5 px-1 min-w-[5rem]">
                                      <span className="text-xs text-slate-600 tabular-nums">
                                        {(v.prices[`rentabilidad${key}` as keyof PricesRow] ?? "") === "" ? "" : formatDecimal(v.prices[`rentabilidad${key}` as keyof PricesRow])}
                                      </span>
                                    </TableCell>
                                    <TableCell className="py-0.5 px-1 min-w-[5rem]">
                                      <span className="text-xs text-slate-600 tabular-nums">
                                        {(v.prices[`rentabilidadIncIva${key}` as keyof PricesRow] ?? "") === "" ? "" : formatDecimal(v.prices[`rentabilidadIncIva${key}` as keyof PricesRow])}
                                      </span>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                            <div className="px-1.5 py-1 border-t bg-white">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs text-slate-600"
                                onClick={() => {
                                  if (refreshRentabilidadOnCostBlur(i)) {
                                    toast({ title: "Rentabilidad recalculada", description: "Se han actualizado los márgenes." });
                                  }
                                }}
                              >
                                Recalcular rentabilidad
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
                    </CardContent>
                  </Card>
                ))}
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

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Guardando..." : isEditing ? "Actualizar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
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

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    onAdd(variantId, batchNumber, expirationDate, currentStock);
    setBatchNumber("");
    setExpirationDate("");
    setCurrentStock("0");
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleAdd} className="flex flex-wrap gap-2 items-end">
        <div>
          <Label className="text-xs">Nº Lote</Label>
          <Input
            value={batchNumber}
            onChange={(e) => setBatchNumber(e.target.value)}
            placeholder="LOTE-001"
            className="h-8 w-32"
          />
        </div>
        <div>
          <Label className="text-xs">Vencimiento</Label>
          <Input
            type="date"
            value={expirationDate}
            onChange={(e) => setExpirationDate(e.target.value)}
            className="h-8 w-36"
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
          />
        </div>
        <Button type="submit" size="sm">Añadir lote</Button>
      </form>
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
