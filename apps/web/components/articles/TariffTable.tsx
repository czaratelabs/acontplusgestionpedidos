"use client";

/**
 * Contenedor semántico para la tabla Tarifas PVP.
 * La tabla completa permanece en article-form-dialog/Variants hasta migración total;
 * usar como wrapper para slots o futura extracción con usePriceCalculation.
 */

const AMBER = "#FFA901";

type TariffTableProps = {
  title?: string;
  children: React.ReactNode;
  className?: string;
};

export function TariffTable({
  title = "Tarifas PVP",
  children,
  className = "",
}: TariffTableProps) {
  return (
    <section
      className={`rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden ${className}`}
      aria-label={title}
    >
      {title && (
        <header
          className="px-3 py-2 text-sm font-semibold bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700"
          style={{ color: AMBER }}
        >
          {title}
        </header>
      )}
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}
