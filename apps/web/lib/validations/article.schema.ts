import { z } from "zod";

const fractionConfigSchema = z.object({
  fraction_name: z.string(),
  conversion_factor: z
    .string()
    .refine((s) => {
      const n = parseFloat(String(s).replace(",", "."));
      return !Number.isNaN(n) && n > 0;
    }, "El factor de conversión debe ser un número positivo"),
});

const additionalBarcodeSchema = z.object({
  barcode: z.string().min(1, "Código de barras requerido"),
  description: z.string(),
});

const pricesRowSchema = z.object({
  precioVenta1: z.string().optional(),
  precioVenta2: z.string().optional(),
  precioVenta3: z.string().optional(),
  precioVenta4: z.string().optional(),
  precioVenta5: z.string().optional(),
  pvp1: z.string().optional(),
  pvp2: z.string().optional(),
  pvp3: z.string().optional(),
  pvp4: z.string().optional(),
  pvp5: z.string().optional(),
});

const variantSchema = z.object({
  id: z.string().optional(),
  sku: z.string().min(1, "SKU obligatorio"),
  barcode: z.string().min(1, "Código de barras principal obligatorio"),
  additionalBarcodes: z.array(additionalBarcodeSchema).default([]),
  cost: z.string().default("0"),
  costIncIva: z.string().optional(),
  colorId: z.string(),
  sizeId: z.string(),
  flavorId: z.string(),
  measureId: z.string(),
  weight: z.string().default("0"),
  observations: z.string().default(""),
  prices: pricesRowSchema.default({}),
  fractionEnabled: z.boolean().optional(),
  fractions: z.array(fractionConfigSchema).default([]),
  fractionPrices: pricesRowSchema.optional(),
});

export const articleSchema = z.object({
  code: z.string().min(1, "Código maestro requerido"),
  name: z.string().min(1, "Nombre requerido"),
  categoryId: z.string().min(1, "Categoría requerida"),
  taxId: z.string().min(1, "IVA requerido"),
  brandId: z.string().optional().nullable(),
  observations: z.string().optional().nullable(),
  variants: z.array(variantSchema).min(0),
});

export type ArticleSchemaIn = z.input<typeof articleSchema>;
export type ArticleSchemaOut = z.output<typeof articleSchema>;
