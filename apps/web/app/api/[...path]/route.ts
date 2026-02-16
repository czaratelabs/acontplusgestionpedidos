import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyRequest(request, params.path, "GET");
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyRequest(request, params.path, "POST");
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyRequest(request, params.path, "PUT");
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyRequest(request, params.path, "PATCH");
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyRequest(request, params.path, "DELETE");
}

async function proxyRequest(
  request: NextRequest,
  pathSegments: string[],
  method: string
) {
  try {
    const path = pathSegments.join("/");
    const url = new URL(request.url);
    const queryString = url.search;
    const targetUrl = `${API_BASE}/${path}${queryString}`;

    console.log(`[api/proxy] Proxying ${method} ${path} to ${targetUrl}`);

    // Preparar headers
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    // Copiar cookies del request original
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      headers["Cookie"] = cookieHeader;
    }

    // Preparar body si existe
    let body: string | undefined;
    if (method !== "GET" && method !== "DELETE") {
      try {
        body = await request.text();
      } catch {
        // Si no hay body, continuar sin él
      }
    }

    let res: Response;
    try {
      res = await fetch(targetUrl, {
        method,
        headers,
        body: body || undefined,
      });
    } catch (fetchError: any) {
      // Error de conexión (backend no disponible, CORS, etc.)
      console.error(`[api/proxy] Fetch error for ${method} ${path}:`, fetchError);
      const errorMsg = fetchError?.message || String(fetchError);
      
      if (
        errorMsg.includes("fetch") || 
        errorMsg.includes("ECONNREFUSED") || 
        errorMsg.includes("Failed to fetch") ||
        errorMsg.includes("network") ||
        errorMsg.includes("NetworkError") ||
        fetchError instanceof TypeError ||
        fetchError?.cause?.code === "ECONNREFUSED"
      ) {
        return NextResponse.json(
          {
            message: "No se pudo conectar con el servidor. Comprueba que el backend esté en ejecución en el puerto 3001.",
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

    // Copiar headers de respuesta importantes
    const responseHeaders = new Headers();
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) {
      responseHeaders.set("set-cookie", setCookie);
    }

    // Leer respuesta
    let data: any;
    try {
      const text = await res.text();
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = { message: text };
        }
      } else {
        data = {};
      }
    } catch (readError) {
      console.error(`[api/proxy] Error reading response for ${method} ${path}:`, readError);
      data = { message: res.statusText || `Error ${res.status}` };
    }

    return NextResponse.json(data, {
      status: res.status,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error(`[api/proxy] Unexpected error proxying ${method} request to ${pathSegments.join("/")}:`, err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    
    return NextResponse.json(
      {
        message: "Error al procesar la solicitud",
        error: errorMessage
      },
      { status: 500 }
    );
  }
}
