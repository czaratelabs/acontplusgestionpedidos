"use client";

import { Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CatalogSelectWithCreate } from "@/components/catalog-select-with-create";
import type { CatalogItem } from "@/lib/api-client";

export type GeneralTabTax = { id: string; name: string; percentage: number };

export type GeneralTabProps = {
  companyId: string;
  categoryId: string;
  onCategoryChange: (newCategoryId: string) => void;
  localCategories: CatalogItem[];
  setLocalCategories: React.Dispatch<React.SetStateAction<CatalogItem[]>>;
  brandId: string;
  onBrandIdChange: (id: string) => void;
  localBrands: CatalogItem[];
  setLocalBrands: React.Dispatch<React.SetStateAction<CatalogItem[]>>;
  code: string;
  onCodeChange: (value: string) => void;
  name: string;
  onNameChange: (value: string) => void;
  categorySecuencialInfo: { secuencial: number; secuencialVariantes: number } | null;
  taxId: string;
  onTaxChange: (newTaxId: string) => void;
  taxes: GeneralTabTax[];
  observations: string;
  onObservationsChange: (value: string) => void;
  generalFieldsDisabled: boolean;
  generalTabEditMode: boolean;
};

export function GeneralTab({
  companyId,
  categoryId,
  onCategoryChange,
  localCategories,
  setLocalCategories,
  brandId,
  onBrandIdChange,
  localBrands,
  setLocalBrands,
  code,
  onCodeChange,
  name,
  onNameChange,
  categorySecuencialInfo,
  taxId,
  onTaxChange,
  taxes,
  observations,
  onObservationsChange,
  generalFieldsDisabled,
  generalTabEditMode,
}: GeneralTabProps) {
  return (
    <TabsContent
      value="general"
      className="flex-1 overflow-y-auto min-h-0 mt-0 data-[state=inactive]:hidden"
    >
      <div
        className={`rounded-none transition-colors ${
          generalTabEditMode ? "ring-2 ring-amber-300 bg-amber-50/20" : ""
        } ${generalFieldsDisabled ? "opacity-90" : ""}`}
      >
        <fieldset
          disabled={generalFieldsDisabled}
          className="disabled:opacity-70 disabled:pointer-events-none [&_*]:disabled:pointer-events-none min-w-0 p-4 sm:p-6 md:p-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            <div className="flex flex-col">
              <Label className="text-[0.85rem] font-semibold mb-1.5 text-slate-600">
                Categoría <span className="text-red-500">*</span>
              </Label>
              <CatalogSelectWithCreate
                companyId={companyId}
                catalogKey="categories"
                items={localCategories}
                value={categoryId}
                onChange={onCategoryChange}
                onItemCreated={(item) => setLocalCategories((prev) => [...prev, item])}
                placeholder="Seleccionar categoría"
                emptyLabel="— Sin categoría —"
                valueKey="id"
                selectClassName="h-10 px-3 py-2.5 w-full rounded border border-slate-200 bg-[#fafafa] focus:border-acont-primary focus:ring-2 focus:ring-acont-primary/20 text-sm"
              />
            </div>
            <div className="flex flex-col">
              <Label className="text-[0.85rem] font-semibold mb-1.5 text-slate-600">Marca</Label>
              <CatalogSelectWithCreate
                companyId={companyId}
                catalogKey="brands"
                items={localBrands}
                value={brandId}
                onChange={onBrandIdChange}
                onItemCreated={(item) => setLocalBrands((prev) => [...prev, item])}
                placeholder="Seleccionar marca"
                emptyLabel="— Sin marca —"
                valueKey="id"
                selectClassName="h-10 px-3 py-2.5 w-full rounded border border-slate-200 bg-[#fafafa] focus:border-acont-primary focus:ring-2 focus:ring-acont-primary/20 text-sm"
              />
            </div>
            <div className="flex flex-col">
              <Label
                htmlFor="code"
                className="text-[0.85rem] font-semibold mb-1.5 text-slate-600 flex items-center gap-1"
              >
                Código Maestro <span className="text-red-500">*</span>
                <span
                  className="inline-flex text-slate-400 cursor-help"
                  title="Código que agrupa todas las variantes."
                >
                  <Info className="h-3 w-3" />
                </span>
              </Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => onCodeChange(e.target.value)}
                placeholder="Ej: CAM-001"
                className="h-10 px-3 py-2.5 w-full rounded border border-slate-200 bg-[#fafafa] focus:border-acont-primary focus:ring-2 focus:ring-acont-primary/20 text-sm"
              />
            </div>
            <div className="flex flex-col">
              <Label
                htmlFor="name"
                className="text-[0.85rem] font-semibold mb-1.5 text-slate-600"
              >
                Nombre Base <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="Ej: ZAPATO BRASILERO"
                className="h-10 px-3 py-2.5 w-full rounded border border-slate-200 bg-[#fafafa] focus:border-acont-primary focus:ring-2 focus:ring-acont-primary/20 text-sm"
              />
            </div>
            {categoryId && categorySecuencialInfo && (
              <div className="flex flex-col">
                <Label className="text-[0.85rem] font-semibold mb-1.5 text-slate-500">
                  Próximo Secuencial
                </Label>
                <Input
                  value={String(categorySecuencialInfo.secuencial)}
                  readOnly
                  aria-readonly="true"
                  className="h-10 px-3 py-2.5 w-full rounded border border-slate-200 bg-slate-100 text-slate-500 cursor-default text-sm"
                />
              </div>
            )}
            <div
              className={`flex flex-col ${
                !(categoryId && categorySecuencialInfo) ? "md:col-start-2" : ""
              }`}
            >
              <Label className="text-[0.85rem] font-semibold mb-1.5 text-slate-600">
                IVA <span className="text-red-500">*</span>
              </Label>
              <Select
                value={taxId || "none"}
                onValueChange={(v) => onTaxChange(v === "none" ? "" : v)}
              >
                <SelectTrigger className="h-10 px-3 py-2.5 w-full rounded border border-slate-200 bg-[#fafafa] focus:border-acont-primary focus:ring-2 focus:ring-acont-primary/20 text-sm">
                  <SelectValue placeholder="Seleccionar impuesto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Sin impuesto —</SelectItem>
                  {taxes.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.percentage}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col md:col-span-2">
              <Label
                htmlFor="observations"
                className="text-[0.85rem] font-semibold mb-1.5 text-slate-600"
              >
                Observaciones
              </Label>
              <Textarea
                id="observations"
                value={observations}
                onChange={(e) => onObservationsChange(e.target.value)}
                placeholder="Notas generales sobre el artículo..."
                rows={3}
                className="min-h-[4.5rem] px-3 py-2.5 w-full rounded border border-slate-200 bg-[#fafafa] focus:border-acont-primary focus:ring-2 focus:ring-acont-primary/20 text-sm resize-y"
              />
            </div>
          </div>
        </fieldset>
      </div>
    </TabsContent>
  );
}
