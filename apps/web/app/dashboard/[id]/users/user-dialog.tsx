"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { apiPost, apiPatch } from "@/lib/api-client";

export type UserForDialog = {
  id: string;
  full_name: string;
  email: string;
  role: string;
};

const formSchema = z.object({
  full_name: z.string().min(2, "El nombre es muy corto"),
  email: z.string().email("Correo inválido"),
  password: z.union([
    z.string().min(6, "La contraseña debe tener 6 caracteres o más"),
    z.literal(""),
  ]).optional(),
  role: z.enum(["owner", "admin", "seller"]),
});

type FormValues = z.infer<typeof formSchema>;

type UserLimitInfo = {
  totalCount: number;
  totalLimit: number;
  sellersCount: number;
  sellersLimit: number;
};

type UserDialogProps = {
  companyId: string;
  initialData?: UserForDialog | null;
  limitInfo?: UserLimitInfo;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

const defaultLimitInfo: UserLimitInfo = {
  totalCount: 0,
  totalLimit: -1,
  sellersCount: 0,
  sellersLimit: -1,
};

export function UserDialog({ companyId, initialData = null, limitInfo = defaultLimitInfo, open: controlledOpen, onOpenChange }: UserDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const isControlled = controlledOpen !== undefined && onOpenChange !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? onOpenChange : setInternalOpen;

  const isEditing = Boolean(initialData);

  const { register, handleSubmit, setValue, watch, reset, setError, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
      role: "seller",
    },
  });

  const roleValue = watch("role");

  const totalLimitReached = limitInfo.totalLimit >= 0 && limitInfo.totalCount >= limitInfo.totalLimit;
  const sellersLimitReached = limitInfo.sellersLimit >= 0 && limitInfo.sellersCount >= limitInfo.sellersLimit;
  const isVendedorRole = roleValue === "seller" || String(roleValue || "").toLowerCase().includes("vendedor");
  const createDisabledBySellers = !totalLimitReached && isVendedorRole && sellersLimitReached;

  useEffect(() => {
    if (open && initialData) {
      reset({
        full_name: initialData.full_name ?? "",
        email: initialData.email ?? "",
        password: "",
        role: (initialData.role as "owner" | "admin" | "seller") || "seller",
      });
    } else if (open && !initialData) {
      reset({
        full_name: "",
        email: "",
        password: "",
        role: "seller",
      });
    }
  }, [open, initialData, reset]);

  async function onSubmit(values: FormValues) {
    const pwd = values.password !== undefined ? String(values.password).trim() : "";
    if (!initialData && pwd.length < 6) {
      setError("password", { message: "La contraseña debe tener 6 caracteres o más" });
      return;
    }
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        full_name: values.full_name.trim(),
        email: values.email.trim(),
        role: values.role,
      };
      if (initialData) {
        if (pwd !== "") payload.password = pwd;
      } else {
        payload.password = pwd;
      }

      if (initialData) {
        await apiPatch(`/users/company/${companyId}/user/${initialData.id}`, payload);
      } else {
        await apiPost(`/users/company/${companyId}`, payload);
      }

      setOpen(false);
      reset();
      router.refresh();
      toast({
        title: "Éxito",
        description: initialData ? "Usuario actualizado correctamente." : "Usuario creado correctamente.",
        variant: "default",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al guardar el usuario.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  const dialogContent = (
    <>
      <DialogHeader>
        <DialogTitle>{isEditing ? "Editar Usuario" : "Agregar Miembro"}</DialogTitle>
        <DialogDescription>
          {isEditing
            ? "Modifica los datos del usuario."
            : "Crea una cuenta para un empleado. Podrá acceder inmediatamente."}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Nombre Completo</Label>
          <Input id="name" placeholder="Ej: Ana López" {...register("full_name")} />
          {errors.full_name && (
            <p className="text-red-500 text-xs">{errors.full_name.message}</p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="email">Correo Electrónico</Label>
          <Input id="email" placeholder="ana@empresa.com" {...register("email")} />
          {errors.email && (
            <p className="text-red-500 text-xs">{errors.email.message}</p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="password">
            {isEditing ? "Nueva contraseña (dejar vacío para no cambiar)" : "Contraseña Temporal"}
          </Label>
          <Input id="password" type="password" placeholder="******" {...register("password")} />
          {errors.password && (
            <p className="text-red-500 text-xs">{errors.password.message}</p>
          )}
        </div>

        <div className="grid gap-2">
          <Label>Rol / Permisos</Label>
          <Select
            value={roleValue}
            onValueChange={(val: "owner" | "admin" | "seller") => setValue("role", val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un rol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="seller">🛒 Vendedor (Solo Ventas)</SelectItem>
              <SelectItem value="admin">💼 Admin (Gestión)</SelectItem>
              <SelectItem value="owner">👑 Dueño (Total)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button
            type="submit"
            disabled={loading || (!isEditing && createDisabledBySellers)}
            title={!isEditing && createDisabledBySellers ? "Límite de vendedores alcanzado. Selecciona otro rol." : undefined}
          >
            {loading ? "Guardando..." : isEditing ? "Actualizar" : "Crear Usuario"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button className="bg-slate-900 hover:bg-slate-800 shadow-md">
            + Nuevo Usuario
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]">
        {dialogContent}
      </DialogContent>
    </Dialog>
  );
}
