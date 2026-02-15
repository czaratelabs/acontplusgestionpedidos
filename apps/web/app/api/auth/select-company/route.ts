import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get("authorization");
    const body = await request.json();
    const res = await fetch(`${API_BASE}/auth/select-company`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(auth ? { Authorization: auth } : {}),
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("[api/auth/select-company] Proxy error:", err);
    return NextResponse.json(
      {
        message:
          "No se pudo conectar con el servidor. Comprueba que el backend esté en ejecución.",
      },
      { status: 503 }
    );
  }
}
