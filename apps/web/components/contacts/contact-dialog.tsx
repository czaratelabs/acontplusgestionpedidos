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

/** SRI document type codes with user-friendly labels. */
export const SRI_DOCUMENT_TYPE_OPTIONS = [
  { value: "C", label: "Cédula" },
  { value: "R", label: "RUC" },
  { value: "P", label: "Pasaporte" },
  { value: "F", label: "Consumidor Final" },
] as const;

export const SRI_DOCUMENT_TYPE_CODES = ["C", "R", "P", "F"] as const;
export type SriDocumentTypeCode = (typeof SRI_DOCUMENT_TYPE_CODES)[number];

/** Proveedores no pueden ser Consumidor Final. */
export const SRI_DOCUMENT_TYPE_OPTIONS_FOR_CLIENT = SRI_DOCUMENT_TYPE_OPTIONS;
export const SRI_DOCUMENT_TYPE_OPTIONS_FOR_SUPPLIER =
  SRI_DOCUMENT_TYPE_OPTIONS.filter((d) => d.value !== "F");

export const SRI_PERSON_TYPE_OPTIONS = [
  { value: "01", label: "Persona Natural" },
  { value: "02", label: "Sociedad" },
] as const;
export type SriPersonType = (typeof SRI_PERSON_TYPE_OPTIONS)[number]["value"];

/** Cargos estándar para empleados (dropdown). */
export const JOB_TITLES = [
  "Gerente",
  "Administrador",
  "Contador",
  "Vendedor",
  "Cajero",
  "Bodeguero",
  "Chofer",
  "Asistente",
  "Soporte Técnico",
  "Otro",
] as const;

type ContactType = "client" | "supplier" | "employee";

function getFormSchema(contactType: ContactType) {
  return z
    .object({
      sriDocumentTypeCode: z.enum(["C", "R", "P", "F"]),
      sriPersonType: z.enum(["01", "02"]),
      name: z.string().min(1, "El nombre es obligatorio"),
      tradeName: z.string().optional(),
      taxId: z.string().min(1, "Número de identificación es obligatorio"),
      email: z.string().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      jobTitle: z.string().optional(),
      salary: z.union([z.string(), z.number()]).optional(),
    })
    .superRefine((data, ctx) => {
      if (contactType === "employee") {
        if (!(data.jobTitle ?? "").trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "El cargo es obligatorio para empleados",
            path: ["jobTitle"],
          });
        }
        const sal = data.salary;
        if (sal !== undefined && sal !== null && sal !== "") {
          const num = typeof sal === "number" ? sal : Number(String(sal).trim());
          if (Number.isNaN(num) || num < 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "El salario debe ser un número positivo",
              path: ["salary"],
            });
          }
        }
      }
      const isConsumidorFinal = data.sriDocumentTypeCode === "F";
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
      switch (data.sriDocumentTypeCode) {
        case "C":
          if (t.length !== 10 || !/^\d{10}$/.test(t)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "La cédula debe tener exactamente 10 dígitos",
              path: ["taxId"],
            });
          }
          break;
        case "R":
          if (t.length !== 10 || !/^\d{10}$/.test(t)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "El RUC debe tener exactamente 10 dígitos (se añade 001 al guardar)",
              path: ["taxId"],
            });
          }
          break;
        case "P":
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
}

type FormValues = z.infer<ReturnType<typeof getFormSchema>>;

export type ContactForDialog = {
  id: string;
  name: string;
  tradeName: string | null;
  sriDocumentTypeCode?: string;
  sriPersonType?: string;
  taxId: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  isClient: boolean;
  isSupplier: boolean;
  isEmployee?: boolean;
  jobTitle?: string | null;
  salary?: string | null;
};

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

  const isEmployee = type === "employee";
  const documentTypeOptions =
    type === "client"
      ? SRI_DOCUMENT_TYPE_OPTIONS_FOR_CLIENT
      : SRI_DOCUMENT_TYPE_OPTIONS_FOR_SUPPLIER;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(getFormSchema(type)),
    defaultValues: {
      sriDocumentTypeCode: "R",
      sriPersonType: "01",
      name: "",
      tradeName: "",
      taxId: "",
      email: "",
      phone: "",
      address: "",
      jobTitle: "",
      salary: "",
    },
  });

  const sriDocumentTypeCode = watch("sriDocumentTypeCode");
  const { ref: taxIdRefRHF, ...taxIdRegisterRest } = register("taxId");

  useEffect(() => {
    if (open && initialData) {
      setResolvedContact(null);
      setConsumidorFinalAlreadyExists(false);
      const docCode = initialData.sriDocumentTypeCode ?? "R";
      const validCode = documentTypeOptions.some((o) => o.value === docCode)
        ? docCode
        : "R";
      const rawTaxId = initialData.taxId ?? "";
      const taxIdForInput =
        validCode === "R" && /^\d{13}$/.test(rawTaxId) && rawTaxId.endsWith("001")
          ? rawTaxId.slice(0, 10)
          : rawTaxId;
      const personType =
        validCode === "C" || isEmployee ? "01" : (initialData.sriPersonType ?? "01");
      reset({
        sriDocumentTypeCode: validCode,
        sriPersonType: personType,
        name: initialData.name ?? "",
        tradeName: initialData.tradeName ?? "",
        taxId: taxIdForInput,
        email: initialData.email ?? "",
        phone: initialData.phone ?? "",
        address: initialData.address ?? "",
        jobTitle: initialData.jobTitle ?? "",
        salary: initialData.salary ?? "",
      });
    } else if (open && !initialData) {
      setResolvedContact(null);
      setConsumidorFinalAlreadyExists(false);
      reset({
        sriDocumentTypeCode: "R",
        sriPersonType: "01",
        name: "",
        tradeName: "",
        taxId: "",
        email: "",
        phone: "",
        address: "",
        jobTitle: "",
        salary: "",
      });
    }
  }, [open, initialData, reset, documentTypeOptions, isEmployee]);

  // Consumidor Final (solo clientes): auto-fill, lock, set sriPersonType to '01'
  useEffect(() => {
    if (!open) return;
    if (sriDocumentTypeCode === "F" && type === "client") {
      setValue("taxId", CONSUMIDOR_FINAL_TAX_ID, { shouldValidate: true });
      setValue("name", "CONSUMIDOR FINAL", { shouldValidate: true });
      setValue("address", "S/N", { shouldValidate: true });
      setValue("tradeName", "", { shouldValidate: true });
      setValue("email", "", { shouldValidate: true });
      setValue("phone", "", { shouldValidate: true });
      setValue("sriPersonType", "01", { shouldValidate: true });
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
  }, [sriDocumentTypeCode, open, setValue, getValues, type]);

  // Al cambiar de RUC a Cédula: quitar sufijo 001 para dejar 10 dígitos
  useEffect(() => {
    if (!open || sriDocumentTypeCode !== "C") return;
    const taxId = getValues("taxId")?.trim();
    if (/^\d{13}$/.test(taxId) && taxId.endsWith("001")) {
      setValue("taxId", taxId.slice(0, 10), { shouldValidate: true });
    }
  }, [sriDocumentTypeCode, open, getValues, setValue]);

  // Regla negocio: Cédula / Empleados → solo Persona Natural; RUC → Persona Natural o Sociedad
  useEffect(() => {
    if (!open) return;
    if (sriDocumentTypeCode === "C" || isEmployee) {
      setValue("sriPersonType", "01", { shouldValidate: true });
    } else if (sriDocumentTypeCode === "R") {
      const current = getValues("sriPersonType");
      if (!current || (current !== "01" && current !== "02")) {
        setValue("sriPersonType", "01", { shouldValidate: true });
      }
    }
  }, [sriDocumentTypeCode, open, setValue, getValues, isEmployee]);

  // Si es Consumidor Final (cliente), comprobar si ya existe en BD
  useEffect(() => {
    if (
      !open ||
      type !== "client" ||
      sriDocumentTypeCode !== "F" ||
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
  }, [open, companyId, type, sriDocumentTypeCode, initialData]);

  const isConsumidorFinalLocked = sriDocumentTypeCode === "F";
  /** Tipo persona bloqueado: Cédula, Consumidor Final y Empleados solo permiten Persona Natural. */
  const isPersonTypeLocked =
    sriDocumentTypeCode === "C" || sriDocumentTypeCode === "F" || isEmployee;

  const handleTaxIdInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      if (sriDocumentTypeCode === "C" || sriDocumentTypeCode === "R") {
        e.target.value = v.replace(/\D/g, "").slice(0, 10);
      } else if (sriDocumentTypeCode === "P") {
        e.target.value = v.replace(/[^A-Za-z0-9]/g, "").slice(0, 20);
      }
      taxIdRegisterRest.onChange?.(e);
    },
    [sriDocumentTypeCode, taxIdRegisterRest]
  );

  const handleTaxIdBlurLocal = useCallback(() => {}, []);

  const handleTaxIdBlur = useCallback(async () => {
    if (isEditing || resolvedContact || sriDocumentTypeCode === "F")
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
        setValue("sriDocumentTypeCode", (contact.sriDocumentTypeCode ?? "R") as SriDocumentTypeCode);
        setValue("sriPersonType", contact.sriPersonType ?? "01");
        setValue("name", contact.name ?? "");
        setValue("tradeName", contact.tradeName ?? "");
        const rawTaxId = contact.taxId ?? "";
        const taxIdForInput =
          (contact.sriDocumentTypeCode ?? "R") === "R" &&
          /^\d{13}$/.test(rawTaxId) &&
          rawTaxId.endsWith("001")
            ? rawTaxId.slice(0, 10)
            : rawTaxId;
        setValue("taxId", taxIdForInput);
        setValue("email", contact.email ?? "");
        setValue("phone", contact.phone ?? "");
        setValue("address", contact.address ?? "");
        if (isEmployee) {
          setValue("jobTitle", (contact as ContactForDialog).jobTitle ?? "");
          setValue("salary", (contact as ContactForDialog).salary ?? "");
        }
        toast({
          title: "Contacto encontrado",
          description: `${contact.name ?? "Contacto"}. Se han cargado sus datos. Puedes añadir el rol actual (${type === "client" ? "Cliente" : type === "supplier" ? "Proveedor" : "Empleado"}) y guardar.`,
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
    sriDocumentTypeCode,
    getValues,
    isEditing,
    resolvedContact,
    setValue,
    toast,
    type,
    isEmployee,
  ]);

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
      if (values.sriDocumentTypeCode === "R" && /^\d{10}$/.test(taxId)) {
        taxId = taxId + "001";
      }
      const payload = {
        sriDocumentTypeCode: values.sriDocumentTypeCode,
        sriPersonType:
          values.sriDocumentTypeCode === "C" || type === "employee"
            ? "01"
            : values.sriPersonType,
        name: values.name.trim(),
        tradeName: isEmployee ? undefined : (values.tradeName?.trim() || undefined),
        taxId,
        email: values.email?.trim() || undefined,
        phone: values.phone?.trim() || undefined,
        address: values.address?.trim() || undefined,
        isClient: type === "client",
        isSupplier: type === "supplier",
        isEmployee: type === "employee",
        ...(isEmployee && {
          jobTitle: values.jobTitle?.trim() || undefined,
          salary: (() => {
            const sal = values.salary;
            if (sal === undefined || sal === null || sal === "") return undefined;
            const num = typeof sal === "number" ? sal : Number(String(sal).trim());
            return Number.isNaN(num) ? undefined : num;
          })(),
        }),
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
      : type === "supplier"
        ? isEditing
          ? "Editar Proveedor"
          : "Nuevo Proveedor"
        : isEditing
          ? "Editar Empleado"
          : "Nuevo Empleado";

  const selectedDocCode = documentTypeOptions.some((o) => o.value === sriDocumentTypeCode)
    ? sriDocumentTypeCode
    : "R";

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

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-0">
          <div className="max-h-[60vh] overflow-y-auto px-1 grid gap-4 py-4">
          {/* 1. Tipo de documento */}
          <div className="grid gap-2">
            <Label htmlFor="sriDocumentTypeCode" className="font-medium text-slate-900">
              Tipo de documento *
            </Label>
            <Select
              value={selectedDocCode}
              onValueChange={(v) => setValue("sriDocumentTypeCode", v as SriDocumentTypeCode)}
            >
              <SelectTrigger id="sriDocumentTypeCode">
                <SelectValue placeholder="Seleccione tipo" />
              </SelectTrigger>
              <SelectContent>
                {documentTypeOptions.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 2. Tipo de persona (antes del RUC/CI) */}
          <div className="grid gap-2">
            <Label htmlFor="sriPersonType" className="font-medium text-slate-900">
              Tipo de persona *
            </Label>
            <Select
              value={watch("sriPersonType") ?? "01"}
              onValueChange={(v) => setValue("sriPersonType", v as SriPersonType)}
              disabled={isPersonTypeLocked}
            >
              <SelectTrigger id="sriPersonType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SRI_PERSON_TYPE_OPTIONS.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {sriDocumentTypeCode === "C" && (
              <p className="text-xs text-slate-500" role="status">
                Con Cédula solo se permite Persona Natural.
              </p>
            )}
            {isEmployee && (
              <p className="text-xs text-slate-500" role="status">
                Los empleados se registran como Persona Natural.
              </p>
            )}
          </div>

          {/* 3. Número de identificación */}
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
                  sriDocumentTypeCode === "C" || sriDocumentTypeCode === "R"
                    ? "Solo 10 dígitos (RUC: se añade 001 al guardar)"
                    : "Alfanumérico, máx. 20"
                }
                className="font-mono pr-9"
                inputMode={sriDocumentTypeCode === "P" ? "text" : "numeric"}
                maxLength={
                  sriDocumentTypeCode === "F"
                    ? 13
                    : sriDocumentTypeCode === "C" || sriDocumentTypeCode === "R"
                      ? 10
                      : 20
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

          {/* 4. Razón social / Nombre */}
          <div className="grid gap-2">
            <Label htmlFor="name">{isEmployee ? "Nombre completo *" : "Razón social *"}</Label>
            <Input
              id="name"
              placeholder={isEmployee ? "Ej: Juan Pérez" : "Ej: Empresa S.A."}
              disabled={isConsumidorFinalLocked}
              readOnly={isConsumidorFinalLocked}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-red-500 text-xs">{errors.name.message}</p>
            )}
          </div>

          {/* 5. Nombre comercial (oculto para empleados) */}
          {!isEmployee && (
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
          )}

          {/* 5b. Cargo y Salario (solo empleados) */}
          {isEmployee && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="jobTitle">Cargo *</Label>
                <Select
                  value={
                    (() => {
                      const v = watch("jobTitle") ?? "";
                      return v && JOB_TITLES.includes(v as (typeof JOB_TITLES)[number])
                        ? v
                        : undefined;
                    })()
                  }
                  onValueChange={(v) => setValue("jobTitle", v, { shouldValidate: true })}
                >
                  <SelectTrigger id="jobTitle">
                    <SelectValue placeholder="Seleccione cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    {JOB_TITLES.map((title) => (
                      <SelectItem key={title} value={title}>
                        {title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.jobTitle && (
                  <p className="text-red-500 text-xs">{errors.jobTitle.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="salary">Salario (opcional)</Label>
                <Input
                  id="salary"
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0.00"
                  {...register("salary")}
                />
                {errors.salary && (
                  <p className="text-red-500 text-xs">{errors.salary.message}</p>
                )}
              </div>
            </>
          )}

          {/* 6. Email & Teléfono */}
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

          {/* 7. Dirección */}
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
          </div>

          <DialogFooter className="pt-4 pb-0">
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
