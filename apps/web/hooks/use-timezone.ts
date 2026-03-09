"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api-client";

const SYSTEM_TIMEZONE_KEY = "SYSTEM_TIMEZONE";
const DEFAULT_TIMEZONE = "America/Guayaquil";

/**
 * Hook que obtiene la zona horaria configurada de la empresa desde system settings.
 * Usar en páginas del dashboard donde companyId está disponible.
 *
 * Ejemplo:
 *   const { timeZone, loading } = useCompanyTimezone(companyId);
 *   <DateFormatter dateString={date} companyId={companyId} />
 */
export function useCompanyTimezone(companyId: string | undefined) {
  const [timeZone, setTimeZone] = useState<string>(DEFAULT_TIMEZONE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) {
      setTimeZone(DEFAULT_TIMEZONE);
      setLoading(false);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    const url = `/system-settings/${SYSTEM_TIMEZONE_KEY}?companyId=${encodeURIComponent(companyId)}`;
    apiGet<{ value?: string }>(url, { signal: controller.signal })
      .then((data) => {
        if (data?.value?.trim()) setTimeZone(data.value.trim());
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [companyId]);

  return { timeZone, loading };
}
