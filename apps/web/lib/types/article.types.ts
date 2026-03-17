/**
 * Fuente única de verdad para tipos del formulario de artículo / variantes.
 * Usado por article-form-dialog, hooks y subcomponentes.
 */

export type PricesRow = {
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

export const TARIFAS_KEYS = [1, 2, 3, 4, 5] as const;

export function emptyPrices(): PricesRow {
  return {
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
  };
}

export type ArticleImage = {
  id: string;
  url: string;
  isMain: boolean;
  sortOrder: number;
};

export type Batch = {
  id: string;
  batchNumber: string;
  expirationDate: string | null;
  currentStock: number;
};

export type AdditionalBarcode = { barcode: string; description: string };

export type VariantRow = {
  id?: string;
  sku: string;
  barcode: string;
  additionalBarcodes: AdditionalBarcode[];
  cost: string;
  costIncIva?: string;
  colorId: string;
  sizeId: string;
  flavorId: string;
  measureId: string;
  weight: string;
  observations: string;
  prices: PricesRow;
  /** Fraccionamiento desde otra variante */
  isFraction?: boolean;
  sourceVariantId?: string;
  conversionFactor?: string;
  /** Flags de visibilidad/ventas */
  isDefault?: boolean;
  isVisible?: boolean;
  /** Medida secundaria (unidad fraccionada). */
  secondaryMeasureId?: string;
};

export function emptyVariant(): VariantRow {
  return {
    sku: "",
    barcode: "",
    additionalBarcodes: [],
    cost: "0",
    colorId: "",
    sizeId: "",
    flavorId: "",
    measureId: "",
    weight: "0",
    observations: "",
    prices: emptyPrices(),
    isFraction: false,
    sourceVariantId: "",
    conversionFactor: "",
    isDefault: false,
    isVisible: true,
    secondaryMeasureId: "",
  };
}

/** Catálogos usados en el diálogo (pueden vivir también en api-client). */
export type ArticleFormBrand = { id: string; name: string };
export type ArticleFormCategory = {
  id: string;
  name: string;
  siglas?: string;
  secuencial?: number;
  secuencial_variantes?: number;
  secuencialVariantes?: number;
};
export type ArticleFormTax = { id: string; name: string; percentage: number };
