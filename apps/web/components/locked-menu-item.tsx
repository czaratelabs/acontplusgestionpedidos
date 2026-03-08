"use client";

import { useState } from "react";
import { Scale, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type Plan = { name: string };

type LockedMenuItemProps = {
  label: string;
  plansWithModule: Plan[];
  moduleName?: string;
  icon?: React.ReactNode;
};

export function LockedMenuItem({
  label,
  plansWithModule,
  moduleName = "este módulo",
  icon,
}: LockedMenuItemProps) {
  const [open, setOpen] = useState(false);
  const planNames = plansWithModule.map((p) => p.name).join(", ");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-3 w-full px-3 py-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg text-sm font-medium transition-all cursor-pointer text-left"
      >
        {icon ?? <Scale className="h-4 w-4" />}
        <span className="flex-1">{label}</span>
        <Lock className="h-3.5 w-3.5 flex-shrink-0 text-amber-400" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-amber-500" />
              No disponible en tu plan actual
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 pt-2 text-left text-sm text-muted-foreground">
                <p>
                  {moduleName === "este módulo"
                    ? `El módulo "${label}" no está incluido en tu plan actual.`
                    : `${moduleName} no está incluido en tu plan actual.`}
                </p>
                {plansWithModule.length > 0 ? (
                  <p>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Puedes activarlo con los siguientes planes:
                    </span>{" "}
                    {planNames}
                  </p>
                ) : (
                  <p>
                    Contacta al administrador para más información sobre planes disponibles.
                  </p>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
