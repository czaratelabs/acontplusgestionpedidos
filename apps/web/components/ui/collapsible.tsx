"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CollapsibleContext = React.createContext<CollapsibleContextValue | null>(null);

const Collapsible = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
  }
>(({ open: controlledOpen, defaultOpen = false, onOpenChange, className, children, ...props }, ref) => {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const handleOpenChange = React.useCallback(
    (v: boolean) => {
      if (controlledOpen === undefined) setInternalOpen(v);
      onOpenChange?.(v);
    },
    [controlledOpen, onOpenChange]
  );
  return (
    <CollapsibleContext.Provider value={{ open, onOpenChange: handleOpenChange }}>
      <div ref={ref} data-state={open ? "open" : "closed"} className={cn("", className)} {...props}>
        {children}
      </div>
    </CollapsibleContext.Provider>
  );
});
Collapsible.displayName = "Collapsible";

const CollapsibleTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ className, children, onClick, asChild = false, ...props }, ref) => {
  const ctx = React.useContext(CollapsibleContext);
  if (!ctx) throw new Error("CollapsibleTrigger must be used within Collapsible");
  const { open, onOpenChange } = ctx;
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onOpenChange(!open);
    onClick?.(e);
  };
  const Comp = asChild ? Slot : "button";
  const content = asChild ? (
    children
  ) : (
    <>
      {children}
      <ChevronDown
        className={cn("h-4 w-4 shrink-0 transition-transform duration-200", open && "rotate-180")}
      />
    </>
  );
  return (
    <Comp
      ref={ref}
      type="button"
      data-state={open ? "open" : "closed"}
      onClick={handleClick}
      className={cn("flex items-center justify-between w-full", className)}
      {...props}
    >
      {content}
    </Comp>
  );
});
CollapsibleTrigger.displayName = "CollapsibleTrigger";

const CollapsibleContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const ctx = React.useContext(CollapsibleContext);
  if (!ctx) throw new Error("CollapsibleContent must be used within Collapsible");
  const { open } = ctx;
  if (!open) return null;
  return (
    <div ref={ref} data-state={open ? "open" : "closed"} className={cn("", className)} {...props}>
      {children}
    </div>
  );
});
CollapsibleContent.displayName = "CollapsibleContent";

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
