import { roundToTwo } from "./math.util";

/**
 * Utilidades reutilizables para cálculos de coste SIN IVA / INC IVA
 * y formateo decimal con redondeo de nueves.
 */

/**
 * Redondeo con regla de nueves: si hay 2+ nueves seguidos al final de los decimales,
 * redondear en la posición anterior. Si el primer dígito descartado es >= 5, el redondeo
 * se propaga (21.59999 → 21.60, 21.99999 → 22.00). Si es < 5, la cadena de nueves se queda.
 */
export function roundNines(n: number): number {
  const s = n.toFixed(10);
  const [, decPart] = s.split(".");
  const dec = decPart ?? "";
  const match = dec.match(/9+$/);
  if (match && match[0].length >= 2) {
    const keep = dec.length - match[0].length;
    const factor = 10 ** keep;
    return Math.round(n * factor) / factor;
  }
  return n;
}

/**
 * Formato decimal: aplica roundNines, hasta 5 decimales, quita ceros finales, mínimo 2 decimales.
 */
export function formatDecimal(value: number | string): string {
  const n = parseFloat(String(value));
  if (Number.isNaN(n)) return "0.00";
  const r = roundNines(n);
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
 * Usa roundToTwo para evitar errores de precisión de punto flotante.
 */
export function formatCostIncIva(cost: number | string, ivaPct: number): string {
  const n = parseFloat(String(cost)) || 0;
  const incIva = costToCostIncIva(n, ivaPct);
  const rounded = roundToTwo(incIva, 2);
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
