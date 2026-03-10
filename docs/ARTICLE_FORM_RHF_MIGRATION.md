# Migración Article Form → React Hook Form + Zod

## Hecho

### Step 1 — Schema (`apps/web/lib/validations/article.schema.ts`)
- `articleSchema`: `code`, `name`, `categoryId`, `taxId`, `brandId`, `observations`, `variants[]`.
- `variantSchema` alineado con `VariantRow` (precios passthrough, fracciones, barcodes adicionales).
- `variantSubmitSchema` + `variantIsCompleteForSave` para validar una variante al guardar.
- `safeParseVariantAtIndex(variants, index)` sustituye el antiguo `getVariantValidation(index)` sin duplicar reglas.
- `getDefaultArticleFormValues()` para `defaultValues` de `useForm`.

### Step 2–3 — Pattern en el diálogo (pendiente de cableado completo)
```ts
const methods = useForm<ArticleFormValues>({
  resolver: zodResolver(articleSchema),
  defaultValues: getDefaultArticleFormValues(),
  mode: 'onChange',
});
const setVariantsAdapter = useCallback((updater) => {
  const cur = methods.getValues('variants') ?? [];
  const next = typeof updater === 'function' ? updater(cur) : updater;
  methods.setValue('variants', next, { shouldDirty: true });
}, [methods]);
const variants = methods.watch('variants') ?? [];
// usePriceCalculation({ variants, setVariants: setVariantsAdapter, taxId: watch('taxId'), ... })
```

- Envolver el `<form>` con `<FormProvider {...methods}>`.
- Al cargar `initialData` / reset nuevo artículo: un solo `methods.reset({ ... })` en lugar de decenas de `setState`.

### Step 4 — GeneralTab
- **Ya migrado**: `GeneralTab` sin props; usa `useFormContext<ArticleFormValues>()` + `Controller` para categoría, marca, IVA; `register` para code, name, observations.
- Debe vivir dentro de `FormProvider`.

### Step 4 — VariantsTab (siguiente)
- Sustituir props por `useFormContext` + `watch('variants')`.
- Mutaciones: `setValue('variants.${i}.sku', ...)` o `setValue('variants', newArray)`.
- Opcional: `useFieldArray({ name: 'variants' })` para `append`/`remove` estables; el hook de precios puede seguir trabajando con el array completo vía `setValue('variants', ...)`.

### Step 5 — Sustitución de validación manual
- **General**: `await trigger(['code','name','categoryId'])` antes de `saveGeneralArticleData`; deshabilitar botón con `!methods.formState.isValid` tras `trigger`, o `handleSubmit(saveGeneralArticleData)`.
- **Variante**: `safeParseVariantAtIndex(methods.getValues('variants'), index)` en `saveSingleVariant`; eliminar `getVariantValidation`.
- Eliminar `canSaveGeneral` / `validationMessageGeneral` useMemos cuando todo el flujo pase por schema + `formState.errors`.

## Contexto de UI no-form
`ArticleFormDialogProvider` (`article-form-context.tsx`) concentra lo que no es campo del formulario: catálogos locales, `effectiveArticleId`, `pricing`, `focusPriceCellBelow`, etc., para que VariantsTab deje de recibir 35+ props.

## Restricción
No cambiar layout; solo flujo de datos. Los endpoints y payloads de API se mantienen; el submit sigue construyendo el mismo `payload` desde `getValues()` / datos validados.
