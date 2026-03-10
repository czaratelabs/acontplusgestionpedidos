"use client";

import React, { createContext, useContext } from "react";
import type { CatalogItem } from "@/lib/api-client";
import type { UsePriceCalculationReturn } from "@/lib/hooks/usePriceCalculation";
import type { ArticleFormTax as Tax } from "@/lib/types/article.types";

export type ArticleFormDialogContextValue = {
  companyId: string;
  taxes: Tax[];
  localCategories: CatalogItem[];
  setLocalCategories: React.Dispatch<React.SetStateAction<CatalogItem[]>>;
  localBrands: CatalogItem[];
  setLocalBrands: React.Dispatch<React.SetStateAction<CatalogItem[]>>;
  localMeasures: CatalogItem[];
  setLocalMeasures: React.Dispatch<React.SetStateAction<CatalogItem[]>>;
  localColors: CatalogItem[];
  setLocalColors: React.Dispatch<React.SetStateAction<CatalogItem[]>>;
  localSizes: CatalogItem[];
  setLocalSizes: React.Dispatch<React.SetStateAction<CatalogItem[]>>;
  localFlavors: CatalogItem[];
  setLocalFlavors: React.Dispatch<React.SetStateAction<CatalogItem[]>>;
  categorySecuencialInfo: { secuencial: number; secuencialVariantes: number } | null;
  generalFieldsDisabled: boolean;
  generalTabEditMode: boolean;
  handleCategoryChange: (newCategoryId: string) => void;
  handleTaxChange: (newTaxId: string) => void;
  effectiveArticleId: string | null;
  canAddVariant: boolean;
  editingVariantIndex: number | null;
  setEditingVariantIndex: (n: number | null) => void;
  expandedVariantIndex: number | null;
  setExpandedVariantIndex: (n: number | null) => void;
  addVariant: () => void;
  removeVariant: (index: number) => void;
  saveSingleVariant: (index: number) => void | Promise<void>;
  cancelEditVariant: () => void;
  startEditVariant: (index: number) => void;
  isVariantDirty: (index: number) => boolean;
  /** Validación al guardar variante: usar variantSubmitSchema + trigger en el diálogo. */
  validateVariantForSave: (index: number) => Promise<boolean>;
  additionalBarcodeInputByIndex: Record<number, string>;
  setAdditionalBarcodeInputByIndex: React.Dispatch<
    React.SetStateAction<Record<number, string>>
  >;
  editingBarcodeDescription: { variantIndex: number; barcodeIndex: number } | null;
  setEditingBarcodeDescription: (
    v: { variantIndex: number; barcodeIndex: number } | null,
  ) => void;
  addAdditionalBarcode: (variantIndex: number) => Promise<void>;
  removeAdditionalBarcode: (variantIndex: number, barcodeIndex: number) => void;
  updateAdditionalBarcodeDescription: (
    variantIndex: number,
    barcodeIndex: number,
    description: string,
  ) => void;
  tariffLabels: Record<string, string>;
  profitabilityConfig: {
    defaultPercentages: Record<string, number>;
    profiles: Array<{
      name?: string;
      categoryIds: string[];
      percentages: Record<string, number>;
    }>;
  } | null;
  applyProfilePercentages: () => void;
  activeProfileName: string;
  pricing: UsePriceCalculationReturn;
  focusPriceCellBelow: (
    variantIndex: number,
    column: "precioVenta" | "pvp",
    currentKey: number,
  ) => void;
  focusPctRentBelow: (variantIndex: number, currentKey: number) => void;
  formatCostIncIva: (cost: string | number, ivaPct: number) => string;
};

const ArticleFormDialogContext = createContext<ArticleFormDialogContextValue | null>(
  null,
);

export function ArticleFormDialogProvider({
  value,
  children,
}: {
  value: ArticleFormDialogContextValue;
  children: React.ReactNode;
}) {
  return (
    <ArticleFormDialogContext.Provider value={value}>
      {children}
    </ArticleFormDialogContext.Provider>
  );
}

export function useArticleFormDialogContext(): ArticleFormDialogContextValue {
  const ctx = useContext(ArticleFormDialogContext);
  if (!ctx) {
    throw new Error(
      "useArticleFormDialogContext must be used within ArticleFormDialogProvider",
    );
  }
  return ctx;
}
