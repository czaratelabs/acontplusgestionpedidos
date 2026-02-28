import { roundToFive } from "./math.util";

/**
 * Utilidades reutilizables para cálculos de coste SIN IVA / INC IVA
 * y formateo decimal. Usa roundToFive como única fuente de verdad.
 */

/**
 * Formato decimal: aplica roundToFive, quita ceros finales, mínimo 2 decimales.
 */
export function formatDecimal(value: number | string): string {
  const n = parseFloat(String(value));
  if (Number.isNaN(n)) return "0.00";
  const r = roundToFive(n, 5);
  const s = r.toFixed(5);
  const [intPart, decPart] = s.split(".");
  const trimmed = (decPart ?? "").replace(/0+$/, "");
  if (trimmed.length === 0) return `${intPart}.00`;
  if (trimmed.length === 1) return `${intPart}.${trimmed}0`;
  return `${intPart}.${trimmed}`;
}

/**
 * Convierte coste SIN IVA a coste INC IVA.
 * @param cost - Coste sin IVA (número)
 * @param ivaPct - Porcentaje de IVA (0-100)
 */
export function costToCostIncIva(cost: number, ivaPct: number): number {
  if (!ivaPct || ivaPct === 0) return cost;
  return cost * (1 + ivaPct / 100);
}

/**
 * Convierte coste INC IVA a coste SIN IVA.
 * @param costIncIva - Coste con IVA incluido (número)
 * @param ivaPct - Porcentaje de IVA (0-100)
 */
export function costIncIvaToCost(costIncIva: number, ivaPct: number): number {
  if (!ivaPct || ivaPct === 0) return costIncIva;
  return costIncIva / (1 + ivaPct / 100);
}

/**
 * Obtiene el coste INC IVA formateado a partir del coste SIN IVA.
 * Usa roundToFive (única fuente de verdad para redondeo).
 */
export function formatCostIncIva(cost: number | string, ivaPct: number): string {
  const n = parseFloat(String(cost)) || 0;
  const incIva = costToCostIncIva(n, ivaPct);
  const rounded = roundToFive(incIva, 5);
  return formatDecimal(rounded);
}

/**
 * Parsea un valor INC IVA y devuelve el coste SIN IVA formateado.
 */
export function parseCostIncIvaToCost(value: string | number, ivaPct: number): string {
  const n = parseFloat(String(value)) || 0;
  const costSinIva = costIncIvaToCost(n, ivaPct);
  return formatDecimal(costSinIva);
}
