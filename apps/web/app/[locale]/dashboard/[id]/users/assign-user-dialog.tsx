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
} from "@/components/ui/dialog";
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

const formSchema = z.object({
  userId: z.string().min(1, "Selecciona un usuario"),
  role: z.string().min(1, "Selecciona un rol"),
});

type FormValues = z.infer<typeof formSchema>;

type AvailableUser = {
  id: string;
  full_name: string;
  email: string;
};

type Role = {
  id: string;
  name: string;
  description: string | null;
};

type AssignUserDialogProps = {
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function AssignUserDialog({
  companyId,
  open,
  onOpenChange,
  onSuccess,
}: AssignUserDialogProps) {
  const [loading, setLoading] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const {
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userId: "",
      role: "",
    },
  });

  const userIdValue = watch("userId");
  const roleValue = watch("role");

  useEffect(() => {
    if (open) {
      setLoadingData(true);
      Promise.all([
        fetch(`${API_BASE}/users/available-for-company/${companyId}`, {
          credentials: "include",
        }).then((r) => (r.ok ? r.json() : [])),
        fetch(`${API_BASE}/roles?companyId=${companyId}`, {
          credentials: "include",
        }).then((r) => (r.ok ? r.json() : [])),
      ])
        .then(([users, rolesData]) => {
          setAvailableUsers(Array.isArray(users) ? users : []);
          setRoles(Array.isArray(rolesData) ? rolesData : []);
          reset({
            userId: "",
            role: rolesData?.[0]?.name ?? "seller",
          });
        })
        .catch(() => {
          setAvailableUsers([]);
          setRoles([]);
        })
        .finally(() => setLoadingData(false));
    }
  }, [open, companyId, reset]);

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/users/company/${companyId}/assign`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: values.userId,
            role: values.role,
          }),
          credentials: "include",
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Error al asignar");
      }

      onOpenChange(false);
      reset();
      router.refresh();
      onSuccess?.();
      toast({
        title: "Éxito",
        description: "Usuario asignado a la empresa correctamente.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Error al asignar usuario.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Asignar usuario existente</DialogTitle>
          <DialogDescription>
            Selecciona un usuario que ya tenga cuenta en el sistema y asígnalo a
            esta empresa con un rol.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Usuario</Label>
            <Select
              value={userIdValue}
              onValueChange={(val) => setValue("userId", val)}
              disabled={loadingData}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un usuario" />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.length === 0 && !loadingData ? (
                  <div className="px-2 py-4 text-center text-sm text-slate-500">
                    No hay usuarios disponibles para asignar (todos ya están en
                    esta empresa).
                  </div>
                ) : (
                  availableUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name} ({u.email})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.userId && (
              <p className="text-red-500 text-xs">{errors.userId.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label>Rol</Label>
            <Select
              value={roleValue}
              onValueChange={(val) => setValue("role", val)}
              disabled={loadingData || roles.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un rol" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.name}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.role && (
              <p className="text-red-500 text-xs">{errors.role.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || loadingData || availableUsers.length === 0}
            >
              {loading ? "Asignando..." : "Asignar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
