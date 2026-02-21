import { cookies } from "next/headers";
import { jwtDecode } from "jwt-decode";
import { Building2, Settings, SlidersHorizontal, FileText, Users, Truck, Briefcase, Shield, Scale, Percent, CreditCard } from "lucide-react";
import Link from "next/link";
import { UserNav } from "@/components/user-nav";
import { LockedMenuItem } from "@/components/locked-menu-item";

interface TokenPayload {
  sub: string;
  username: string;
  role: string;
  name: string;
}

type PlanWithModules = { id: string; name: string; modules?: Record<string, boolean> };
type Company = { id: string; plan?: { modules?: Record<string, boolean> } | null };

const MODULE_KEYS = {
  directory_clients: "directory_clients",
  directory_providers: "directory_providers",
  directory_employees: "directory_employees",
  admin_users_roles: "admin_users_roles",
  admin_establishments: "admin_establishments",
  admin_company_config: "admin_company_config",
  admin_general_config: "admin_general_config",
  admin_taxes: "admin_taxes",
  admin_audit: "admin_audit",
  admin_roles: "admin_roles",
  admin_business_rules: "admin_business_rules",
} as const;

function isModuleEnabled(modules: Record<string, boolean> | undefined, key: string): boolean {
  return modules?.[key] === true;
}

function plansWithModule(plans: PlanWithModules[], key: string): { name: string }[] {
  return (plans ?? [])
    .filter((p) => p.modules?.[key] === true)
    .map((p) => ({ name: p.name }));
}

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  let planModules: Record<string, boolean> = {};
  let plans: PlanWithModules[] = [];

  if (token && id && !["admin"].includes(id)) {
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
    const headers = { Cookie: `token=${token}` };
    try {
      const [companyRes, plansRes] = await Promise.all([
        fetch(`${apiBase}/companies/${id}`, { headers, cache: "no-store" }),
        fetch(`${apiBase}/subscription-plans`, { headers, cache: "no-store" }),
      ]);
      if (companyRes.ok) {
        const company: Company = await companyRes.json();
        planModules = company?.plan?.modules ?? {};
      }
      if (plansRes.ok) {
        const data = await plansRes.json();
        plans = Array.isArray(data) ? data : [];
      }
    } catch {
      /* ignorar */
    }
  }

  let user = { name: "Usuario", email: "correo@demo.com", role: "seller" };
  if (token) {
    try {
      const decoded = jwtDecode<TokenPayload>(token);
      user = { name: decoded.name || "Usuario", email: decoded.username, role: decoded.role };
    } catch (e) {
      console.error("Error decodificando token:", e);
    }
  }

  const isAdminOrOwner = ["owner", "admin"].includes(user.role);
  const isSuperAdmin = user.role?.toUpperCase() === "SUPER_ADMIN";

  const mod = (key: keyof typeof MODULE_KEYS) =>
    isSuperAdmin || isModuleEnabled(planModules, MODULE_KEYS[key]);

  const MenuLink = ({ href, children, icon }: { href: string; children: React.ReactNode; icon: React.ReactNode }) => (
    <Link href={href} className="flex items-center gap-3 px-3 py-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg text-sm font-medium transition-all">
      {icon}
      <span>{children}</span>
    </Link>
  );

  const MenuOrLocked = ({
    moduleKey,
    href,
    label,
    icon,
    moduleName,
  }: {
    moduleKey: keyof typeof MODULE_KEYS;
    href: string;
    label: string;
    icon: React.ReactNode;
    moduleName: string;
  }) =>
    mod(moduleKey) ? (
      <MenuLink href={href} icon={icon}>{label}</MenuLink>
    ) : (
      <LockedMenuItem
        label={label}
        plansWithModule={plansWithModule(plans, MODULE_KEYS[moduleKey])}
        moduleName={moduleName}
        icon={icon}
      />
    );

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <aside className="w-64 bg-slate-900 text-white hidden md:flex flex-col fixed h-full shadow-xl z-50">
        <div className="p-6 border-b border-slate-800">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-900/50">N</div>
            <span className="font-bold text-lg tracking-tight">Nexus ERP</span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {isSuperAdmin ? (
            <>
              <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2 mt-2 px-3">Configuración Global</div>
              <Link href="/dashboard/admin/subscriptions" className="flex items-center gap-3 px-3 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium shadow-md shadow-blue-900/20 transition-all hover:bg-blue-500">
                <CreditCard className="h-4 w-4" />
                Planes de Suscripción
              </Link>
            </>
          ) : (
            <>
              <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2 mt-2 px-3">Operaciones</div>
              <MenuLink href={`/dashboard/${id}`} icon={<span>📊</span>}>Panel Principal</MenuLink>
              <MenuLink href={`/dashboard/${id}/pos`} icon={<span>🛒</span>}>Punto de Venta</MenuLink>
              <MenuLink href={`/dashboard/${id}/inventory`} icon={<span>📦</span>}>Inventario</MenuLink>

              <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2 mt-8 px-3">Directorio</div>
              <MenuOrLocked moduleKey="directory_clients" href={`/dashboard/${id}/contacts/clients`} label="Clientes" icon={<Users className="h-4 w-4" />} moduleName="El módulo de Clientes" />
              <MenuOrLocked moduleKey="directory_providers" href={`/dashboard/${id}/contacts/providers`} label="Proveedores" icon={<Truck className="h-4 w-4" />} moduleName="El módulo de Proveedores" />
              <MenuOrLocked moduleKey="directory_employees" href={`/dashboard/${id}/contacts/employees`} label="Empleados" icon={<Briefcase className="h-4 w-4" />} moduleName="El módulo de Empleados" />

              {isAdminOrOwner && (
                <>
                  <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2 mt-8 px-3">Administración</div>
                  <MenuOrLocked moduleKey="admin_users_roles" href={`/dashboard/${id}/users`} label="Usuarios y Roles" icon={<span>👥</span>} moduleName="El módulo de Usuarios y Roles" />
                  <MenuOrLocked moduleKey="admin_establishments" href={`/dashboard/${id}/settings/establishments`} label="Establecimientos" icon={<Building2 className="h-4 w-4" />} moduleName="El módulo de Establecimientos" />
                  <MenuOrLocked moduleKey="admin_company_config" href={`/dashboard/${id}/settings/company`} label="Configuración Empresa" icon={<Settings className="h-4 w-4" />} moduleName="El módulo de Configuración de Empresa" />
                  <MenuOrLocked moduleKey="admin_general_config" href={`/dashboard/${id}/settings/general`} label="Configuración General" icon={<SlidersHorizontal className="h-4 w-4" />} moduleName="El módulo de Configuración General" />
                  <MenuOrLocked moduleKey="admin_taxes" href={`/dashboard/${id}/settings/taxes`} label="Impuestos" icon={<Percent className="h-4 w-4" />} moduleName="El módulo de Impuestos" />
                  <MenuOrLocked moduleKey="admin_audit" href={`/dashboard/${id}/settings/audit`} label="Auditoría" icon={<FileText className="h-4 w-4" />} moduleName="El módulo de Auditoría" />
                  <MenuOrLocked moduleKey="admin_roles" href={`/dashboard/${id}/settings/roles`} label="Roles" icon={<Shield className="h-4 w-4" />} moduleName="El módulo de Roles" />
                  <MenuOrLocked moduleKey="admin_business_rules" href={`/dashboard/${id}/settings/business-rules`} label="Reglas de Negocio" icon={<Scale className="h-4 w-4" />} moduleName="El módulo de Reglas de Negocio" />
                </>
              )}
            </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-900">
          <UserNav email={user.email} name={user.name} />
        </div>
      </aside>

      <main className="flex-1 md:ml-64 p-8 min-h-screen transition-all">{children}</main>
    </div>
  );
}
