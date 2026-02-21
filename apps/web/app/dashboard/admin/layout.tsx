import { cookies } from "next/headers";
import { jwtDecode } from "jwt-decode";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CreditCard } from "lucide-react";
import { UserNav } from "@/components/user-nav";

interface TokenPayload {
  sub: string;
  username: string;
  role: string;
  name: string;
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  let user = { name: "Usuario", email: "correo@demo.com", role: "seller" };
  if (token) {
    try {
      const decoded = jwtDecode<TokenPayload>(token);
      user = {
        name: decoded.name || "Usuario",
        email: decoded.username,
        role: decoded.role,
      };
    } catch {
      // fallback
    }
  }

  const isSuperAdmin = user.role?.toUpperCase() === "SUPER_ADMIN";
  if (!isSuperAdmin) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <aside className="w-64 bg-slate-900 text-white hidden md:flex flex-col fixed h-full shadow-xl z-50">
        <div className="p-6 border-b border-slate-800">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-900/50">
              N
            </div>
            <span className="font-bold text-lg tracking-tight">Nexus ERP</span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2 mt-2 px-3">
            Administración Global
          </div>
          <Link
            href="/dashboard/admin/subscriptions"
            className="flex items-center gap-3 px-3 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium shadow-md shadow-blue-900/20 transition-all hover:bg-blue-500"
          >
            <CreditCard className="h-4 w-4" />
            Planes de Suscripción
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-900">
          <UserNav email={user.email} name={user.name} />
        </div>
      </aside>

      <main className="flex-1 md:ml-64 p-8 min-h-screen transition-all">
        {children}
      </main>
    </div>
  );
}
