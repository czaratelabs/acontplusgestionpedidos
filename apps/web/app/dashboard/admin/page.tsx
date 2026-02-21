import Link from "next/link";
import { getCompaniesForAdmin } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, CreditCard, AlertCircle, CheckCircle } from "lucide-react";

function isExpired(endDate: string | null): boolean {
  if (!endDate) return false;
  return new Date(endDate) < new Date();
}

export default async function AdminDashboardPage() {
  const companies = await getCompaniesForAdmin();

  const total = companies.length;
  const withPlan = companies.filter((c) => c.planId != null).length;
  const withoutPlan = companies.filter((c) => c.planId == null).length;
  const expired = companies.filter((c) => c.planId != null && isExpired(c.subscriptionEndDate)).length;
  const active = withPlan - expired;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Administración Global</h1>
        <p className="text-slate-500 mt-1">Vista general del sistema. Estadísticas de empresas registradas.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total empresas</CardTitle>
            <Building2 className="h-5 w-5 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{total}</div>
            <p className="text-xs text-slate-400 mt-1">Empresas creadas en el sistema</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Con plan activo</CardTitle>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{active}</div>
            <p className="text-xs text-slate-400 mt-1">Suscripción vigente</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Sin plan</CardTitle>
            <CreditCard className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">{withoutPlan}</div>
            <p className="text-xs text-slate-400 mt-1">Sin suscripción asignada</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Caducadas</CardTitle>
            <AlertCircle className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{expired}</div>
            <p className="text-xs text-slate-400 mt-1">Requieren renovación</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Planes de Suscripción</CardTitle>
            <CardDescription>
              Configura planes, asigna suscripciones a empresas y gestiona límites y módulos.
            </CardDescription>
          </div>
          <Button asChild>
            <Link href="/dashboard/admin/subscriptions">
              <CreditCard className="h-4 w-4 mr-2" />
              Ir a Planes
            </Link>
          </Button>
        </CardHeader>
      </Card>
    </div>
  );
}
