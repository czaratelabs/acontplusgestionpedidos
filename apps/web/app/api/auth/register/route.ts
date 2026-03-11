import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function POST(request: NextRequest) {
  try {
    // Parsear el body de forma segura
    let body: unknown;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error("[api/auth/register] Error parsing request body:", parseError);
      return NextResponse.json(
        { 
          message: "Error al procesar los datos de la solicitud",
          error: "INVALID_REQUEST"
        },
        { status: 400 }
      );
    }
    
    // Intentar hacer fetch al backend
    let res: Response;
    try {
      const fetchUrl = `${API_BASE}/auth/register`;
      console.log(`[api/auth/register] Attempting to fetch: ${fetchUrl}`);
      
      // Crear un AbortController para timeout (compatible con más entornos)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos
      
      try {
        res = await fetch(fetchUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        throw fetchErr;
      }
    } catch (fetchError: unknown) {
      // Error de conexión (backend no disponible, CORS, timeout, etc.)
      console.error("[api/auth/register] Fetch error:", fetchError);
      const errorMsg = fetchError instanceof Error ? fetchError.message : String(fetchError);
      const errorName = fetchError instanceof Error ? fetchError.name : "";
      const causeCode = fetchError instanceof Error && fetchError.cause && typeof fetchError.cause === "object" && "code" in fetchError.cause ? (fetchError.cause as { code?: string }).code : undefined;

      // Detectar diferentes tipos de errores
      if (
        errorMsg.includes("fetch") ||
        errorMsg.includes("ECONNREFUSED") ||
        errorMsg.includes("Failed to fetch") ||
        errorMsg.includes("NetworkError") ||
        errorMsg.includes("Network request failed") ||
        errorName === "AbortError" ||
        errorName === "TimeoutError" ||
        causeCode === "ECONNREFUSED" ||
        fetchError instanceof TypeError
      ) {
        return NextResponse.json(
          { 
            message: "No se pudo conectar con el servidor. Verifica que el backend esté ejecutándose en el puerto 3001.",
            error: "CONNECTION_ERROR"
          },
          { status: 503 }
        );
      }
      
      return NextResponse.json(
        { 
          message: "Error al conectar con el servidor",
          error: errorMsg
        },
        { status: 503 }
      );
    }
    
    // Procesar la respuesta del backend
    let data: Record<string, unknown> = {};
    try {
      const text = await res.text();
      if (text) {
        data = JSON.parse(text) as Record<string, unknown>;
      }
    } catch (parseError) {
      console.error("[api/auth/register] JSON parse error:", parseError);
      // Si no se puede parsear, usar el texto como mensaje
      data = { message: res.statusText || `Error ${res.status}` };
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          message: (data?.message as string) || (data?.error as string) || `Error ${res.status}`,
          ...data
        }, 
        { status: res.status }
      );
    }
    
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    // Capturar cualquier error inesperado
    console.error("[api/auth/register] Unexpected error:", err);
    const errorMessage = err instanceof Error ? err.message : "Error desconocido";
    
    // Siempre devolver una respuesta válida
    return NextResponse.json(
      { 
        message: "Error al procesar la solicitud de registro",
        error: errorMessage
      },
      { status: 500 }
    );
  }
}
