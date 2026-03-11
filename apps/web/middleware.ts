import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const { pathname } = request.nextUrl;

  const isProtectedRoute = pathname.startsWith("/dashboard");

  // Redirigir a login si accede a ruta protegida sin sesión
  if (isProtectedRoute && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirigir desde /login o /register al destino final (evita bucle /login → / → /login)
  if ((pathname === "/login" || pathname === "/register") && token) {
    try {
      const parts = token.split(".");
      const base64Payload = parts[1];
      if (!base64Payload) return NextResponse.next();
      // JWT usa base64url: convertir a base64 estándar para atob (compatible con Edge)
      const base64 = base64Payload.replace(/-/g, "+").replace(/_/g, "/");
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
      const payload = JSON.parse(atob(padded)) as {
        isSuperAdmin?: boolean;
        companyId?: string | null;
      };
      if (payload.isSuperAdmin) {
        return NextResponse.redirect(
          new URL("/dashboard/admin/subscriptions", request.url),
        );
      }
      if (payload.companyId) {
        return NextResponse.redirect(
          new URL(`/dashboard/${payload.companyId}`, request.url),
        );
      }
      // Token sin companyId ni superAdmin → dejar pasar a login
      return NextResponse.next();
    } catch {
      // Token malformado → dejar pasar a login
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
