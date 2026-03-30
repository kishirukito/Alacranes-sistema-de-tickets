/**
 * middleware.ts
 * Refresca el token de sesión de Supabase en cada petición al servidor.
 * WITHOUT this, supabase.auth.getUser() in route handlers returns null
 * even when the user is authenticated in the browser.
 */
import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refrescar la sesión para que las cookies no expiren silenciosamente.
  // IMPORTANTE: no usar getSession() aquí, usar getUser() para validar contra el servidor.
  const { data: { user } } = await supabase.auth.getUser()

  // ── Guard de rutas /admin/* ─────────────────────────────────────────────
  // Si la ruta es del panel admin, verificar que el usuario tenga rol "admin".
  const pathname = request.nextUrl.pathname
  if (pathname.startsWith("/admin")) {
    if (!user) {
      // No autenticado → redirigir al login
      return NextResponse.redirect(new URL("/login", request.url))
    }

    // Verificar rol en la base de datos (server-side, no confiamos solo en el cliente)
    const { createClient: createAdminClient } = await import("@supabase/supabase-js")
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data: profile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile || profile.role !== "admin") {
      // Autenticado pero no es admin → redirigir al inicio
      return NextResponse.redirect(new URL("/", request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Aplica el middleware a todas las rutas excepto:
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico, robots.txt, etc.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)",
  ],
}
