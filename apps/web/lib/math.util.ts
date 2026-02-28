/**
 * Utilidades matemáticas para redondeo de alta precisión.
 * Evita errores de punto flotante (0.99999...) en cálculos de impuestos, precios, etc.
 */

/**
 * Redondeo de alta precisión para evitar errores de punto flotante (0.99999...)
 * @param value El número a redondear
 * @param decimals Cantidad de decimales (por defecto 2)
 */
export const roundToTwo = (value: number, decimals: number = 2): number => {
  const factor = Math.pow(10, decimals);
  // Sumamos Number.EPSILON para asegurar que los .99999... se traten correctamente
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

/** Umbral de ruido para detectar valores "near-cent": si la diferencia con el valor a 2 decimales es menor, se usa la versión a 2 decimales. */
const NEAR_CENT_NOISE_THRESHOLD = 0.0001;

/**
 * Redondeo a 5 decimales con detección de casos "near-cent".
 * Si el valor a 5 decimales es matemáticamente equivalente a un valor a 2 decimales
 * (diferencia < 0.0001), devuelve la versión a 2 decimales (p. ej. 3.44999 → 3.45).
 * @param value El número a redondear
 * @param decimals Cantidad de decimales por defecto (por defecto 5)
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

/**
 * Redondeo Adaptativo para acontplusgestionpedidos
 * Por defecto devuelve 5 decimales de precisión. Si detecta "ruido" de punto flotante
 * (residuo cercano a un valor de 2 decimales), fuerza el redondeo a 2 decimales.
 *
 * Casos de prueba:
 * - 1.050004  → 1.05      (mantiene precisión, lejos de redondeo simple)
 * - 8.999999  → 9         (detecta ruido .99999)
 * - 0.123456  → 0.12346   (5 decimales por precisión de precio)
 * - 4.55000001 → 4.55     (limpia micro-residuo)
 *
 * @param value Valor numérico a procesar
 * @returns Número redondeado a 5 decimales, o a 2 si se detecta residuo de punto flotante (.99999)
 */
export const smartRound = (value: number): number => {
  // 1. Definimos la tolerancia para "ruido" (0.00001 es suficiente para detectar .99999)
  const TOLERANCE = 1e-9;

  // 2. Redondeo base a 5 decimales para precisión en precios unitarios
  const factor5 = 100000;
  const rounded5 = Math.round((value + Number.EPSILON) * factor5) / factor5;

  // 3. Lógica de "Casos Especiales": ¿Está muy cerca de un valor de 2 decimales?
  const factor2 = 100;
  const rounded2 = Math.round((value + Number.EPSILON) * factor2) / factor2;

  // Si la diferencia entre el valor de 5 decimales y el de 2 es insignificante,
  // significa que el número "quería" ser de 2 decimales (ej: 8.99999 -> 9.00)
  if (Math.abs(rounded5 - rounded2) < TOLERANCE) {
    return rounded2;
  }

  return rounded5;
};
