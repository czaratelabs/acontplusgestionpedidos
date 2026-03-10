/**
 * Lógica de cálculo coste / rentabilidad / PVP extraída del article-form-dialog.
 * Recibe dependencias y devuelve funciones ligadas a setVariants + estado actual.
 */

import type React from "react";
import { formatDecimal, costIncIvaToCost } from "@/lib/cost-iva";
import { roundToFive } from "@/lib/math.util";
import type { VariantRow, PricesRow } from "@/lib/types/article.types";
import { TARIFAS_KEYS, emptyPrices } from "@/lib/types/article.types";

export type TaxLike = { id: string; percentage: number };

export function getFractionCost(v: VariantRow): number {
  const cost = parseFloat(String(v.cost ?? "0")) || 0;
  const first = (v.fractions ?? [])[0];
  const factor = first
    ? parseFloat(String(first.conversion_factor ?? "0").replace(",", ".")) || 0
    : 0;
  return roundToFive(cost * factor, 5);
}

export type PreserveSourceField = {
  field: "pctRent" | "precioVenta" | "pvp";
  key: number;
};

export type UsePriceCalculationDeps = {
  variants: VariantRow[];
  setVariants: React.Dispatch<React.SetStateAction<VariantRow[]>>;
  taxId: string;
  taxes: TaxLike[];
  toast: (opts: {
    title: string;
    description?: string;
    variant?: "default" | "destructive";
  }) => void;
};

export function usePriceCalculation(deps: UsePriceCalculationDeps) {
  const { variants, setVariants, taxId, taxes, toast } = deps;

  const getIvaPct = () =>
    taxId ? taxes.find((t) => t.id === taxId)?.percentage ?? 0 : 0;

  function handleSalePriceCalculation(variantIndex: number, key: number) {
    const v = variants[variantIndex];
    if (!v) return;
    const cost = roundToFive(parseFloat(String(v.cost)) || 0, 5);
    const ivaPct = getIvaPct();
    const costIncIva =
      ivaPct !== 0 ? roundToFive(cost * (1 + ivaPct / 100), 5) : cost;
    const raw = v.prices[`precioVenta${key}` as keyof PricesRow];
    const precioVentaNum = parseFloat(String(raw ?? "")) || 0;
    const isEmpty = raw === "" || raw == null;
    const isInvalid =
      isEmpty || precioVentaNum <= 0 || precioVentaNum <= cost;

    setVariants((prev) => {
      const next = [...prev];
      const curr = next[variantIndex];
      if (!curr?.prices) return prev;
      const prices = { ...(curr.prices as Record<string, string>) };
      if (isInvalid) {
        prices[`precioVenta${key}`] = "0";
        prices[`pvp${key}`] = "0";
        prices[`porcentajeRentabilidad${key}`] = "0";
        prices[`rentabilidad${key}`] = "0";
        prices[`rentabilidadIncIva${key}`] = "0";
      } else {
        const pv = roundToFive(precioVentaNum, 5);
        const pvp = roundToFive(pv * (1 + ivaPct / 100), 5);
        const pctRent =
          cost > 0 ? roundToFive(((pv - cost) / cost) * 100, 5) : 0;
        const valorRent = roundToFive(pv - cost, 5);
        const valorRentIncIva = roundToFive(pvp - costIncIva, 5);
        prices[`precioVenta${key}`] = formatDecimal(pv);
        prices[`pvp${key}`] = formatDecimal(pvp);
        prices[`porcentajeRentabilidad${key}`] = formatDecimal(pctRent);
        prices[`rentabilidad${key}`] = formatDecimal(valorRent);
        prices[`rentabilidadIncIva${key}`] = formatDecimal(valorRentIncIva);
      }
      next[variantIndex] = { ...curr, prices: prices as PricesRow };
      return next;
    });
  }

  function handlePvpCalculation(variantIndex: number, rowIndex: number) {
    const v = variants[variantIndex];
    if (!v) return;
    const cost = roundToFive(parseFloat(String(v.cost)) || 0, 5);
    const ivaPct = getIvaPct();
    const costIncIva =
      ivaPct !== 0 ? roundToFive(cost * (1 + ivaPct / 100), 5) : cost;
    const raw = v.prices[`pvp${rowIndex}` as keyof PricesRow];
    const pvpNum = parseFloat(String(raw ?? "")) || 0;
    const isEmpty = raw === "" || raw == null;
    const isInvalid = isEmpty || pvpNum <= 0 || pvpNum <= costIncIva;

    setVariants((prev) => {
      const next = [...prev];
      const curr = next[variantIndex];
      if (!curr?.prices) return prev;
      const prices = { ...(curr.prices as Record<string, string>) };
      if (isInvalid) {
        prices[`precioVenta${rowIndex}`] = "0";
        prices[`pvp${rowIndex}`] = "0";
        prices[`porcentajeRentabilidad${rowIndex}`] = "0";
        prices[`rentabilidad${rowIndex}`] = "0";
        prices[`rentabilidadIncIva${rowIndex}`] = "0";
      } else {
        const pvp = roundToFive(pvpNum, 5);
        const precioVenta =
          ivaPct !== 0 ? roundToFive(pvp / (1 + ivaPct / 100), 5) : pvp;
        const pctRent =
          cost > 0
            ? roundToFive(((precioVenta - cost) / cost) * 100, 5)
            : 0;
        const valorRent = roundToFive(precioVenta - cost, 5);
        const valorRentIncIva = roundToFive(pvp - costIncIva, 5);
        prices[`precioVenta${rowIndex}`] = formatDecimal(precioVenta);
        prices[`pvp${rowIndex}`] = formatDecimal(pvp);
        prices[`porcentajeRentabilidad${rowIndex}`] = formatDecimal(pctRent);
        prices[`rentabilidad${rowIndex}`] = formatDecimal(valorRent);
        prices[`rentabilidadIncIva${rowIndex}`] =
          formatDecimal(valorRentIncIva);
      }
      next[variantIndex] = { ...curr, prices: prices as PricesRow };
      return next;
    });
  }

  function applyPvpCellBlurOrEnter(
    variantIndex: number,
    preserveField: "pctRent" | "precioVenta" | "pvp",
    key: number,
  ) {
    refreshRentabilidadOnCostBlur(variantIndex, undefined, {
      field: preserveField,
      key,
    });
  }

  function applyPctRentBlurOrEnter(variantIndex: number, key: number) {
    const v = variants[variantIndex];
    if (!v) return;
    const raw = v.prices[`porcentajeRentabilidad${key}` as keyof PricesRow];
    const numVal = parseFloat(String(raw ?? "")) || 0;
    const finalVal = numVal < 0 || raw === "" || raw == null ? 0 : numVal;
    if (finalVal === 0) {
      setVariants((prev) => {
        const next = [...prev];
        const curr = next[variantIndex];
        if (!curr?.prices) return prev;
        const prices = { ...(curr.prices as Record<string, string>) };
        prices[`porcentajeRentabilidad${key}`] = "0";
        prices[`precioVenta${key}`] = "0";
        prices[`pvp${key}`] = "0";
        prices[`rentabilidad${key}`] = "0";
        prices[`rentabilidadIncIva${key}`] = "0";
        next[variantIndex] = { ...curr, prices: prices as PricesRow };
        return next;
      });
    } else {
      applyPvpCellBlurOrEnter(variantIndex, "pctRent", key);
    }
  }

  function handleCostToPriceCalculation(
    variantIndex: number,
    source?: "sinIva" | "incIva",
    moveFocus?: boolean,
  ) {
    const v = variants[variantIndex];
    if (!v) return;
    const ivaPct = getIvaPct();
    let costSinIva: number;
    if (source === "incIva") {
      const rawIncIva = parseFloat(String(v.costIncIva ?? v.cost)) || 0;
      costSinIva = roundToFive(costIncIvaToCost(rawIncIva, ivaPct), 5);
    } else {
      costSinIva = roundToFive(parseFloat(String(v.cost)) || 0, 5);
    }
    refreshRentabilidadOnCostBlur(variantIndex, costSinIva);
    if (moveFocus) {
      setTimeout(() => {
        const el = document.getElementById(`pvp-${variantIndex}-1`);
        if (el instanceof HTMLInputElement) {
          el.scrollIntoView({ behavior: "smooth", block: "nearest" });
          el.focus();
        }
      }, 0);
    }
  }

  function refreshRentabilidadOnCostBlur(
    variantIndex: number,
    costOverride?: string | number,
    preserveSourceField?: PreserveSourceField,
  ): boolean {
    const v = variants[variantIndex];
    if (!v) return false;
    const cost =
      costOverride != null
        ? parseFloat(String(costOverride)) || 0
        : parseFloat(v.cost) || 0;
    const ivaPct = getIvaPct();
    const costIncIva = ivaPct !== 0 ? cost * (1 + ivaPct / 100) : cost;

    if (cost <= 0 || costIncIva <= 0) {
      toast({
        title: "Costo inválido",
        description:
          "El Precio de Costo SIN IVA e INC IVA debe ser mayor a cero.",
        variant: "destructive",
      });
      const updatedPrices: Record<string, string> = {
        ...(v.prices as Record<string, string>),
      };
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
        next[variantIndex] = {
          ...curr,
          prices: updatedPrices as PricesRow,
        };
        return next;
      });
      return false;
    }

    const updatedPrices: Record<string, string> = {
      ...(v.prices as Record<string, string>),
    };
    for (const key of TARIFAS_KEYS) {
      const preserve =
        preserveSourceField?.key === key ? preserveSourceField.field : null;
      const pctRent =
        parseFloat(
          v.prices[`porcentajeRentabilidad${key}` as keyof PricesRow] ?? "0",
        ) || 0;
      if (preserve !== "pctRent" && pctRent <= 0) {
        if (preserve !== "precioVenta")
          updatedPrices[`precioVenta${key}`] = "0";
        if (preserve !== "pvp") updatedPrices[`pvp${key}`] = "0";
        updatedPrices[`rentabilidad${key}`] = "0";
        updatedPrices[`rentabilidadIncIva${key}`] = "0";
        continue;
      }
      let precioVenta: number;
      let pvp: number;
      if (preserve === "precioVenta") {
        precioVenta =
          parseFloat(updatedPrices[`precioVenta${key}`] ?? "0") || 0;
        pvp =
          ivaPct === 0 ? precioVenta : precioVenta * (1 + ivaPct / 100);
      } else if (preserve === "pvp") {
        pvp = parseFloat(updatedPrices[`pvp${key}`] ?? "0") || 0;
        precioVenta =
          ivaPct === 0 ? pvp : pvp / (1 + ivaPct / 100);
      } else {
        precioVenta = cost + cost * (pctRent / 100);
        pvp =
          ivaPct === 0 ? precioVenta : precioVenta * (1 + ivaPct / 100);
      }
      const valorRent = roundToFive(precioVenta - cost, 5);
      const valorRentIncIva = roundToFive(pvp - costIncIva, 5);
      if (preserve !== "precioVenta")
        updatedPrices[`precioVenta${key}`] = formatDecimal(
          roundToFive(precioVenta, 5),
        );
      if (preserve !== "pvp")
        updatedPrices[`pvp${key}`] = formatDecimal(roundToFive(pvp, 5));
      if (preserve === "precioVenta" || preserve === "pvp") {
        const pctRentCalculated =
          precioVenta > 0
            ? roundToFive(((precioVenta - cost) / precioVenta) * 100, 5)
            : 0;
        updatedPrices[`porcentajeRentabilidad${key}`] =
          formatDecimal(pctRentCalculated);
      }
      updatedPrices[`rentabilidad${key}`] = formatDecimal(valorRent);
      updatedPrices[`rentabilidadIncIva${key}`] =
        formatDecimal(valorRentIncIva);
    }

    const activeId =
      typeof document !== "undefined" ? document.activeElement?.id ?? "" : "";
    for (const key of TARIFAS_KEYS) {
      const pvpVal = parseFloat(updatedPrices[`pvp${key}`] ?? "0") || 0;
      if (pvpVal <= 0) continue;
      const preserve =
        preserveSourceField?.key === key ? preserveSourceField.field : null;
      const pvpInputId = `pvp-${variantIndex}-${key}`;
      const precioVentaInputId = `precioVenta-${variantIndex}-${key}`;
      const skipPvpUpdate = preserve === "pvp" || activeId === pvpInputId;
      const skipPrecioVentaUpdate =
        preserve === "precioVenta" || activeId === precioVentaInputId;
      const roundedPvp = roundToFive(pvpVal, 5);
      const pvpSource = skipPvpUpdate ? pvpVal : roundedPvp;
      if (!skipPvpUpdate)
        updatedPrices[`pvp${key}`] = formatDecimal(roundedPvp);
      const precioVentaFromPvp =
        ivaPct === 0 ? pvpSource : pvpSource / (1 + ivaPct / 100);
      const roundedPrecioVenta = roundToFive(precioVentaFromPvp, 5);
      const precioVentaForRent = skipPrecioVentaUpdate
        ? parseFloat(updatedPrices[`precioVenta${key}`] ?? "0") || 0
        : roundedPrecioVenta;
      if (!skipPrecioVentaUpdate)
        updatedPrices[`precioVenta${key}`] =
          formatDecimal(roundedPrecioVenta);
      const roundedValorRent = roundToFive(precioVentaForRent - cost, 5);
      const roundedValorRentIncIva = roundToFive(pvpSource - costIncIva, 5);
      updatedPrices[`rentabilidad${key}`] = formatDecimal(roundedValorRent);
      updatedPrices[`rentabilidadIncIva${key}`] =
        formatDecimal(roundedValorRentIncIva);
    }

    setVariants((prev) => {
      const next = [...prev];
      const curr = next[variantIndex];
      if (!curr?.prices) return prev;
      next[variantIndex] = {
        ...curr,
        prices: updatedPrices as PricesRow,
      };
      return next;
    });
    return true;
  }

  // Fracción: misma lógica que base pero usando getFractionCost y fractionPrices
  function handleFractionSalePriceCalculation(variantIndex: number, key: number) {
    const v = variants[variantIndex];
    if (!v?.fractionEnabled || (v.fractions ?? []).length === 0) return;
    const cost = getFractionCost(v);
    const ivaPct = getIvaPct();
    const costIncIva =
      ivaPct !== 0 ? roundToFive(cost * (1 + ivaPct / 100), 5) : cost;
    const raw = (v.fractionPrices ?? emptyPrices())[
      `precioVenta${key}` as keyof PricesRow
    ];
    const precioVentaNum = parseFloat(String(raw ?? "")) || 0;
    const isEmpty = raw === "" || raw == null;
    const isInvalid =
      isEmpty || precioVentaNum <= 0 || precioVentaNum <= cost;
    setVariants((prev) => {
      const next = [...prev];
      const curr = next[variantIndex];
      if (!curr?.fractionPrices) return prev;
      const prices = { ...(curr.fractionPrices as Record<string, string>) };
      if (isInvalid) {
        prices[`precioVenta${key}`] = "0";
        prices[`pvp${key}`] = "0";
        prices[`porcentajeRentabilidad${key}`] = "0";
        prices[`rentabilidad${key}`] = "0";
        prices[`rentabilidadIncIva${key}`] = "0";
      } else {
        const pv = roundToFive(precioVentaNum, 5);
        const pvp = roundToFive(pv * (1 + ivaPct / 100), 5);
        const pctRent =
          cost > 0 ? roundToFive(((pv - cost) / cost) * 100, 5) : 0;
        const valorRent = roundToFive(pv - cost, 5);
        const valorRentIncIva = roundToFive(pvp - costIncIva, 5);
        prices[`precioVenta${key}`] = formatDecimal(pv);
        prices[`pvp${key}`] = formatDecimal(pvp);
        prices[`porcentajeRentabilidad${key}`] = formatDecimal(pctRent);
        prices[`rentabilidad${key}`] = formatDecimal(valorRent);
        prices[`rentabilidadIncIva${key}`] = formatDecimal(valorRentIncIva);
      }
      next[variantIndex] = { ...curr, fractionPrices: prices as PricesRow };
      return next;
    });
  }

  function handleFractionPvpCalculation(variantIndex: number, rowIndex: number) {
    const v = variants[variantIndex];
    if (!v?.fractionEnabled || (v.fractions ?? []).length === 0) return;
    const cost = getFractionCost(v);
    const ivaPct = getIvaPct();
    const costIncIva =
      ivaPct !== 0 ? roundToFive(cost * (1 + ivaPct / 100), 5) : cost;
    const raw = (v.fractionPrices ?? emptyPrices())[
      `pvp${rowIndex}` as keyof PricesRow
    ];
    const pvpNum = parseFloat(String(raw ?? "")) || 0;
    const isEmpty = raw === "" || raw == null;
    const isInvalid = isEmpty || pvpNum <= 0 || pvpNum <= costIncIva;
    setVariants((prev) => {
      const next = [...prev];
      const curr = next[variantIndex];
      if (!curr?.fractionPrices) return prev;
      const prices = { ...(curr.fractionPrices as Record<string, string>) };
      if (isInvalid) {
        prices[`precioVenta${rowIndex}`] = "0";
        prices[`pvp${rowIndex}`] = "0";
        prices[`porcentajeRentabilidad${rowIndex}`] = "0";
        prices[`rentabilidad${rowIndex}`] = "0";
        prices[`rentabilidadIncIva${rowIndex}`] = "0";
      } else {
        const pvp = roundToFive(pvpNum, 5);
        const precioVenta =
          ivaPct !== 0 ? roundToFive(pvp / (1 + ivaPct / 100), 5) : pvp;
        const pctRent =
          cost > 0
            ? roundToFive(((precioVenta - cost) / cost) * 100, 5)
            : 0;
        const valorRent = roundToFive(precioVenta - cost, 5);
        const valorRentIncIva = roundToFive(pvp - costIncIva, 5);
        prices[`precioVenta${rowIndex}`] = formatDecimal(precioVenta);
        prices[`pvp${rowIndex}`] = formatDecimal(pvp);
        prices[`porcentajeRentabilidad${rowIndex}`] = formatDecimal(pctRent);
        prices[`rentabilidad${rowIndex}`] = formatDecimal(valorRent);
        prices[`rentabilidadIncIva${rowIndex}`] =
          formatDecimal(valorRentIncIva);
      }
      next[variantIndex] = { ...curr, fractionPrices: prices as PricesRow };
      return next;
    });
  }

  function applyFractionPctRentBlurOrEnter(variantIndex: number, key: number) {
    const v = variants[variantIndex];
    if (!v?.fractionEnabled || (v.fractions ?? []).length === 0) return;
    const raw = (v.fractionPrices ?? emptyPrices())[
      `porcentajeRentabilidad${key}` as keyof PricesRow
    ];
    const numVal = parseFloat(String(raw ?? "")) || 0;
    const finalVal = numVal < 0 || raw === "" || raw == null ? 0 : numVal;
    if (finalVal === 0) {
      setVariants((prev) => {
        const next = [...prev];
        const curr = next[variantIndex];
        if (!curr?.fractionPrices) return prev;
        const prices = { ...(curr.fractionPrices as Record<string, string>) };
        prices[`porcentajeRentabilidad${key}`] = "0";
        prices[`precioVenta${key}`] = "0";
        prices[`pvp${key}`] = "0";
        prices[`rentabilidad${key}`] = "0";
        prices[`rentabilidadIncIva${key}`] = "0";
        next[variantIndex] = {
          ...curr,
          fractionPrices: prices as PricesRow,
        };
        return next;
      });
    } else {
      const cost = getFractionCost(v);
      const ivaPct = getIvaPct();
      const costIncIva =
        ivaPct !== 0 ? roundToFive(cost * (1 + ivaPct / 100), 5) : cost;
      const precioVenta =
        cost > 0 ? roundToFive(cost * (1 + finalVal / 100), 5) : 0;
      const pvp =
        ivaPct !== 0
          ? roundToFive(precioVenta * (1 + ivaPct / 100), 5)
          : precioVenta;
      const valorRent = roundToFive(precioVenta - cost, 5);
      const valorRentIncIva = roundToFive(pvp - costIncIva, 5);
      setVariants((prev) => {
        const next = [...prev];
        const curr = next[variantIndex];
        if (!curr?.fractionPrices) return prev;
        const prices = { ...(curr.fractionPrices as Record<string, string>) };
        prices[`porcentajeRentabilidad${key}`] = formatDecimal(finalVal);
        prices[`precioVenta${key}`] = formatDecimal(precioVenta);
        prices[`pvp${key}`] = formatDecimal(pvp);
        prices[`rentabilidad${key}`] = formatDecimal(valorRent);
        prices[`rentabilidadIncIva${key}`] = formatDecimal(valorRentIncIva);
        next[variantIndex] = {
          ...curr,
          fractionPrices: prices as PricesRow,
        };
        return next;
      });
    }
  }

  return {
    getFractionCost,
    handleSalePriceCalculation,
    handlePvpCalculation,
    handleCostToPriceCalculation,
    applyPctRentBlurOrEnter,
    applyPvpCellBlurOrEnter,
    refreshRentabilidadOnCostBlur,
    handleFractionSalePriceCalculation,
    handleFractionPvpCalculation,
    applyFractionPctRentBlurOrEnter,
  };
}

export type UsePriceCalculationReturn = ReturnType<typeof usePriceCalculation>;
