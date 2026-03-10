import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/**
 * Proxies POST /auth/refresh al backend y fija el nuevo JWT en cookie HttpOnly
 * para que el backend (Passport) lo lea en req.cookies.token.
 */
export async function POST(request: NextRequest) {
  try {
    const tokenFromCookie = request.cookies.get("token")?.value;
    const body = await request.json().catch(() => ({}));
    const tokenFromBody = typeof body?.token === "string" ? body.token : "";
    const authHeader = request.headers.get("authorization");
    const tokenFromHeader =
      authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : authHeader ?? "";
    const token = (tokenFromBody || tokenFromCookie || tokenFromHeader || "").trim();
    if (!token) {
      return NextResponse.json({ message: "Token requerido" }, { status: 401 });
    }

    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }
    const accessToken = data?.access_token;
    if (typeof accessToken !== "string" || !accessToken) {
      return NextResponse.json(
        { message: "Respuesta de refresh inválida" },
        { status: 502 }
      );
    }

    // Body opcional: si el cliente aún llama al backend directo (API_BASE), puede leer access_token
    // y seguir usando js-cookie hasta migrar todo al proxy /api/.
    const response = NextResponse.json({ ok: true, access_token: accessToken });
    // HttpOnly para que no sea legible por JS; el cliente sigue pudiendo usar credentials: include
    response.cookies.set("token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8, // 8h alineado con backend
    });
    return response;
  } catch (err) {
    console.error("[api/auth/refresh] Proxy error:", err);
    return NextResponse.json(
      {
        message:
          "No se pudo conectar con el servidor. Comprueba que el backend esté en ejecución.",
      },
      { status: 503 }
    );
  }
}
