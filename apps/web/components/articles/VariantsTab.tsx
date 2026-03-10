"use client";

import { Plus, Trash2, Pencil, X, Check, Boxes } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { TabsContent } from "@/components/ui/tabs";
import { CatalogSelectWithCreate } from "@/components/catalog-select-with-create";
import { VariantsTabBanner } from "@/components/articles/VariantsTabBanner";
import type { CatalogItem } from "@/lib/api-client";
import { formatDecimal } from "@/lib/cost-iva";
import {
  type VariantRow,
  type PricesRow,
  type FractionConfig,
  TARIFAS_KEYS,
  emptyPrices,
} from "@/lib/types/article.types";
import type { UsePriceCalculationReturn } from "@/lib/hooks/usePriceCalculation";

export type VariantsTabTax = { id: string; percentage: number };

export type VariantsTabProps = {
  code: string;
  name: string;
  categoryId: string;
  categoryName: string;
  categorySecuencialInfo: { secuencial: number; secuencialVariantes: number } | null;
  companyId: string;
  canAddVariant: boolean;
  effectiveArticleId: string | null;
  canSave: boolean;
  variants: VariantRow[];
  addVariant: () => void;
  removeVariant: (index: number) => void;
  editingVariantIndex: number | null;
  setEditingVariantIndex: (n: number | null) => void;
  expandedVariantIndex: number | null;
  setExpandedVariantIndex: (n: number | null) => void;
  localMeasures: CatalogItem[];
  setLocalMeasures: React.Dispatch<React.SetStateAction<CatalogItem[]>>;
  localColors: CatalogItem[];
  setLocalColors: React.Dispatch<React.SetStateAction<CatalogItem[]>>;
  localSizes: CatalogItem[];
  setLocalSizes: React.Dispatch<React.SetStateAction<CatalogItem[]>>;
  localFlavors: CatalogItem[];
  setLocalFlavors: React.Dispatch<React.SetStateAction<CatalogItem[]>>;
  taxId: string;
  taxes: VariantsTabTax[];
  tariffLabels: Record<string, string>;
  pricing: UsePriceCalculationReturn;
  focusPriceCellBelow: (
    variantIndex: number,
    column: "precioVenta" | "pvp",
    currentKey: number,
  ) => void;
  focusPctRentBelow: (variantIndex: number, currentKey: number) => void;
  updateVariant: (
    index: number,
    field: keyof VariantRow,
    value: string | PricesRow | { barcode: string; description: string }[] | boolean | FractionConfig[],
  ) => void;
  updateVariantPriceField: (variantIndex: number, field: keyof PricesRow, value: string) => void;
  updateVariantFractionPriceField: (variantIndex: number, field: keyof PricesRow, value: string) => void;
  handleCostChange: (variantIndex: number, rawValue: string) => void;
  handleCostIncIvaChange: (variantIndex: number, rawValue: string) => void;
  toggleFractionEnabled: (variantIndex: number) => void;
  updateFractionField: (
    variantIndex: number,
    fractionIndex: number,
    field: keyof FractionConfig,
    value: string,
  ) => void;
  addFraction: (variantIndex: number) => void;
  removeFraction: (variantIndex: number, fractionIndex: number) => void;
  additionalBarcodeInputByIndex: Record<number, string>;
  setAdditionalBarcodeInputByIndex: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  editingBarcodeDescription: { variantIndex: number; barcodeIndex: number } | null;
  setEditingBarcodeDescription: (v: { variantIndex: number; barcodeIndex: number } | null) => void;
  addAdditionalBarcode: (variantIndex: number) => Promise<void>;
  removeAdditionalBarcode: (variantIndex: number, barcodeIndex: number) => void;
  updateAdditionalBarcodeDescription: (
    variantIndex: number,
    barcodeIndex: number,
    description: string,
  ) => void;
  isVariantDirty: (index: number) => boolean;
  getVariantValidation: (index: number) => { valid: boolean; message: string };
  saveSingleVariant: (index: number) => void;
  cancelEditVariant: () => void;
  startEditVariant: (index: number) => void;
  activeProfileName: string;
  profitabilityConfig: {
    defaultPercentages: Record<string, number>;
    profiles: Array<{ name?: string; categoryIds: string[]; percentages: Record<string, number> }>;
  } | null;
  applyProfilePercentages: () => void;
  formatCostIncIva: (cost: string | number, ivaPct: number) => string;
};

export function VariantsTab(props: VariantsTabProps) {
  const {
    code,
    name,
    categoryId,
    categoryName,
    categorySecuencialInfo,
    companyId,
    canAddVariant,
    effectiveArticleId,
    canSave,
    variants,
    addVariant,
    removeVariant,
    editingVariantIndex,
    setEditingVariantIndex,
    expandedVariantIndex,
    setExpandedVariantIndex,
    localMeasures,
    setLocalMeasures,
    localColors,
    setLocalColors,
    localSizes,
    setLocalSizes,
    localFlavors,
    setLocalFlavors,
    taxId,
    taxes,
    tariffLabels,
    pricing,
    focusPriceCellBelow,
    focusPctRentBelow,
    updateVariant,
    updateVariantPriceField,
    updateVariantFractionPriceField,
    handleCostChange,
    handleCostIncIvaChange,
    toggleFractionEnabled,
    updateFractionField,
    addFraction,
    removeFraction,
    additionalBarcodeInputByIndex,
    setAdditionalBarcodeInputByIndex,
    editingBarcodeDescription,
    setEditingBarcodeDescription,
    addAdditionalBarcode,
    removeAdditionalBarcode,
    updateAdditionalBarcodeDescription,
    isVariantDirty,
    getVariantValidation,
    saveSingleVariant,
    cancelEditVariant,
    startEditVariant,
    activeProfileName,
    profitabilityConfig,
    applyProfilePercentages,
    formatCostIncIva,
  } = props;

  const {
    handleSalePriceCalculation,
    handlePvpCalculation,
    handleCostToPriceCalculation,
    applyPctRentBlurOrEnter,
    handleFractionSalePriceCalculation,
    handleFractionPvpCalculation,
    applyFractionPctRentBlurOrEnter,
    getFractionCost,
  } = pricing;

  return (
    <TabsContent
      value="variants"
      className="flex-1 overflow-y-auto min-h-0 mt-0 p-4 sm:p-6 md:p-8 space-y-4 data-[state=inactive]:hidden"
    >
      <div className="mb-4">
        <VariantsTabBanner code={code} name={name} categoryName={categoryName} />
      </div>
      <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <Label>Variantes</Label>
          {categoryId && categorySecuencialInfo && (
            <div className="flex items-center gap-2">
              <Label className="text-xs text-slate-500">
                Próximo Secuencial Variante (SKU / Barras):
              </Label>
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
              title={!effectiveArticleId ? "Guarde primero el artículo en la pestaña General" : undefined}
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
                <Card className="overflow-hidden border border-slate-200 bg-acont-surface">
                  <CardHeader className="py-2.5 px-3 flex flex-row items-center justify-between space-y-0 bg-acont-primary/5 border-b border-acont-primary/10">
                    <CollapsibleTrigger asChild>
                      <div className="flex-1 flex flex-col gap-0.5 cursor-pointer min-w-0">
                        <CardTitle className="text-sm font-semibold text-acont-primary">
                          Variante {i + 1}
                        </CardTitle>
                        <p className="text-xs text-slate-500 mt-0.5 font-normal truncate">
                          {[
                            v.sku?.trim() || "—",
                            v.barcode?.trim() || "—",
                            v.measureId
                              ? localMeasures.find((m) => m.id === v.measureId)?.name ?? ""
                              : "—",
                            (() => {
                              const c = parseFloat(String(v.cost)) || 0;
                              return c > 0 ? formatDecimal(c) : "—";
                            })(),
                            v.colorId ? localColors.find((c) => c.id === v.colorId)?.name ?? "" : "—",
                            v.sizeId ? localSizes.find((s) => s.id === v.sizeId)?.name ?? "" : "—",
                          ].join(" · ")}
                        </p>
                      </div>
                    </CollapsibleTrigger>
                    <div
                      className="flex items-center gap-1 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isEditingThis ? (
                        <>
                          <Button
                            type="button"
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
                            className="h-9 px-4 rounded-md font-semibold bg-acont-primary text-white hover:bg-acont-primary/90 border-0 shadow-sm"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Guardar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={cancelEditVariant}
                            className="h-9 px-4 rounded-md font-semibold bg-[#ecf0f1] text-slate-800 hover:bg-slate-200 border-0"
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
                      <fieldset
                        disabled={!isEditingThis}
                        className="disabled:opacity-70 disabled:pointer-events-none [&_*]:disabled:pointer-events-none"
                      >
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                            <div className="sm:col-span-2">
                              <Label htmlFor={`sku-${i}`} className="text-xs">
                                SKU <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                id={`sku-${i}`}
                                value={v.sku}
                                onChange={(e) => updateVariant(i, "sku", e.target.value)}
                                placeholder="Ej: SKU001"
                                className="h-8 mt-0.5 min-w-[140px]"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <Label htmlFor={`barcode-${i}`} className="text-xs">
                                Código de barras principal <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                id={`barcode-${i}`}
                                value={v.barcode}
                                onChange={(e) => updateVariant(i, "barcode", e.target.value)}
                                placeholder="Ej: 7891234567890"
                                className="h-8 mt-0.5 min-w-[140px]"
                              />
                            </div>
                            <div className="sm:col-span-full">
                              <Label className="text-xs text-slate-600">
                                Códigos de barras adicionales
                              </Label>
                              <p className="text-[11px] text-slate-500 mt-0.5 mb-1">
                                Escriba o escanee un código y pulse Enter para añadir. Clic en un
                                tag para editar la descripción.
                              </p>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1 min-h-[2rem] p-2 rounded-md border bg-slate-50/50 dark:bg-slate-900/30">
                                {(v.additionalBarcodes ?? []).map((ab, j) => (
                                  <span
                                    key={`${i}-${j}-${ab.barcode}`}
                                    className="inline-flex items-center gap-1 rounded-md bg-slate-200 dark:bg-slate-700 px-2 py-0.5 text-xs"
                                  >
                                    {editingBarcodeDescription?.variantIndex === i &&
                                    editingBarcodeDescription?.barcodeIndex === j ? (
                                      <input
                                        type="text"
                                        className="h-6 w-32 rounded border bg-white dark:bg-slate-800 px-1.5 text-xs"
                                        placeholder="Descripción (opcional)"
                                        value={ab.description}
                                        onChange={(e) => {
                                          const list = [...(v.additionalBarcodes ?? [])];
                                          if (list[j])
                                            list[j] = { ...list[j], description: e.target.value };
                                          updateVariant(i, "additionalBarcodes", list);
                                        }}
                                        onBlur={() => setEditingBarcodeDescription(null)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter")
                                            updateAdditionalBarcodeDescription(
                                              i,
                                              j,
                                              (v.additionalBarcodes ?? [])[j]?.description ?? "",
                                            );
                                          if (e.key === "Escape") setEditingBarcodeDescription(null);
                                        }}
                                        autoFocus
                                      />
                                    ) : (
                                      <>
                                        <span
                                          className="cursor-pointer hover:underline"
                                          onClick={() =>
                                            setEditingBarcodeDescription({
                                              variantIndex: i,
                                              barcodeIndex: j,
                                            })
                                          }
                                          title="Clic para editar descripción"
                                        >
                                          {ab.description?.trim()
                                            ? `${ab.barcode} - ${ab.description}`
                                            : ab.barcode}
                                        </span>
                                        <button
                                          type="button"
                                          className="rounded p-0.5 hover:bg-slate-400 dark:hover:bg-slate-600"
                                          onClick={() => removeAdditionalBarcode(i, j)}
                                          aria-label="Quitar código"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </>
                                    )}
                                  </span>
                                ))}
                                <Input
                                  className="h-7 w-36 min-w-[8rem] text-xs inline-flex"
                                  placeholder="Código + Enter"
                                  value={additionalBarcodeInputByIndex[i] ?? ""}
                                  onChange={(e) =>
                                    setAdditionalBarcodeInputByIndex((prev) => ({
                                      ...prev,
                                      [i]: e.target.value,
                                    }))
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      void addAdditionalBarcode(i);
                                    }
                                  }}
                                />
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs text-slate-500">IVA (informativo)</Label>
                              <p className="text-xs font-medium text-slate-700 mt-0.5">
                                {taxId
                                  ? taxes.find((t) => t.id === taxId)?.percentage ?? "—"
                                  : "—"}
                                %
                              </p>
                            </div>
                            <div>
                              <Label htmlFor={`cost-${i}`} className="text-xs">
                                Precio de Costo SIN IVA <span className="text-red-500">*</span>
                              </Label>
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
                              <Label htmlFor={`costIncIva-${i}`} className="text-xs">
                                Precio de Costo INC. IVA <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                id={`costIncIva-${i}`}
                                type="number"
                                min={0}
                                step={0.00001}
                                value={
                                  v.costIncIva != null
                                    ? v.costIncIva
                                    : v.cost === "" || v.cost == null
                                      ? ""
                                      : formatCostIncIva(
                                          v.cost ?? 0,
                                          taxId
                                            ? taxes.find((t) => t.id === taxId)?.percentage ?? 0
                                            : 0,
                                        )
                                }
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
                            <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                              <div className="flex-1 min-w-0">
                                <Label htmlFor={`measure-${i}`} className="text-xs">
                                  Medida <span className="text-red-500">*</span>
                                </Label>
                                <CatalogSelectWithCreate
                                  companyId={companyId}
                                  catalogKey="measures"
                                  items={localMeasures}
                                  value={v.measureId}
                                  onChange={(val) => updateVariant(i, "measureId", val)}
                                  onItemCreated={(item) =>
                                    setLocalMeasures((prev) => [...prev, item])
                                  }
                                  emptyLabel="— Seleccionar —"
                                  valueKey="id"
                                  selectClassName="h-8 mt-0.5 w-full"
                                />
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 px-2 shrink-0 border-[var(--acont-secondary)] text-[var(--acont-secondary)] hover:bg-[#FFA901]/10 data-[active]:bg-[#FFA901]/20"
                                onClick={() => toggleFractionEnabled(i)}
                                title={
                                  v.fractionEnabled
                                    ? "Desactivar unidades fraccionarias"
                                    : "Activar unidades fraccionarias (ej. venta por metro)"
                                }
                                data-active={v.fractionEnabled ? "true" : undefined}
                              >
                                <Boxes className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <Collapsible open={v.fractionEnabled}>
                            <CollapsibleContent>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 rounded-lg border border-[#FFA901]/30 bg-[#FFA901]/5 p-4 mt-2 transition-all duration-200 ease-out">
                                <div className="sm:col-span-full">
                                  <h4 className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                                    <Boxes className="h-3.5 w-3.5 text-[var(--acont-secondary)]" />
                                    Configuración de unidades fraccionarias
                                  </h4>
                                  <p className="text-[11px] text-slate-500 mb-3">
                                    Factor relativo a{" "}
                                    <strong>
                                      {v.measureId
                                        ? localMeasures.find((m) => m.id === v.measureId)?.name ??
                                          "Unidad"
                                        : "Unidad"}
                                    </strong>{" "}
                                    (medida base).
                                  </p>
                                </div>
                                {(v.fractions ?? []).map((frac, fj) => (
                                  <div
                                    key={fj}
                                    className="rounded border border-slate-200 bg-white dark:bg-slate-800/50 p-3 space-y-2"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-xs font-medium text-slate-600">
                                        Fracción {fj + 1}
                                      </span>
                                      {(v.fractions?.length ?? 0) > 1 && (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0 text-slate-500 hover:text-destructive"
                                          onClick={() => removeFraction(i, fj)}
                                          aria-label="Quitar fracción"
                                        >
                                          <X className="h-3.5 w-3.5" />
                                        </Button>
                                      )}
                                    </div>
                                    <div>
                                      <Label className="text-xs">Nombre sub-unidad</Label>
                                      <Input
                                        placeholder="Ej: Metro"
                                        value={frac.fraction_name}
                                        onChange={(e) =>
                                          updateFractionField(i, fj, "fraction_name", e.target.value)
                                        }
                                        className="h-8 mt-0.5 text-xs"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">
                                        Factor de conversión (0 &lt; factor ≤ 1)
                                      </Label>
                                      <Input
                                        type="number"
                                        min={0.00001}
                                        max={1}
                                        step={0.01}
                                        placeholder="Ej: 0.10 (1 unidad = 10 fracciones)"
                                        value={frac.conversion_factor}
                                        onChange={(e) =>
                                          updateFractionField(
                                            i,
                                            fj,
                                            "conversion_factor",
                                            e.target.value,
                                          )
                                        }
                                        className="h-8 mt-0.5 text-xs"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs text-slate-500">
                                        Coste fracción (solo lectura)
                                      </Label>
                                      <p className="text-sm font-medium tabular-nums mt-0.5 text-[var(--acont-secondary)]">
                                        {formatDecimal(getFractionCost(v))}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                                <div className="flex items-end">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="text-xs border-dashed border-[var(--acont-secondary)] text-[var(--acont-secondary)]"
                                    onClick={() => addFraction(i)}
                                  >
                                    + Añadir otra fracción
                                  </Button>
                                </div>
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
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
                                      <TableCell className="font-medium text-xs align-top pt-1.5">
                                        {tariffLabels[String(key)] ?? `Tarifa ${key}`}
                                      </TableCell>
                                      <TableCell className="p-0.5 align-top">
                                        <div className="flex flex-col gap-0.5">
                                          <Input
                                            id={`precioVenta-${i}-${key}`}
                                            type="number"
                                            min={0}
                                            step={0.00001}
                                            value={
                                              v.prices[
                                                `precioVenta${key}` as keyof PricesRow
                                              ] ?? ""
                                            }
                                            onChange={(e) =>
                                              updateVariantPriceField(
                                                i,
                                                `precioVenta${key}` as keyof PricesRow,
                                                e.target.value,
                                              )
                                            }
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
                                            className="h-7 w-full min-w-[7rem] max-w-[8.5rem] text-xs border-[var(--acont-primary)]/50 bg-[#D61672]/10 focus-visible:ring-[var(--acont-primary)]"
                                          />
                                          {v.fractionEnabled &&
                                            (v.fractions ?? []).length > 0 && (
                                              <Input
                                                id={`frac-precioVenta-${i}-${key}`}
                                                type="number"
                                                min={0}
                                                step={0.00001}
                                                placeholder="Fracción"
                                                value={
                                                  (v.fractionPrices ?? emptyPrices())[
                                                    `precioVenta${key}` as keyof PricesRow
                                                  ] ?? ""
                                                }
                                                onChange={(e) =>
                                                  updateVariantFractionPriceField(
                                                    i,
                                                    `precioVenta${key}` as keyof PricesRow,
                                                    e.target.value,
                                                  )
                                                }
                                                onFocus={(e) => e.currentTarget.select()}
                                                onBlur={() => handleFractionSalePriceCalculation(i, key)}
                                                onKeyDown={(e) => {
                                                  if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    handleFractionSalePriceCalculation(i, key);
                                                  }
                                                }}
                                                className="h-6 w-full min-w-[7rem] max-w-[8.5rem] text-xs border-[#FFA901]/50 bg-[#FFA901]/15 focus-visible:ring-[#FFA901]"
                                              />
                                            )}
                                        </div>
                                      </TableCell>
                                      <TableCell className="p-0.5 align-top">
                                        <div className="flex flex-col gap-0.5">
                                          <Input
                                            id={`pvp-${i}-${key}`}
                                            type="number"
                                            min={0}
                                            step={0.00001}
                                            value={
                                              v.prices[`pvp${key}` as keyof PricesRow] ?? ""
                                            }
                                            onChange={(e) =>
                                              updateVariantPriceField(
                                                i,
                                                `pvp${key}` as keyof PricesRow,
                                                e.target.value,
                                              )
                                            }
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
                                            className="h-7 w-full min-w-[7rem] max-w-[8.5rem] text-xs border-[var(--acont-primary)]/50 bg-[#D61672]/10 focus-visible:ring-[var(--acont-primary)]"
                                          />
                                          {v.fractionEnabled &&
                                            (v.fractions ?? []).length > 0 && (
                                              <Input
                                                id={`frac-pvp-${i}-${key}`}
                                                type="number"
                                                min={0}
                                                step={0.00001}
                                                placeholder="Fracción"
                                                value={
                                                  (v.fractionPrices ?? emptyPrices())[
                                                    `pvp${key}` as keyof PricesRow
                                                  ] ?? ""
                                                }
                                                onChange={(e) =>
                                                  updateVariantFractionPriceField(
                                                    i,
                                                    `pvp${key}` as keyof PricesRow,
                                                    e.target.value,
                                                  )
                                                }
                                                onFocus={(e) => e.currentTarget.select()}
                                                onBlur={() => handleFractionPvpCalculation(i, key)}
                                                onKeyDown={(e) => {
                                                  if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    handleFractionPvpCalculation(i, key);
                                                  }
                                                }}
                                                className="h-6 w-full min-w-[7rem] max-w-[8.5rem] text-xs border-[#FFA901]/50 bg-[#FFA901]/15 focus-visible:ring-[#FFA901]"
                                              />
                                            )}
                                        </div>
                                      </TableCell>
                                      <TableCell className="p-0.5 align-top">
                                        <div className="flex flex-col gap-0.5">
                                          <Input
                                            id={`pctRent-${i}-${key}`}
                                            type="number"
                                            min={-100}
                                            step={0.00001}
                                            placeholder="%"
                                            value={
                                              v.prices[
                                                `porcentajeRentabilidad${key}` as keyof PricesRow
                                              ] ?? ""
                                            }
                                            onChange={(e) =>
                                              updateVariantPriceField(
                                                i,
                                                `porcentajeRentabilidad${key}` as keyof PricesRow,
                                                e.target.value,
                                              )
                                            }
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
                                            className="h-7 w-full min-w-[5.5rem] max-w-[6.5rem] text-xs border-[var(--acont-primary)]/50 bg-[#D61672]/10 focus-visible:ring-[var(--acont-primary)]"
                                          />
                                          {v.fractionEnabled &&
                                            (v.fractions ?? []).length > 0 && (
                                              <Input
                                                id={`frac-pctRent-${i}-${key}`}
                                                type="number"
                                                min={-100}
                                                step={0.00001}
                                                placeholder="%"
                                                value={
                                                  (v.fractionPrices ?? emptyPrices())[
                                                    `porcentajeRentabilidad${key}` as keyof PricesRow
                                                  ] ?? ""
                                                }
                                                onChange={(e) =>
                                                  updateVariantFractionPriceField(
                                                    i,
                                                    `porcentajeRentabilidad${key}` as keyof PricesRow,
                                                    e.target.value,
                                                  )
                                                }
                                                onFocus={(e) => e.currentTarget.select()}
                                                onBlur={() =>
                                                  applyFractionPctRentBlurOrEnter(i, key)
                                                }
                                                onKeyDown={(e) => {
                                                  if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    applyFractionPctRentBlurOrEnter(i, key);
                                                  }
                                                }}
                                                className="h-6 w-full min-w-[5.5rem] max-w-[6.5rem] text-xs border-[#FFA901]/50 bg-[#FFA901]/15 focus-visible:ring-[#FFA901]"
                                              />
                                            )}
                                        </div>
                                      </TableCell>
                                      <TableCell className="py-0.5 px-1 min-w-[5rem] align-top">
                                        <div className="flex flex-col gap-0.5">
                                          <span className="text-xs text-slate-600 tabular-nums">
                                            {(v.prices[
                                              `rentabilidad${key}` as keyof PricesRow
                                            ] ?? "") === ""
                                              ? ""
                                              : formatDecimal(
                                                  v.prices[
                                                    `rentabilidad${key}` as keyof PricesRow
                                                  ] ?? 0,
                                                )}
                                          </span>
                                          {v.fractionEnabled &&
                                            (v.fractions ?? []).length > 0 && (
                                              <span className="text-xs tabular-nums text-[#FFA901]">
                                                {((v.fractionPrices ?? emptyPrices())[
                                                  `rentabilidad${key}` as keyof PricesRow
                                                ] ?? "") === ""
                                                  ? ""
                                                  : formatDecimal(
                                                      (v.fractionPrices ?? emptyPrices())[
                                                        `rentabilidad${key}` as keyof PricesRow
                                                      ] ?? 0,
                                                    )}
                                              </span>
                                            )}
                                        </div>
                                      </TableCell>
                                      <TableCell className="py-0.5 px-1 min-w-[5rem] align-top">
                                        <div className="flex flex-col gap-0.5">
                                          <span className="text-xs text-slate-600 tabular-nums">
                                            {(v.prices[
                                              `rentabilidadIncIva${key}` as keyof PricesRow
                                            ] ?? "") === ""
                                              ? ""
                                              : formatDecimal(
                                                  v.prices[
                                                    `rentabilidadIncIva${key}` as keyof PricesRow
                                                  ] ?? 0,
                                                )}
                                          </span>
                                          {v.fractionEnabled &&
                                            (v.fractions ?? []).length > 0 && (
                                              <span className="text-xs tabular-nums text-[#FFA901]">
                                                {((v.fractionPrices ?? emptyPrices())[
                                                  `rentabilidadIncIva${key}` as keyof PricesRow
                                                ] ?? "") === ""
                                                  ? ""
                                                  : formatDecimal(
                                                      (v.fractionPrices ?? emptyPrices())[
                                                        `rentabilidadIncIva${key}` as keyof PricesRow
                                                      ] ?? 0,
                                                    )}
                                              </span>
                                            )}
                                        </div>
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
                        <div className="rounded border border-dashed border-slate-200 bg-slate-50/30 p-2.5 space-y-2">
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                            Campos opcionales
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                            <div>
                              <Label className="text-xs text-slate-600">Color</Label>
                              <CatalogSelectWithCreate
                                companyId={companyId}
                                catalogKey="colors"
                                items={localColors}
                                value={v.colorId}
                                onChange={(val) => updateVariant(i, "colorId", val)}
                                onItemCreated={(item) =>
                                  setLocalColors((prev) => [...prev, item])
                                }
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
                                onItemCreated={(item) =>
                                  setLocalSizes((prev) => [...prev, item])
                                }
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
                                onItemCreated={(item) =>
                                  setLocalFlavors((prev) => [...prev, item])
                                }
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
                              <Label className="text-xs text-slate-600">
                                Observaciones (variante)
                              </Label>
                              <Input
                                value={v.observations}
                                onChange={(e) =>
                                  updateVariant(i, "observations", e.target.value)
                                }
                                placeholder="Notas opcionales para esta variante"
                                className="h-8 mt-0.5 w-full"
                              />
                            </div>
                          </div>
                        </div>
                        {isEditingThis && (
                          <div className="flex flex-wrap justify-end gap-3 pt-4 mt-4 border-t border-slate-200">
                            <Button
                              type="button"
                              size="sm"
                              onClick={cancelEditVariant}
                              className="h-9 px-5 py-2.5 rounded-md font-semibold bg-[#ecf0f1] text-slate-800 hover:bg-slate-200 border-0"
                            >
                              <X className="h-4 w-4 mr-1" />
                              Cancelar
                            </Button>
                            <Button
                              type="button"
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
                              className="h-9 px-5 py-2.5 rounded-md font-semibold bg-acont-primary text-white hover:bg-acont-primary/90 border-0 shadow-sm"
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Guardar variante
                            </Button>
                          </div>
                        )}
                      </fieldset>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })
        )}
      </div>
    </TabsContent>
  );
}
