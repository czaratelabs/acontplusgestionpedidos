"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { apiPost } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const formSchema = z.object({
  company_name: z.string().min(1, "El nombre de la empresa es requerido"),
  company_ruc_nit: z.string().min(1, "El RUC/NIT es requerido"),
  full_name: z.string().min(1, "Tu nombre completo es requerido"),
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      company_name: "",
      company_ruc_nit: "",
      full_name: "",
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    setError("");

    try {
      try {
        await apiPost<Record<string, unknown>>("/api/auth/register", values, {
          skip401Redirect: true,
        });
      } catch (fetchError: unknown) {
        console.error("Error de red al registrar:", fetchError);
        const err = fetchError as Error;
        const errorMsg = err?.message || String(fetchError);
        if (
          errorMsg.includes("Failed to fetch") ||
          errorMsg.includes("NetworkError") ||
          errorMsg.includes("Network request failed") ||
          fetchError instanceof TypeError
        ) {
          setError("No se pudo conectar con el servidor. Verifica que el backend esté en el puerto 3001.");
          return;
        }
        throw fetchError;
      }
      router.push("/login?registered=1");
    } catch (err: unknown) {
      console.error("Error al registrar:", err);
      if (err instanceof TypeError && (err as Error).message === "Failed to fetch") {
        setError("No se pudo conectar con el servidor.");
      } else {
        setError(err instanceof Error ? err.message : "Error al crear la cuenta");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
      <Card className="w-full max-w-md shadow-xl border-slate-200">
        <CardHeader className="space-y-1">
          <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center mb-4 mx-auto shadow-md">
            <span className="text-white text-2xl">📋</span>
          </div>
          <CardTitle className="text-2xl text-center font-bold text-slate-900">
            Crear cuenta
          </CardTitle>
          <CardDescription className="text-center text-slate-500">
            Registra tu empresa y comienza a usar el ERP
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="company_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de la empresa</FormLabel>
                    <FormControl>
                      <Input autoComplete="organization" placeholder="Mi Empresa S.A." {...field} className="bg-white" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="company_ruc_nit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>RUC / NIT</FormLabel>
                    <FormControl>
                      <Input autoComplete="organization-tax-id" placeholder="1234567890001" {...field} className="bg-white" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tu nombre completo</FormLabel>
                    <FormControl>
                      <Input autoComplete="name" placeholder="Juan Pérez" {...field} className="bg-white" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo electrónico</FormLabel>
                    <FormControl>
                      <Input type="email" autoComplete="email" placeholder="admin@miempresa.com" {...field} className="bg-white" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="new-password" placeholder="••••••" {...field} className="bg-white" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm text-center font-medium">
                  ⚠️ {error}
                </div>
              )}
              <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 transition-all mt-2" disabled={loading}>
                {loading ? "Creando cuenta..." : "Crear cuenta"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 border-t bg-slate-50/50 pt-4 pb-6">
          <p className="text-sm text-slate-500">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="font-medium text-slate-900 hover:underline">
              Iniciar sesión
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
