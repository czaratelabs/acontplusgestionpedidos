"use client";

/**
 * Banner de sincronización al abrir pestaña Variantes: muestra datos del General tab (solo lectura).
 * Tokens Acontplus: magenta base, slate fondo.
 */

const MAGENTA = "#D61672";
const SLATE_BG = "bg-slate-100 dark:bg-slate-900/40";

type Props = {
  code: string;
  name: string;
  categoryName?: string;
};

export function VariantsTabBanner({ code, name, categoryName }: Props) {
  const codeDisplay = code?.trim() || "—";
  const nameDisplay = name?.trim() || "—";
  const catDisplay = categoryName?.trim() || "—";
  return (
    <div
      className={`rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 sm:px-4 ${SLATE_BG}`}
      role="status"
      aria-live="polite"
    >
      <p className="text-sm text-slate-700 dark:text-slate-300">
        <span className="font-semibold" style={{ color: MAGENTA }}>
          {codeDisplay}
        </span>
        {" — "}
        <span className="font-medium">{nameDisplay}</span>
        {" "}
        <span className="text-slate-500 dark:text-slate-400">
          ({catDisplay})
        </span>
      </p>
    </div>
  );
}
