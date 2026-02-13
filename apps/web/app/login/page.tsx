"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";

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

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Esquema de validación (Reglas del juego)
const formSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Inicializar el formulario
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Función que se ejecuta al enviar
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    setError("");

    try {
      const loginUrl = `${API_BASE}/auth/login`;
      console.log("🔗 Attempting Login to:", loginUrl);
      console.log("🔗 NEXT_PUBLIC_API_URL:", process.env.NEXT_PUBLIC_API_URL ?? "(undefined, using fallback)");
      const res = await fetch(loginUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("API Error Response:", text);
        let message = "Error al iniciar sesión";
        try {
          const errJson = JSON.parse(text);
          if (errJson?.message) message = errJson.message;
        } catch {
          message = `Error ${res.status}: ${res.statusText}`;
        }
        throw new Error(message);
      }

      const data = await res.json();

      // 1. Guardar el Token en una Cookie (Pasaporte)
      Cookies.set("token", data.access_token, { expires: 1 }); // Dura 1 día
      
      // 2. Guardar datos del usuario (opcional)
      localStorage.setItem("user", JSON.stringify(data.user));

      // 3. Redirigir al Dashboard de su empresa
      router.push(`/dashboard/${data.user.companyId}`);
      
    } catch (err: any) {
      console.error(err);
      setError("Credenciales incorrectas o error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
      <Card className="w-full max-w-md shadow-xl border-slate-200">
        <CardHeader className="space-y-1">
          <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center mb-4 mx-auto shadow-md">
            <span className="text-white text-2xl">🔐</span>
          </div>
          <CardTitle className="text-2xl text-center font-bold text-slate-900">Bienvenido de nuevo</CardTitle>
          <CardDescription className="text-center text-slate-500">
            Ingresa tus credenciales para acceder al ERP
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo Electrónico</FormLabel>
                    <FormControl>
                      <Input placeholder="admin@miempresa.com" {...field} className="bg-white" />
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
                      <Input type="password" placeholder="••••••" {...field} className="bg-white" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm text-center font-medium animate-pulse">
                  ⚠️ {error}
                </div>
              )}

              <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 transition-all mt-2" disabled={loading}>
                {loading ? "Verificando..." : "Ingresar al Sistema"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="justify-center border-t bg-slate-50/50 pt-4 pb-6">
          <p className="text-xs text-slate-400">Protegido por Nexus Security v1.0</p>
        </CardFooter>
      </Card>
    </div>
  );
}