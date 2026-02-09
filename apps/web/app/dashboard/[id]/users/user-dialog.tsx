"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";

// Componentes UI
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

// Reglas de validación
const formSchema = z.object({
  full_name: z.string().min(2, "El nombre es muy corto"),
  email: z.string().email("Correo inválido"),
  password: z.string().min(6, "La contraseña debe tener 6 caracteres o más"),
  role: z.enum(["owner", "admin", "seller"]),
});

export function UserDialog({ companyId }: { companyId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      role: "seller", // Rol por defecto: Vendedor
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      // Petición al Backend
      const res = await fetch(`http://localhost:3000/users/company/${companyId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) throw new Error("Error al crear usuario");

      // Éxito: Cerrar modal, limpiar form y refrescar lista
      setOpen(false);
      reset();
      router.refresh(); 
      
    } catch (error) {
      console.error(error);
      alert("Hubo un error al crear el usuario. Revisa que el Backend esté corriendo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-slate-900 hover:bg-slate-800 shadow-md">
          + Nuevo Usuario
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Agregar Miembro</DialogTitle>
          <DialogDescription>
            Crea una cuenta para un empleado. Podrá acceder inmediatamente.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          
          {/* Nombre */}
          <div className="grid gap-2">
            <Label htmlFor="name">Nombre Completo</Label>
            <Input id="name" placeholder="Ej: Ana López" {...register("full_name")} />
            {errors.full_name && <p className="text-red-500 text-xs">{errors.full_name.message}</p>}
          </div>

          {/* Email */}
          <div className="grid gap-2">
            <Label htmlFor="email">Correo Electrónico</Label>
            <Input id="email" placeholder="ana@empresa.com" {...register("email")} />
            {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
          </div>

          {/* Password */}
          <div className="grid gap-2">
            <Label htmlFor="password">Contraseña Temporal</Label>
            <Input id="password" type="password" placeholder="******" {...register("password")} />
            {errors.password && <p className="text-red-500 text-xs">{errors.password.message}</p>}
          </div>

          {/* Selector de Rol */}
          <div className="grid gap-2">
            <Label>Rol / Permisos</Label>
            <Select onValueChange={(val: any) => setValue("role", val)} defaultValue="seller">
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
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : "Crear Usuario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}