"use client";

import { useEffect, useState } from "react";

interface DateFormatterProps {
  dateString?: string;
}

export const DateFormatter = ({ dateString }: DateFormatterProps) => {
  const [localTime, setLocalTime] = useState<string | null>(null);

  useEffect(() => {
    if (!dateString) {
      setLocalTime("-");
      return;
    }

    try {
      // 1. Normalize format: "2026-02-13 02:51" -> "2026-02-13T02:51"
      let normalized = dateString.replace(" ", "T");

      // 2. Force UTC interpretation: append Z if missing
      if (!normalized.endsWith("Z")) {
        normalized += "Z";
      }

      // 3. Create Date object from the UTC string
      const date = new Date(normalized);

      // 4. Convert to Ecuador Time
      const formatter = new Intl.DateTimeFormat("es-EC", {
        timeZone: "America/Guayaquil",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false, // 24h format
      });

      setLocalTime(formatter.format(date));
    } catch (error) {
      console.error("Date formatting error:", error);
      setLocalTime(dateString || "-");
    }
  }, [dateString]);

  // Avoid hydration mismatch by rendering placeholder initially
  if (!localTime) return <span className="text-muted-foreground">...</span>;

  return <span className="whitespace-nowrap">{localTime}</span>;
};
