"use client";

import { useDateFormat } from "@/hooks/use-date-format";

interface DateFormatterProps {
  /** Fecha a mostrar (string ISO o Date) */
  dateString?: string | null;
  /** Zona horaria IANA. Se ignora si companyId está presente (se usa la de la empresa). */
  timeZone?: string;
  /** ID de la empresa para usar formato y zona de system settings. Recomendado en dashboard. */
  companyId?: string;
  /** Si true, muestra hora además de fecha (por defecto true para compatibilidad) */
  includeTime?: boolean;
}

/**
 * Formatea una fecha según la configuración de la empresa (formato + zona horaria).
 * Con companyId usa SYSTEM_DATE_FORMAT y SYSTEM_TIMEZONE. Sin companyId usa DD/MM/YYYY y timeZone o default.
 */
export const DateFormatter = ({
  dateString,
  companyId,
  includeTime = true,
}: DateFormatterProps) => {
  const { formatDate, loading } = useDateFormat(companyId ?? undefined);
  const formatted = formatDate(dateString ?? null, includeTime);

  if (loading && !dateString) {
    return <span className="text-muted-foreground">...</span>;
  }
  return <span className="whitespace-nowrap">{formatted}</span>;
}
