/**
 * Utilidades matemáticas para redondeo de alta precisión.
 * ÚNICA fuente de verdad: roundToFive para todo el módulo de costes y precios.
 */

/** Umbral de ruido para detectar valores "near-cent". */
const NEAR_CENT_NOISE_THRESHOLD = 0.0001;

/**
 * Redondeo estándar: 5 decimales con detección de casos "near-cent".
 * Única función de redondeo para cost, sale price y PVP.
 * @param value El número a redondear
 * @param decimals Cantidad de decimales (por defecto 5)
 */
export const roundToFive = (value: number, decimals: number = 5): number => {
  const factor5 = Math.pow(10, decimals);
  const rounded5 = Math.round((value + Number.EPSILON) * factor5) / factor5;
  const factor2 = 100;
  const rounded2 = Math.round((value + Number.EPSILON) * factor2) / factor2;
  if (Math.abs(rounded5 - rounded2) < NEAR_CENT_NOISE_THRESHOLD) {
    return rounded2;
  }
  return rounded5;
};
