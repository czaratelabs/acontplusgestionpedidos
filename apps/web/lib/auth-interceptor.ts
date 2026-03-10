/**
 * Interceptor de fetch: ante 401 intenta POST /api/auth/refresh y reintenta la petición una vez.
 * Evita bucles: no reintenta si la URL es la de refresh ni si ya se reintentó.
 */

const REFRESH_PATH = "/api/auth/refresh";
const LOGIN_PATH = "/login";

function isRefreshUrl(url: string): boolean {
  try {
    const u = url.startsWith("http") ? new URL(url) : new URL(url, "http://local");
    return u.pathname === REFRESH_PATH || u.pathname.endsWith("/api/auth/refresh");
  } catch {
    return url.includes("/api/auth/refresh");
  }
}

let refreshInFlight: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const res = await fetch(REFRESH_PATH, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

function redirectToLogin(): void {
  if (typeof window === "undefined") return;
  window.location.href = LOGIN_PATH;
}

/**
 * fetch con reintento tras refresh en caso de 401.
 * @param input URL o Request
 * @param init opciones fetch; si init omite credentials, se fuerza include
 */
export async function fetchWithAuth(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const credentials = init?.credentials ?? "include";
  const firstInit = { ...init, credentials };

  const res = await fetch(input, firstInit);
  if (res.status !== 401 || isRefreshUrl(url)) {
    if (res.status === 401 && typeof window !== "undefined" && !isRefreshUrl(url)) {
      redirectToLogin();
    }
    return res;
  }

  const refreshed = await tryRefresh();
  if (!refreshed) {
    redirectToLogin();
    return res;
  }

  const retryInit = { ...init, credentials };
  return fetch(input, retryInit);
}
