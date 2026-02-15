/** Supported currencies with ISO 4217 codes and display info */
export const CURRENCY_OPTIONS: { value: string; label: string; symbol: string }[] = [
  { value: "USD", label: "Dólar Estadounidense ($)", symbol: "$" },
  { value: "EUR", label: "Euro (€)", symbol: "€" },
  { value: "COP", label: "Peso Colombiano ($)", symbol: "$" },
  { value: "PEN", label: "Sol Peruano (S/)", symbol: "S/" },
  { value: "MXN", label: "Peso Mexicano ($)", symbol: "$" },
  { value: "CLP", label: "Peso Chileno ($)", symbol: "$" },
];

/** Valid ISO 4217 currency codes allowed in the system */
export const VALID_CURRENCY_CODES = CURRENCY_OPTIONS.map((c) => c.value);

export function isValidCurrencyCode(code: string): boolean {
  return typeof code === "string" && code.length === 3 && VALID_CURRENCY_CODES.includes(code);
}

/**
 * Format a number as currency using Intl.NumberFormat.
 * - USD: $ 1,000.00
 * - EUR: 1.000,00 € (European style)
 * - COP, CLP, etc.: $ 1.000 (no decimals for Latin American pesos by default)
 */
export function formatCurrency(
  amount: number,
  currencyCode: string = "USD",
  options?: { decimals?: number; locale?: string }
): string {
  const decimals = options?.decimals;
  const locale = options?.locale ?? getLocaleForCurrency(currencyCode);

  const formatOptions: Intl.NumberFormatOptions = {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: decimals !== undefined ? decimals : getDefaultDecimals(currencyCode),
    maximumFractionDigits: decimals !== undefined ? decimals : getDefaultDecimals(currencyCode),
  };

  try {
    return new Intl.NumberFormat(locale, formatOptions).format(amount);
  } catch {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
    }).format(amount);
  }
}

function getLocaleForCurrency(code: string): string {
  switch (code) {
    case "EUR":
      return "de-DE";
    case "COP":
      return "es-CO";
    case "PEN":
      return "es-PE";
    case "MXN":
      return "es-MX";
    case "CLP":
      return "es-CL";
    default:
      return "en-US";
  }
}

function getDefaultDecimals(code: string): number {
  // Latin American pesos typically use 0 decimals
  if (["COP", "CLP"].includes(code)) return 0;
  return 2;
}
