import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

const PUBLIC_PATHS = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/terminos",
  "/privacidad",
  "/manifest.webmanifest",
  "/sw.js",
  "/offline.html",
];

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname.startsWith("/icons/")) return true;
  if (pathname.startsWith("/splash/")) return true;
  if (pathname.startsWith("/_next/")) return true;
  if (pathname.startsWith("/garantia/")) return true;
  if (pathname === "/favicon.ico") return true;
  if (pathname === "/robots.txt") return true;
  return false;
}

// Si Supabase Auth tarda más que esto, no bloqueamos el request: los layouts
// y server components del área privada igual chequean la sesión al renderizar.
// Así una latencia puntual de Supabase no se convierte en un 504 de Vercel.
const AUTH_TIMEOUT_MS = 2500;
const TIMED_OUT = Symbol("auth-timeout");

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const publicPath = isPublicPath(pathname);

  // Solo necesitamos saber quién es el usuario para: (a) mandar a /login desde
  // una ruta privada sin sesión, y (b) mandar a /dashboard desde /login con
  // sesión. El resto (raíz, legales, garantía pública, assets) pasa directo.
  const needsAuthCheck = (!publicPath && pathname !== "/") || pathname === "/login";
  if (!needsAuthCheck) {
    return NextResponse.next({ request: { headers: request.headers } });
  }

  let response = NextResponse.next({ request: { headers: request.headers } });

  const { url, key } = getSupabaseEnv();

  const supabase = createServerClient(url, key, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options });
        response = NextResponse.next({ request: { headers: request.headers } });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: "", ...options });
        response = NextResponse.next({ request: { headers: request.headers } });
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });

  let outcome: Awaited<ReturnType<typeof supabase.auth.getUser>> | typeof TIMED_OUT;
  try {
    outcome = await Promise.race([
      supabase.auth.getUser(),
      new Promise<typeof TIMED_OUT>((resolve) =>
        setTimeout(() => resolve(TIMED_OUT), AUTH_TIMEOUT_MS)
      ),
    ]);
  } catch {
    outcome = TIMED_OUT;
  }

  // Estado de sesión desconocido (timeout o error de red): dejamos pasar el
  // request sin redirigir. Los guards del servidor siguen aplicando.
  if (outcome === TIMED_OUT) {
    return response;
  }

  const user = outcome.data.user;

  if (!user && !publicPath && pathname !== "/") {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|splash/|manifest.webmanifest|sw.js|robots.txt).*)",
  ],
};
