"use client";

import React, { cloneElement, isValidElement, useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

type DashboardShellProps = {
  sidebar: React.ReactNode;
  children: React.ReactNode;
};

export function DashboardShell({ sidebar, children }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarWithClass = isValidElement(sidebar)
    ? cloneElement(sidebar as React.ReactElement<{ className?: string }>, {
        className: cn(
          (sidebar as React.ReactElement<{ className?: string }>).props.className,
          mobileOpen && "translate-x-0"
        ),
      })
    : sidebar;

  return (
    <div className="flex min-h-screen bg-acont-bg font-sans">
      {/* Hamburger: visible only on mobile */}
      <button
        type="button"
        onClick={() => setMobileOpen((o) => !o)}
        className="fixed top-4 left-4 z-[60] flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white shadow-lg md:hidden"
        aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Overlay when sidebar open on mobile */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Cerrar"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {sidebarWithClass}

      <main className="flex-1 md:ml-64 min-h-screen transition-all pt-14 md:pt-8 p-4 md:p-8 bg-acont-bg">
        {children}
      </main>
    </div>
  );
}
