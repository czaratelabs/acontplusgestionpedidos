"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";
import { useCompanyTimezone } from "./use-timezone";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const SYSTEM_DATE_FORMAT_KEY = "SYSTEM_DATE_FORMAT";
const DEFAULT_DATE_FORMAT = "DD/MM/YYYY";

/** Config keys to date-fns format patterns (with Spanish locale for MMM) */
const FORMAT_MAP: Record<string, string> = {
  "DD/MM/YYYY": "dd/MM/yyyy",
  "YYYY-MM-DD": "yyyy-MM-dd",
  "MM/DD/YYYY": "MM/dd/yyyy",
  "DD de MMM, YYYY": "dd 'de' MMM, yyyy",
};

function parseDate(input: Date | string | null): Date | null {
  if (input == null) return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
  const s = String(input).trim();
  if (!s) return null;
  let normalized = s.replace(" ", "T");
  if (!/Z|[+-]\d{2}:?\d{2}$/.test(normalized)) {
    normalized += "Z";
  }
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
}

export type UseDateFormatResult = {
  formatDate: (date: Date | string | null, includeTime?: boolean) => string;
  dateFormat: string;
  timeZone: string;
  loading: boolean;
};

/**
 * Hook que obtiene el formato de fecha y zona horaria de la empresa,
 * y retorna una función formatDate para formatear fechas según la configuración.
 *
 * Ejemplo:
 *   const { formatDate } = useDateFormat(companyId);
 *   formatDate(row.created_at)  // "2024-02-20" o "20/02/2024" según config
 *   formatDate(row.created_at, true)  // incluye hora en zona configurada
 */
export function useDateFormat(companyId: string | undefined): UseDateFormatResult {
  const { timeZone, loading: tzLoading } = useCompanyTimezone(companyId);
  const [dateFormat, setDateFormat] = useState<string>(DEFAULT_DATE_FORMAT);
  const [loadingFormat, setLoadingFormat] = useState(true);

  useEffect(() => {
    if (!companyId) {
      setDateFormat(DEFAULT_DATE_FORMAT);
      setLoadingFormat(false);
      return;
    }
    setLoadingFormat(true);
    const url = `${API_BASE}/system-settings/${SYSTEM_DATE_FORMAT_KEY}?companyId=${encodeURIComponent(companyId)}`;
    const controller = new AbortController();
    fetch(url, { credentials: "include", signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { value?: string } | null) => {
        const v = data?.value?.trim();
        if (v && FORMAT_MAP[v]) setDateFormat(v);
      })
      .catch(() => {})
      .finally(() => setLoadingFormat(false));
    return () => controller.abort();
  }, [companyId]);

  const formatDate = useCallback(
    (date: Date | string | null, includeTime = false): string => {
      const parsed = parseDate(date);
      if (!parsed) return "-";

      const pattern = FORMAT_MAP[dateFormat] ?? FORMAT_MAP[DEFAULT_DATE_FORMAT];
      const locale = dateFormat === "DD de MMM, YYYY" ? es : undefined;

      try {
        const zoned = toZonedTime(parsed, timeZone);
        if (includeTime) {
          return format(zoned, `${pattern} HH:mm`, { locale });
        }
        return format(zoned, pattern, { locale });
      } catch {
        return format(parsed, pattern, { locale });
      }
    },
    [dateFormat, timeZone]
  );

  return {
    formatDate,
    dateFormat,
    timeZone,
    loading: tzLoading || loadingFormat,
  };
}
