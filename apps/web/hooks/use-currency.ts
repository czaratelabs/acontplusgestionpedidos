"use client";

import { useCallback, useEffect, useState } from "react";
import { formatCurrency as formatCurrencyUtil } from "@/lib/currency";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const SYSTEM_CURRENCY_KEY = "SYSTEM_CURRENCY";

/**
 * Hook that returns a formatter function for the given currency code.
 * Use when you already have the currency (e.g. from settings).
 *
 * Example:
 *   const format = useCurrency("EUR");
 *   format(1234.56); // "1.234,56 €"
 */
export function useCurrency(currencyCode: string = "USD") {
  return useCallback(
    (amount: number, options?: { decimals?: number; locale?: string }) =>
      formatCurrencyUtil(amount, currencyCode, options),
    [currencyCode]
  );
}

/**
 * Hook that fetches the company's currency from system settings and returns
 * a formatter. Use in dashboard pages where companyId is available.
 *
 * Example:
 *   const { format, currencyCode, loading } = useCompanyCurrency(companyId);
 *   format(1234.56); // Uses company's configured currency
 */
export function useCompanyCurrency(companyId: string | undefined) {
  const [currencyCode, setCurrencyCode] = useState<string>("USD");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const url = `${API_BASE}/system-settings/${SYSTEM_CURRENCY_KEY}?companyId=${encodeURIComponent(companyId)}`;
    const controller = new AbortController();
    fetch(url, { credentials: "include", signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { value?: string } | null) => {
        if (data?.value) setCurrencyCode(data.value);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [companyId]);

  const format = useCallback(
    (amount: number, options?: { decimals?: number; locale?: string }) =>
      formatCurrencyUtil(amount, currencyCode, options),
    [currencyCode]
  );

  return { format, currencyCode, loading };
}
