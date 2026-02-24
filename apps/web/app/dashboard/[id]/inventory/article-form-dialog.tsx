"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Star, Upload } from "lucide-react";
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const PRICE_TYPES = [
  { value: "pvp", label: "PVP (Retail)" },
  { value: "wholesale", label: "Mayorista" },
  { value: "promo", label: "Promoción" },
];

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
  colorId: string;
  sizeId: string;
  flavorId: string;
  measure: string;
  stockActual: string;
  stockMin: string;
  observations: string;
  prices: { priceType: string; price: string; isDefault: boolean }[];
};

const emptyVariant = (): VariantRow => ({
  sku: "",
  barcode: "",
  cost: "0",
  colorId: "",
  sizeId: "",
  flavorId: "",
  measure: "",
  stockActual: "0",
  stockMin: "0",
  observations: "",
  prices: [{ priceType: "pvp", price: "", isDefault: true }],
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
      observations?: string | null;
      prices?: Array<{ priceType: string; price: number; isDefault: boolean }>;
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { toast } = useToast();
  const isEditing = Boolean(initialData);

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
                cost: String(v.cost ?? 0),
                colorId: v.colorId ?? v.color?.id ?? "",
                sizeId: v.sizeId ?? v.size?.id ?? "",
                flavorId: v.flavorId ?? v.flavor?.id ?? "",
                measure: v.measure ?? "",
                stockActual: String(v.stockActual ?? 0),
                stockMin: String(v.stockMin ?? 0),
                observations: v.observations ?? "",
                prices:
                  (v.prices?.length ? v.prices : [{ priceType: "pvp", price: 0, isDefault: true }]).map((p) => ({
                    priceType: p.priceType,
                    price: String(p.price),
                    isDefault: p.isDefault ?? false,
                  })),
              }))
            : [emptyVariant()]
        );
      } else {
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

  function addPriceToVariant(variantIndex: number) {
    setVariants((prev) => {
      const next = [...prev];
      next[variantIndex].prices = [
        ...next[variantIndex].prices,
        { priceType: "pvp", price: "", isDefault: false },
      ];
      return next;
    });
  }

  function removePriceFromVariant(variantIndex: number, priceIndex: number) {
    setVariants((prev) => {
      const next = [...prev];
      next[variantIndex].prices = next[variantIndex].prices.filter((_, i) => i !== priceIndex);
      return next;
    });
  }

  function updateVariantPrice(variantIndex: number, priceIndex: number, field: string, value: string | boolean) {
    setVariants((prev) => {
      const next = [...prev];
      const p = next[variantIndex].prices[priceIndex];
      if (field === "priceType") p.priceType = value as string;
      else if (field === "price") p.price = value as string;
      else if (field === "isDefault") p.isDefault = value as boolean;
      return next;
    });
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
    if (!name.trim()) {
      toast({ title: "Error", description: "El nombre es obligatorio.", variant: "destructive" });
      return;
    }
    const validVariants = variants.filter((v) => v.sku.trim());
    if (!validVariants.length) {
      toast({ title: "Error", description: "Añade al menos una variante con SKU.", variant: "destructive" });
      return;
    }
    for (const v of validVariants) {
      const hasPrice = v.prices.some((p) => p.price && !isNaN(parseFloat(p.price)));
      if (!hasPrice) {
        toast({
          title: "Error",
          description: `La variante ${v.sku || "sin SKU"} debe tener al menos un precio.`,
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        brandId: brandId || null,
        categoryId: categoryId || null,
        taxId: taxId || null,
        observations: observations.trim() || null,
        variants: validVariants.map((v) => ({
          sku: v.sku.trim(),
          barcode: v.barcode.trim() || null,
          cost: parseFloat(v.cost) || 0,
          colorId: v.colorId?.trim() || null,
          sizeId: v.sizeId?.trim() || null,
          flavorId: v.flavorId?.trim() || null,
          measure: v.measure.trim() || null,
          stockActual: parseFloat(v.stockActual) || 0,
          stockMin: parseFloat(v.stockMin) || 0,
          observations: v.observations?.trim() || null,
          prices: v.prices
            .filter((p) => p.price && !isNaN(parseFloat(p.price)))
            .map((p) => ({
              priceType: p.priceType,
              price: parseFloat(p.price),
              isDefault: p.isDefault,
            })),
        })),
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
            Completa la información general, variantes, inventario por lotes y fotos.
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
            <TabsContent value="general" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nombre base</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Camiseta Básica"
                  />
                </div>
                <div>
                  <Label>Marca</Label>
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
                  />
                </div>
                <div>
                  <Label>Categoría</Label>
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
                  />
                </div>
                <div>
                  <Label>Impuesto</Label>
                  <Select value={taxId || "none"} onValueChange={(v) => setTaxId(v === "none" ? "" : v)}>
                    <SelectTrigger>
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
                <Label htmlFor="observations">Observaciones (artículo)</Label>
                <Textarea
                  id="observations"
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Notas generales sobre el artículo..."
                  rows={3}
                />
              </div>
            </TabsContent>

            <TabsContent value="variants" className="space-y-4 mt-4">
              <div className="flex justify-between items-center mb-2">
                <Label>Variantes (SKU, código de barras, precios, atributos)</Label>
                <Button type="button" variant="outline" size="sm" onClick={addVariant}>
                  <Plus className="h-4 w-4 mr-1" />
                  Añadir variante
                </Button>
              </div>
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="w-24">SKU</TableHead>
                      <TableHead className="w-28">Cód. barras</TableHead>
                      <TableHead className="w-20">Costo</TableHead>
                      <TableHead className="w-20">Color</TableHead>
                      <TableHead className="w-20">Talla</TableHead>
                      <TableHead className="w-20">Sabor</TableHead>
                      <TableHead className="w-20">Medida</TableHead>
                      <TableHead className="w-20">Stock</TableHead>
                      <TableHead>Observaciones</TableHead>
                      <TableHead>Precios</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {variants.map((v, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Input
                            value={v.sku}
                            onChange={(e) => updateVariant(i, "sku", e.target.value)}
                            placeholder="SKU001"
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={v.barcode}
                            onChange={(e) => updateVariant(i, "barcode", e.target.value)}
                            placeholder="789..."
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={v.cost}
                            onChange={(e) => updateVariant(i, "cost", e.target.value)}
                            className="h-8 w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <CatalogSelectWithCreate
                            companyId={companyId}
                            catalogKey="colors"
                            items={localColors}
                            value={v.colorId}
                            onChange={(val) => updateVariant(i, "colorId", val)}
                            onItemCreated={(item) => setLocalColors((prev) => [...prev, item])}
                            emptyLabel="—"
                            valueKey="id"
                            selectClassName="min-w-[80px]"
                          />
                        </TableCell>
                        <TableCell>
                          <CatalogSelectWithCreate
                            companyId={companyId}
                            catalogKey="sizes"
                            items={localSizes}
                            value={v.sizeId}
                            onChange={(val) => updateVariant(i, "sizeId", val)}
                            onItemCreated={(item) => setLocalSizes((prev) => [...prev, item])}
                            emptyLabel="—"
                            valueKey="id"
                            selectClassName="min-w-[80px]"
                          />
                        </TableCell>
                        <TableCell>
                          <CatalogSelectWithCreate
                            companyId={companyId}
                            catalogKey="flavors"
                            items={localFlavors}
                            value={v.flavorId}
                            onChange={(val) => updateVariant(i, "flavorId", val)}
                            onItemCreated={(item) => setLocalFlavors((prev) => [...prev, item])}
                            emptyLabel="—"
                            valueKey="id"
                            selectClassName="min-w-[80px]"
                          />
                        </TableCell>
                        <TableCell>
                          <CatalogSelectWithCreate
                            companyId={companyId}
                            catalogKey="measures"
                            items={localMeasures}
                            value={v.measure}
                            onChange={(val) => updateVariant(i, "measure", val)}
                            onItemCreated={(item) => setLocalMeasures((prev) => [...prev, item])}
                            emptyLabel="—"
                            valueKey="name"
                            selectClassName="min-w-[80px]"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Input
                              type="number"
                              min={0}
                              value={v.stockActual}
                              onChange={(e) => updateVariant(i, "stockActual", e.target.value)}
                              className="h-8 w-16"
                              title="Stock actual"
                            />
                            <Input
                              type="number"
                              min={0}
                              value={v.stockMin}
                              onChange={(e) => updateVariant(i, "stockMin", e.target.value)}
                              className="h-8 w-16"
                              title="Stock mín."
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={v.observations}
                            onChange={(e) => updateVariant(i, "observations", e.target.value)}
                            placeholder="Notas variante"
                            className="h-8 text-xs"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {v.prices.map((p, pi) => (
                              <div key={pi} className="flex items-center gap-1 bg-slate-100 rounded px-1 py-0.5">
                                <select
                                  value={p.priceType}
                                  onChange={(e) => updateVariantPrice(i, pi, "priceType", e.target.value)}
                                  className="h-7 text-xs border rounded bg-white"
                                >
                                  {PRICE_TYPES.map((pt) => (
                                    <option key={pt.value} value={pt.value}>{pt.label}</option>
                                  ))}
                                </select>
                                <Input
                                  type="number"
                                  min={0}
                                  step={0.01}
                                  value={p.price}
                                  onChange={(e) => updateVariantPrice(i, pi, "price", e.target.value)}
                                  placeholder="0.00"
                                  className="h-7 w-20 text-xs"
                                />
                                <label className="text-xs flex items-center gap-0.5">
                                  <input
                                    type="checkbox"
                                    checked={p.isDefault}
                                    onChange={(e) => updateVariantPrice(i, pi, "isDefault", e.target.checked)}
                                  />
                                  Def
                                </label>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => removePriceFromVariant(i, pi)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => addPriceToVariant(i)}
                            >
                              +
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={variants.length <= 1}
                            onClick={() => removeVariant(i)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
            step={0.01}
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
