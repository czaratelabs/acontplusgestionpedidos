import Link from "next/link";
import { cookies } from "next/headers"; // 👈 Para leer cookies en el servidor
import { jwtDecode } from "jwt-decode"; // 👈 Para leer el token
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

  // Helper para saber si tiene permisos de administración
  const isAdminOrOwner = ['owner', 'admin'].includes(user.role);

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
            Operaciones
          </div>
          
          <Link href={`/dashboard/${id}`} className="flex items-center gap-3 px-3 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium shadow-md shadow-blue-900/20 transition-all hover:bg-blue-500">
            📊 Panel Principal
          </Link>
          
          <Link href={`/dashboard/${id}/pos`} className="flex items-center gap-3 px-3 py-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg text-sm font-medium transition-all">
            🛒 Punto de Venta
          </Link>
          
          <Link href={`/dashboard/${id}/inventory`} className="flex items-center gap-3 px-3 py-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg text-sm font-medium transition-all">
            📦 Inventario
          </Link>

          {/* 🔒 SECCIÓN PROTEGIDA (Dinámica según el Token) */}
          {isAdminOrOwner && (
            <>
              <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2 mt-8 px-3">
                Administración
              </div>
              <Link href={`/dashboard/${id}/users`} className="flex items-center gap-3 px-3 py-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg text-sm font-medium transition-all">
                👥 Usuarios y Roles
              </Link>
              <Link href={`/dashboard/${id}/settings`} className="flex items-center gap-3 px-3 py-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg text-sm font-medium transition-all">
                ⚙️ Configuración Global
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