"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Cookies from "js-cookie";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

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

const LOGIN_URL = "/api/auth/login";
const SELECT_COMPANY_URL = "/api/auth/select-company";

const formSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

type CompanyOption = {
  companyId: string;
  companyName?: string;
  role: string;
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const [step, setStep] = useState<"credentials" | "select_company">(
    "credentials"
  );
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [sessionToken, setSessionToken] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    if (searchParams.get("registered") === "1") {
      setSuccess("Cuenta creada. Ya puedes iniciar sesión.");
      router.replace("/login", { scroll: false });
    }
  }, [searchParams, router]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(LOGIN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const message = data?.message ?? `Error ${res.status}`;
        throw new Error(message);
      }

      if (data.step === "select_company" && data.companies?.length > 1) {
        setCompanies(data.companies);
        setSessionToken(data.sessionToken);
        setUserName(data.user?.name ?? "");
        setStep("select_company");
        setSelectedCompanyId(data.companies[0]?.companyId ?? "");
      } else {
        Cookies.set("token", data.access_token, { expires: 1 });
        localStorage.setItem("user", JSON.stringify(data.user));
        router.push(`/dashboard/${data.user.companyId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Credenciales incorrectas");
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectCompany() {
    if (!selectedCompanyId || !sessionToken) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(SELECT_COMPANY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ companyId: selectedCompanyId }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const message = data?.message ?? "Error al seleccionar empresa";
        throw new Error(message);
      }

      Cookies.set("token", data.access_token, { expires: 1 });
      localStorage.setItem("user", JSON.stringify(data.user));
      router.push(`/dashboard/${data.user.companyId}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al seleccionar empresa"
      );
    } finally {
      setLoading(false);
    }
  }

  function handleBackToCredentials() {
    setStep("credentials");
    setError("");
    setCompanies([]);
    setSessionToken("");
    setSelectedCompanyId("");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
      <Card className="w-full max-w-md shadow-xl border-slate-200">
        <CardHeader className="space-y-1">
          <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center mb-4 mx-auto shadow-md">
            <span className="text-white text-2xl">🔐</span>
          </div>
          <CardTitle className="text-2xl text-center font-bold text-slate-900">
            {step === "select_company" ? "Selecciona la empresa" : "Bienvenido de nuevo"}
          </CardTitle>
          <CardDescription className="text-center text-slate-500">
            {step === "select_company"
              ? `Hola ${userName}, elige con qué empresa deseas acceder.`
              : "Ingresa tus credenciales para acceder al ERP"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "credentials" ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correo Electrónico</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="admin@miempresa.com"
                          {...field}
                          className="bg-white"
                        />
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
                        <Input
                          type="password"
                          placeholder="••••••"
                          {...field}
                          className="bg-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {success && (
                  <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm text-center font-medium">
                    ✓ {success}
                  </div>
                )}
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm text-center font-medium animate-pulse">
                    ⚠️ {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800 transition-all mt-2"
                  disabled={loading}
                >
                  {loading ? "Verificando..." : "Ingresar al Sistema"}
                </Button>
              </form>
            </Form>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Empresa
                </label>
                <select
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {companies.map((c) => (
                    <option key={c.companyId} value={c.companyId}>
                      {c.companyName ?? c.companyId} ({c.role})
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm text-center font-medium">
                  ⚠️ {error}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={handleBackToCredentials}
                  disabled={loading}
                >
                  Volver
                </Button>
                <Button
                  type="button"
                  className="flex-1 bg-slate-900 hover:bg-slate-800"
                  onClick={handleSelectCompany}
                  disabled={loading}
                >
                  {loading ? "Accediendo..." : "Continuar"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2 border-t bg-slate-50/50 pt-4 pb-6">
          <p className="text-sm text-slate-500">
            ¿No tienes cuenta?{" "}
            <Link
              href="/register"
              className="font-medium text-slate-900 hover:underline"
            >
              Registrarse
            </Link>
          </p>
          <p className="text-xs text-slate-400">Protegido por Nexus Security v1.0</p>
        </CardFooter>
      </Card>
    </div>
  );
}
