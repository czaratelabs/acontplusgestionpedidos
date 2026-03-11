import { z } from "zod";
import { emptyPrices, emptyVariant } from "@/lib/types/article.types";

/**
 * Schema completo del artículo + variantes para RHF + zodResolver.
 * Variantes en borrador pueden tener strings vacíos; la validación estricta
 * al guardar se fuerza con trigger() / handleSubmit.
 */

const fractionConfigSchema = z.object({
  fraction_name: z.string(),
  conversion_factor: z
    .string()
    .refine((s) => {
      if (!s || !String(s).trim()) return true; // borrador
      const n = parseFloat(String(s).replace(",", "."));
      return !Number.isNaN(n) && n > 0;
    }, "El factor de conversión debe ser un número positivo"),
});

const additionalBarcodeSchema = z.object({
  barcode: z.string(),
  description: z.string().optional().default(""),
});

/** Todas las claves de PricesRow como string opcional (valores numéricos en UI son strings). */
const pricesRowSchema = z
  .object({
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
    porcentajeRentabilidad1: z.string().optional(),
    porcentajeRentabilidad2: z.string().optional(),
    porcentajeRentabilidad3: z.string().optional(),
    porcentajeRentabilidad4: z.string().optional(),
    porcentajeRentabilidad5: z.string().optional(),
    rentabilidad1: z.string().optional(),
    rentabilidad2: z.string().optional(),
    rentabilidad3: z.string().optional(),
    rentabilidad4: z.string().optional(),
    rentabilidad5: z.string().optional(),
    rentabilidadIncIva1: z.string().optional(),
    rentabilidadIncIva2: z.string().optional(),
    rentabilidadIncIva3: z.string().optional(),
    rentabilidadIncIva4: z.string().optional(),
    rentabilidadIncIva5: z.string().optional(),
  })
  .passthrough();

const variantSchema = z.object({
  id: z.string().optional(),
  sku: z.string(),
  barcode: z.string(),
  additionalBarcodes: z.array(additionalBarcodeSchema).default([]),
  cost: z.string().default("0"),
  costIncIva: z.string().optional(),
  colorId: z.string().optional().default(""),
  sizeId: z.string().optional().default(""),
  flavorId: z.string().optional().default(""),
  measureId: z.string().optional().default(""),
  weight: z.string().optional().default("0"),
  observations: z.string().optional().default(""),
  prices: pricesRowSchema.default({}),
  fractionEnabled: z.boolean().optional().default(false),
  fractions: z.array(fractionConfigSchema).default([]),
  fractionPrices: pricesRowSchema.optional(),
});

/** Variante lista para persistir: SKU, barcode, coste > 0, medida; fracciones si fractionEnabled. */
function variantIsCompleteForSave(v: z.infer<typeof variantSchema>): boolean {
  const skuOk = Boolean(v.sku?.trim());
  const barcodeOk = Boolean(v.barcode?.trim());
  const costNum = parseFloat(String(v.cost)) || 0;
  const costOk = costNum > 0;
  const measureOk = Boolean(v.measureId?.trim());
  const costIncIvaVal = v.costIncIva != null ? String(v.costIncIva).trim() : "";
  const costIncIvaOk = costIncIvaVal !== "" || costNum > 0;
  if (!skuOk || !barcodeOk || !costOk || !costIncIvaOk || !measureOk) return false;
  if (v.fractionEnabled) {
    if ((v.fractions ?? []).length === 0) return false;
    for (const f of v.fractions ?? []) {
      if (!(f.fraction_name ?? "").trim()) return false;
      const factor = parseFloat(String(f.conversion_factor ?? "").replace(",", ".")) || 0;
      if (factor <= 0 || factor > 1) return false;
    }
  }
  return true;
}

export const articleSchema = z.object({
  code: z.string().min(1, "Código maestro requerido"),
  name: z.string().min(1, "Nombre requerido"),
  categoryId: z.string().min(1, "Categoría requerida"),
  taxId: z.string(), // "" = sin impuesto
  brandId: z.string().optional().default(""),
  observations: z.string().optional().default(""),
  variants: z.array(variantSchema).default([]),
});

/** Schema estricto para una variante al guardar (saveSingleVariant / trigger). */
export const variantSubmitSchema = variantSchema.superRefine((v, ctx) => {
  if (!variantIsCompleteForSave(v)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "SKU, Código de barras, Costo SIN/INC IVA y Medida son obligatorios.",
      path: ["sku"],
    });
  }
});

export type ArticleFormValues = z.input<typeof articleSchema>;

/** Valores por defecto alineados con emptyVariant + general vacío. */
export function getDefaultArticleFormValues(): ArticleFormValues {
  const v = emptyVariant();
  return {
    code: "",
    name: "",
    categoryId: "",
    taxId: "",
    brandId: "",
    observations: "",
    variants: [],
  };
}

export { variantIsCompleteForSave };

/** Valida una variante con el schema estricto (sin acoplar a RHF). */
export function safeParseVariantAtIndex(
  variants: unknown[] | undefined,
  index: number,
): { success: true } | { success: false; error: string } {
  const v = variants?.[index];
  const r = variantSubmitSchema.safeParse(v);
  if (r.success) return { success: true };
  const msg = r.error.issues[0]?.message ?? "Variante incompleta";
  return { success: false, error: msg };
}
