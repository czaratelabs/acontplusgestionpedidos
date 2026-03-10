# Fase 3 — Refactor frontend artículo (T7 + mejoras)

## Completado

### T7 Parte 2 — Tipos centralizados
- `apps/web/lib/types/article.types.ts`: `VariantRow`, `PricesRow`, `Batch`, `FractionConfig`, `ArticleImage`, `AdditionalBarcode`, `TARIFAS_KEYS`, `emptyPrices`, `emptyVariant`, alias `Brand`/`Category`/`Tax`.
- `apps/web/lib/types/index.ts` reexporta todo.
- `article-form-dialog.tsx` importa desde `@/lib/types/article.types`.

### T7 Parte 1 — Lógica de precios en hook
- `apps/web/lib/hooks/usePriceCalculation.ts`: cálculos de coste, PVP, % rent, fracciones (`handleSalePriceCalculation`, `handlePvpCalculation`, `handleCostToPriceCalculation`, `applyPctRentBlurOrEnter`, `applyPvpCellBlurOrEnter`, `refreshRentabilidadOnCostBlur`, handlers de fracción + `getFractionCost`).
- El diálogo usa `usePriceCalculation({ variants, setVariants, taxId, taxes, toast })` y mantiene `focusPriceCellBelow` / `focusPctRentBelow` en el orchestrator.
- **No** se eliminaron los `fetch`/submit; la API sigue en el diálogo.

### Zod + RHF (base)
- Dependencias ya presentes: `react-hook-form`, `@hookform/resolvers`, `zod`.
- `apps/web/lib/validations/article.schema.ts`: `articleSchema` con general + variantes + fracciones (`conversion_factor` positivo) + barcodes adicionales.
- Integración completa con `FormProvider`/`handleSubmit` puede hacerse de forma incremental sin romper el flujo actual.

### Componentes extraídos
- `components/articles/VariantsTabBanner.tsx`: banner [Código] — [Nombre] ([Categoría]) con token magenta `#D61672`.
- `components/articles/GeneralTab.tsx`: grid 1 → 4 columnas responsive (layout wrapper).
- `components/articles/TariffTable.tsx`: wrapper semántico con acento ámbar `#FFA901` para futura extracción de la tabla PVP.

### UI Variantes
- Pestaña Variantes muestra el banner de sincronización sustituyendo el bloque anterior.
- Multi-barcode y fracciones (Boxes) ya existían en el diálogo; se mantienen; tokens documentados en banner/TariffTable.

## Pendiente (incremental)
- Envolver envío en `handleSubmit` con `zodResolver(articleSchema)` y migrar campos a `register`/`Controller` por fases.
- Mover JSX completo de General/Variants/Tariff a `GeneralTab`/`VariantsTab` dedicados.
- Sustituir `eslint-config-next` path en `eslint.config.mjs` si el build falla en lint (`.js`).
