import { cookies } from "next/headers";
import { jwtDecode } from "jwt-decode";
import { getTranslations } from "next-intl/server";
import { Building2, Settings, SlidersHorizontal, FileText, Users, Truck, Briefcase, Shield, Scale, Percent } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { UserNav } from "@/components/user-nav";

// Definimos qué forma tiene el token por dentro
interface TokenPayload {
  sub: string;
  username: string;
  role: string;
  name: string;
}

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // 1. Obtener el token de las cookies
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  // 2. Decodificar los datos del usuario
  let user = { name: "Usuario", email: "correo@demo.com", role: "seller" }; // Datos por defecto

  if (token) {
    try {
      const decoded = jwtDecode<TokenPayload>(token);
      user = {
        name: decoded.name || "Usuario",
        email: decoded.username,
        role: decoded.role,
      };
    } catch (error) {
      console.error("Error decodificando token:", error);
    }
  }

  const isAdminOrOwner = ["owner", "admin"].includes(user.role);
  const t = await getTranslations("Sidebar");

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      
      {/* 🟢 SIDEBAR */}
      <aside className="w-64 bg-slate-900 text-white hidden md:flex flex-col fixed h-full shadow-xl z-50">
        
        {/* Logo */}
        <div className="p-6 border-b border-slate-800">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-900/50">
              N
            </div>
            <span className="font-bold text-lg tracking-tight">Nexus ERP</span>
          </Link>
        </div>

        {/* Menú de Navegación */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2 mt-2 px-3">
            {t("operations")}
          </div>
          
          <Link href={`/dashboard/${id}`} className="flex items-center gap-3 px-3 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium shadow-md shadow-blue-900/20 transition-all hover:bg-blue-500">
            📊 {t("main_panel")}
          </Link>
          
          <Link href={`/dashboard/${id}/pos`} className="flex items-center gap-3 px-3 py-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg text-sm font-medium transition-all">
            🛒 {t("pos")}
          </Link>
          
          <Link href={`/dashboard/${id}/inventory`} className="flex items-center gap-3 px-3 py-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg text-sm font-medium transition-all">
            📦 {t("inventory")}
          </Link>

          <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2 mt-8 px-3">
            {t("directory")}
          </div>
          <Link href={`/dashboard/${id}/contacts/clients`} className="flex items-center gap-3 px-3 py-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg text-sm font-medium transition-all">
            <Users className="h-4 w-4" />
            {t("clients")}
          </Link>
          <Link href={`/dashboard/${id}/contacts/providers`} className="flex items-center gap-3 px-3 py-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg text-sm font-medium transition-all">
            <Truck className="h-4 w-4" />
            {t("providers")}
          </Link>
          <Link href={`/dashboard/${id}/contacts/employees`} className="flex items-center gap-3 px-3 py-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg text-sm font-medium transition-all">
            <Briefcase className="h-4 w-4" />
            {t("employees")}
          </Link>

          {isAdminOrOwner && (
            <>
              <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2 mt-8 px-3">
                {t("administration")}
              </div>
              <Link href={`/dashboard/${id}/users`} className="flex items-center gap-3 px-3 py-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg text-sm font-medium transition-all">
                👥 {t("users_roles")}
              </Link>
              <Link href={`/dashboard/${id}/settings/establishments`} className="flex items-center gap-3 px-3 py-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg text-sm font-medium transition-all">
                <Building2 className="h-4 w-4" />
                {t("establishments")}
              </Link>
              <Link href={`/dashboard/${id}/settings/company`} className="flex items-center gap-3 px-3 py-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg text-sm font-medium transition-all">
                <Settings className="h-4 w-4" />
                {t("company_settings")}
              </Link>
              <Link href={`/dashboard/${id}/settings/general`} className="flex items-center gap-3 px-3 py-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg text-sm font-medium transition-all">
                <SlidersHorizontal className="h-4 w-4" />
                {t("general_settings")}
              </Link>
              <Link href={`/dashboard/${id}/settings/taxes`} className="flex items-center gap-3 px-3 py-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg text-sm font-medium transition-all">
                <Percent className="h-4 w-4" />
                {t("taxes")}
              </Link>
              <Link href={`/dashboard/${id}/settings/audit`} className="flex items-center gap-3 px-3 py-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg text-sm font-medium transition-all">
                <FileText className="h-4 w-4" />
                {t("audit")}
              </Link>
              <Link href={`/dashboard/${id}/settings/roles`} className="flex items-center gap-3 px-3 py-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg text-sm font-medium transition-all">
                <Shield className="h-4 w-4" />
                {t("roles")}
              </Link>
              <Link href={`/dashboard/${id}/settings/business-rules`} className="flex items-center gap-3 px-3 py-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg text-sm font-medium transition-all">
                <Scale className="h-4 w-4" />
                {t("business_rules")}
              </Link>
              <Link href={`/dashboard/${id}/settings`} className="flex items-center gap-3 px-3 py-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg text-sm font-medium transition-all">
                ⚙️ {t("global_settings")}
              </Link>
            </>
          )}
        </nav>

        {/* Footer del Sidebar (Datos Reales del Usuario) */}
        <div className="p-4 border-t border-slate-800 bg-slate-900">
          <UserNav email={user.email} name={user.name} />
        </div>
      </aside>

      {/* 🟢 CONTENIDO DINÁMICO */}
      <main className="flex-1 md:ml-64 p-8 min-h-screen transition-all">
        {children}
      </main>
    </div>
  );
}