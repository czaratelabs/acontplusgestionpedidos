import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtDecode } from "jwt-decode";

interface JwtPayload {
  sub: string;
  companyId: string | null;
  role: string;
  isSuperAdmin?: boolean;
}

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  // Sin token → ir a login
  if (!token) {
    redirect("/login");
  }

  try {
    const payload = jwtDecode<JwtPayload>(token);

    // SuperAdmin sin empresa → panel de admin
    if (payload.isSuperAdmin) {
      redirect("/dashboard/admin/subscriptions");
    }

    // Usuario normal con empresa → su dashboard
    if (payload.companyId) {
      redirect(`/dashboard/${payload.companyId}`);
    }

    // Token válido pero sin companyId ni superAdmin → login
    redirect("/login");
  } catch {
    // Token malformado → login
    redirect("/login");
  }
}
