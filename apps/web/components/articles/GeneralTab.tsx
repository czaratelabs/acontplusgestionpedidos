"use client";

/**
 * Contenedor del tab General: grid responsive 1 col móvil, hasta 3/4 cols desktop.
 * El contenido pesado sigue en article-form-dialog; este componente encapsula layout + tokens.
 */

const MAGENTA = "#D61672";

type GeneralTabProps = {
  children: React.ReactNode;
  className?: string;
};

export function GeneralTab({ children, className = "" }: GeneralTabProps) {
  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ${className}`}
      style={{ ["--accent" as string]: MAGENTA }}
    >
      {children}
    </div>
  );
}
