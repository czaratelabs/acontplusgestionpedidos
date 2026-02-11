"use client";

import { toast as sonnerToast } from "sonner";

export type ToastVariant = "default" | "destructive";

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
}

export function useToast() {
  return {
    toast: ({ title, description, variant = "default" }: ToastOptions) => {
      if (variant === "destructive") {
        sonnerToast.error(title, { description });
      } else {
        sonnerToast.success(title, { description });
      }
    },
  };
}
