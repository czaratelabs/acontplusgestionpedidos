"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export const CONSUMIDOR_FINAL_TAX_ID = "9999999999999";

export const DOCUMENT_TYPES = [
  "CEDULA",
  "RUC",
  "PASSPORT",
  "CONSUMIDOR_FINAL",
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

/** Consumidor Final solo disponible para Clientes (oculto en Proveedores). */
export const DOCUMENT_TYPES_FOR_CLIENT = DOCUMENT_TYPES;
export const DOCUMENT_TYPES_FOR_SUPPLIER = DOCUMENT_TYPES.filter(
  (d) => d !== "CONSUMIDOR_FINAL"
);

export const SRI_PERSON_TYPES = [
  { value: "01", label: "Persona natural (01)" },
  { value: "02", label: "Sociedad (02)" },
] as const;
export type SriPersonType = (typeof SRI_PERSON_TYPES)[number]["value"];

const formSchema = z
  .object({
    documentType: z.enum(DOCUMENT_TYPES),
    sriPersonType: z.enum(["01", "02"]).optional(),
    name: z.string().min(1, "El nombre es obligatorio"),
    tradeName: z.string().optional(),
    taxId: z.string().min(1, "Número de identificación es obligatorio"),
    email: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const isConsumidorFinal = data.documentType === "CONSUMIDOR_FINAL";
    if (isConsumidorFinal) {
      if ((data.taxId ?? "").trim() !== CONSUMIDOR_FINAL_TAX_ID) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Consumidor Final debe usar el RUC 9999999999999",
          path: ["taxId"],
        });
      }
      return;
    }
    if (data.email && data.email.trim() !== "") {
      const ok = z.string().email().safeParse(data.email).success;
      if (!ok) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Correo inválido",
          path: ["email"],
        });
      }
    }
    const t = (data.taxId ?? "").trim();
    if (!t) return;
    switch (data.documentType) {
      case "CEDULA":
        if (!/^\d{10}$/.test(t)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "La cédula debe tener exactamente 10 dígitos",
            path: ["taxId"],
          });
        }
        break;
      case "RUC":
        if (!/^\d{10}$/.test(t)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "El RUC debe tener 10 dígitos (el sistema agrega 001)",
            path: ["taxId"],
          });
        }
        break;
      case "PASSPORT":
        if (!/^[A-Za-z0-9]+$/.test(t) || t.length > 20) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "El pasaporte debe ser alfanumérico (máx. 20 caracteres)",
            path: ["taxId"],
          });
        }
        break;
    }
  });

type FormValues = z.infer<typeof formSchema>;

export type ContactForDialog = {
  id: string;
  name: string;
  tradeName: string | null;
  documentType?: DocumentType;
  sriPersonType?: string;
  taxId: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  isClient: boolean;
  isSupplier: boolean;
};

type ContactType = "client" | "supplier";

type ContactDialogProps = {
  companyId: string;
  type: ContactType;
  initialData?: ContactForDialog | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
};

export function ContactDialog({
  companyId,
  type,
  initialData = null,
  open: controlledOpen,
  onOpenChange,
  onSuccess,
}: ContactDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [consumidorFinalAlreadyExists, setConsumidorFinalAlreadyExists] =
    useState(false);
  const [resolvedContact, setResolvedContact] = useState<ContactForDialog | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const isControlled = controlledOpen !== undefined && onOpenChange !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? onOpenChange! : setInternalOpen;

  const isEditing = Boolean(initialData);
  const taxIdInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      documentType: "RUC",
      sriPersonType: "01",
      name: "",
      tradeName: "",
      taxId: "",
      email: "",
      phone: "",
      address: "",
    },
  });

  const documentType = watch("documentType");
  const { ref: taxIdRefRHF, ...taxIdRegisterRest } = register("taxId");

  const documentTypesOptions =
    type === "client" ? DOCUMENT_TYPES_FOR_CLIENT : DOCUMENT_TYPES_FOR_SUPPLIER;

  useEffect(() => {
    if (open && initialData) {
      setResolvedContact(null);
      setConsumidorFinalAlreadyExists(false);
      reset({
        documentType: (initialData.documentType as DocumentType) ?? "RUC",
        sriPersonType: initialData.sriPersonType ?? "01",
        name: initialData.name ?? "",
        tradeName: initialData.tradeName ?? "",
        taxId: initialData.taxId ?? "",
        email: initialData.email ?? "",
        phone: initialData.phone ?? "",
        address: initialData.address ?? "",
      });
    } else if (open && !initialData) {
      setResolvedContact(null);
      setConsumidorFinalAlreadyExists(false);
      reset({
        documentType: "RUC",
        sriPersonType: "01",
        name: "",
        tradeName: "",
        taxId: "",
        email: "",
        phone: "",
        address: "",
      });
    }
  }, [open, initialData, reset, type]);

  // Consumidor Final (solo clientes): auto-fill, lock; verificar si ya existe en BD
  useEffect(() => {
    if (!open) return;
    if (documentType === "CONSUMIDOR_FINAL" && type === "client") {
      setValue("taxId", CONSUMIDOR_FINAL_TAX_ID, { shouldValidate: true });
      setValue("name", "CONSUMIDOR FINAL", { shouldValidate: true });
      setValue("address", "S/N", { shouldValidate: true });
      setValue("tradeName", "", { shouldValidate: true });
      setValue("email", "", { shouldValidate: true });
      setValue("phone", "", { shouldValidate: true });
    } else {
      const currentTaxId = getValues("taxId");
      const currentName = getValues("name");
      const currentAddress = getValues("address");
      if (
        currentTaxId === CONSUMIDOR_FINAL_TAX_ID ||
        currentName === "CONSUMIDOR FINAL" ||
        currentAddress === "S/N"
      ) {
        setValue("taxId", "");
        setValue("name", "");
        setValue("address", "");
        setValue("tradeName", "");
        setValue("email", "");
        setValue("phone", "");
      }
    }
  }, [documentType, open, setValue, getValues, type]);

  // Al cambiar de RUC a CEDULA: quitar sufijo 001 para dejar 10 dígitos
  useEffect(() => {
    if (!open || documentType !== "CEDULA") return;
    const taxId = getValues("taxId")?.trim();
    if (/^\d{13}$/.test(taxId) && taxId.endsWith("001")) {
      setValue("taxId", taxId.slice(0, 10), { shouldValidate: true });
    }
  }, [documentType, open, getValues, setValue]);

  // Si es Consumidor Final (cliente), comprobar si ya existe en BD para bloquear Guardar
  useEffect(() => {
    if (
      !open ||
      type !== "client" ||
      documentType !== "CONSUMIDOR_FINAL" ||
      initialData
    ) {
      setConsumidorFinalAlreadyExists(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${API_BASE}/contacts/company/${companyId}/lookup?taxId=${encodeURIComponent(CONSUMIDOR_FINAL_TAX_ID)}`,
          { credentials: "include" }
        );
        if (cancelled) return;
        setConsumidorFinalAlreadyExists(res.ok);
      } catch {
        if (!cancelled) setConsumidorFinalAlreadyExists(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, companyId, type, documentType, initialData]);

  const isConsumidorFinalLocked = documentType === "CONSUMIDOR_FINAL";

  const handleTaxIdInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      if (documentType === "CEDULA" || documentType === "RUC") {
        e.target.value = v.replace(/\D/g, "").slice(0, 10);
      } else if (documentType === "PASSPORT") {
        e.target.value = v.replace(/[^A-Za-z0-9]/g, "").slice(0, 20);
      }
      taxIdRegisterRest.onChange?.(e);
    },
    [documentType, taxIdRegisterRest]
  );

  const handleTaxIdBlurLocal = useCallback(() => {
    // RUC: ya no añadimos 001 en blur; solo 10 dígitos en pantalla, el backend añade 001 al guardar
  }, []);

  const handleTaxIdBlur = useCallback(async () => {
    if (isEditing || resolvedContact || documentType === "CONSUMIDOR_FINAL")
      return;
    const taxId = getValues("taxId")?.trim();
    if (!taxId || taxId.length < 10) return;
    setLookupLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/contacts/company/${companyId}/lookup?taxId=${encodeURIComponent(taxId)}`,
        { credentials: "include" }
      );
      if (res.ok) {
        const contact = (await res.json()) as ContactForDialog;
        setResolvedContact(contact);
        setValue("documentType", (contact.documentType as DocumentType) ?? "RUC");
        setValue("name", contact.name ?? "");
        setValue("tradeName", contact.tradeName ?? "");
        setValue("taxId", contact.taxId ?? "");
        setValue("email", contact.email ?? "");
        setValue("phone", contact.phone ?? "");
        setValue("address", contact.address ?? "");
        toast({
          title: "Contacto encontrado",
          description: `${contact.name ?? "Contacto"}. Se han cargado sus datos. Puedes añadir el rol actual (${type === "client" ? "Cliente" : "Proveedor"}) y guardar.`,
          variant: "default",
        });
      }
    } catch {
      // 404 or network: leave form as is
    } finally {
      setLookupLoading(false);
    }
  }, [
    companyId,
    documentType,
    getValues,
    isEditing,
    resolvedContact,
    setValue,
    toast,
    type,
  ]);

  // Focus RUC/CI field when opening "New" dialog (first interaction point for autocomplete)
  useEffect(() => {
    if (open && !initialData && taxIdInputRef.current) {
      const t = setTimeout(() => taxIdInputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [open, initialData]);

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      let taxId = values.taxId.trim();
      if (values.documentType === "RUC" && /^\d{10}$/.test(taxId)) {
        taxId = taxId + "001";
      }
      const payload = {
        documentType: values.documentType,
        sriPersonType: values.sriPersonType ?? "01",
        name: values.name.trim(),
        tradeName: values.tradeName?.trim() || undefined,
        taxId,
        email: values.email?.trim() || undefined,
        phone: values.phone?.trim() || undefined,
        address: values.address?.trim() || undefined,
        isClient: type === "client",
        isSupplier: type === "supplier",
      };

      const effectiveId = initialData?.id ?? resolvedContact?.id;
      const url = effectiveId
        ? `${API_BASE}/contacts/${effectiveId}`
        : `${API_BASE}/contacts/company/${companyId}`;
      const method = effectiveId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Error al guardar");
      }

      setOpen(false);
      setResolvedContact(null);
      reset();
      router.refresh();
      onSuccess?.();
      const wasFusion = !initialData && resolvedContact;
      toast({
        title: "Éxito",
        description: initialData
          ? "Contacto actualizado."
          : wasFusion
            ? "Contacto actualizado (rol añadido)."
            : "Contacto creado.",
        variant: "default",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al guardar.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  const title =
    type === "client"
      ? isEditing
        ? "Editar Cliente"
        : "Nuevo Cliente"
      : isEditing
        ? "Editar Proveedor"
        : "Nuevo Proveedor";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los datos del contacto."
              : "Completa los datos del contacto."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          {/* 1. Document Type — first field */}
          <div className="grid gap-2">
            <Label htmlFor="documentType" className="font-medium text-slate-900">
              Tipo de documento *
            </Label>
            <Select
              value={documentTypesOptions.includes(documentType) ? documentType : "RUC"}
              onValueChange={(v) => setValue("documentType", v as DocumentType)}
            >
              <SelectTrigger id="documentType">
                <SelectValue placeholder="Seleccione tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CEDULA">Cédula</SelectItem>
                <SelectItem value="RUC">RUC</SelectItem>
                <SelectItem value="PASSPORT">Pasaporte</SelectItem>
                {type === "client" && (
                  <SelectItem value="CONSUMIDOR_FINAL">Consumidor Final</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Tipo de persona SRI (01 = Persona natural, 02 = Sociedad) */}
          <div className="grid gap-2">
            <Label htmlFor="sriPersonType" className="font-medium text-slate-900">
              Tipo de persona SRI
            </Label>
            <Select
              value={watch("sriPersonType") ?? "01"}
              onValueChange={(v) => setValue("sriPersonType", v as SriPersonType)}
            >
              <SelectTrigger id="sriPersonType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SRI_PERSON_TYPES.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 2. Tax ID / Identification Number */}
          <div className="grid gap-2">
            <Label htmlFor="taxId" className="font-medium text-slate-900">
              Número de identificación *
            </Label>
            <div className="relative">
              <Input
                id="taxId"
                ref={(el) => {
                  taxIdRefRHF(el);
                  taxIdInputRef.current = el;
                }}
                placeholder={
                  documentType === "CEDULA" || documentType === "RUC"
                    ? "10 dígitos (RUC: se añade 001 al guardar)"
                    : "Alfanumérico, máx. 20"
                }
                className="font-mono pr-9"
                inputMode={documentType === "PASSPORT" ? "text" : "numeric"}
                maxLength={
                  documentType === "CEDULA" || documentType === "RUC" ? 10 : 20
                }
                aria-describedby={errors.taxId ? "taxId-error" : undefined}
                disabled={!!resolvedContact || isConsumidorFinalLocked}
                readOnly={isConsumidorFinalLocked}
                onBlur={(e) => {
                  handleTaxIdBlurLocal();
                  taxIdRegisterRest.onBlur?.(e);
                  handleTaxIdBlur();
                }}
                onChange={(e) => {
                  handleTaxIdInput(e);
                  taxIdRegisterRest.onChange?.(e);
                }}
                {...(() => {
                  const { onBlur: _b, onChange: _oc, ...rest } = taxIdRegisterRest;
                  return rest;
                })()}
              />
              {lookupLoading && (
                <span
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  aria-hidden
                >
                  <Loader2 className="h-4 w-4 animate-spin" />
                </span>
              )}
            </div>
            {errors.taxId && (
              <p id="taxId-error" className="text-red-500 text-xs">
                {errors.taxId.message}
              </p>
            )}
          </div>

          {/* 2. Name (Razón Social) */}
          <div className="grid gap-2">
            <Label htmlFor="name">Razón social *</Label>
            <Input
              id="name"
              placeholder="Ej: Empresa S.A."
              disabled={isConsumidorFinalLocked}
              readOnly={isConsumidorFinalLocked}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-red-500 text-xs">{errors.name.message}</p>
            )}
          </div>

          {/* 3. Trade Name (optional) */}
          <div className="grid gap-2">
            <Label htmlFor="tradeName">Nombre comercial (opcional)</Label>
            <Input
              id="tradeName"
              placeholder="Opcional"
              disabled={isConsumidorFinalLocked}
              readOnly={isConsumidorFinalLocked}
              {...register("tradeName")}
            />
          </div>

          {/* 4. Email & Phone */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="contacto@empresa.com"
                disabled={isConsumidorFinalLocked}
                readOnly={isConsumidorFinalLocked}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-red-500 text-xs">{errors.email.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                placeholder="Opcional"
                disabled={isConsumidorFinalLocked}
                readOnly={isConsumidorFinalLocked}
                {...register("phone")}
              />
            </div>
          </div>

          {/* 5. Address */}
          <div className="grid gap-2">
            <Label htmlFor="address">Dirección</Label>
            <Input
              id="address"
              placeholder="Opcional"
              disabled={isConsumidorFinalLocked}
              readOnly={isConsumidorFinalLocked}
              {...register("address")}
            />
          </div>

          {consumidorFinalAlreadyExists && (
            <p className="text-amber-600 text-sm bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              Este cliente (Consumidor Final) ya está registrado. No es posible guardar de nuevo.
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || consumidorFinalAlreadyExists}
            >
              {loading
                ? "Guardando…"
                : consumidorFinalAlreadyExists
                  ? "Ya registrado"
                  : initialData
                    ? "Actualizar"
                    : resolvedContact
                      ? "Actualizar (añadir rol)"
                      : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
