/**
 * app/auth/callback/route.ts
 * Maneja el callback de OAuth (Google, Magic Link, etc.) de Supabase.
 * Intercambia el "code" por una sesión y establece las cookies de autenticación.
 */
import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next") ?? "/"

  if (code) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Redirigir al destino solicitado (o a la raíz si no hay)
      return NextResponse.redirect(new URL(next, requestUrl.origin))
    }

    console.error("Auth callback error:", error.message)
  }

  // Si algo falló, redirigir al login con mensaje de error
  return NextResponse.redirect(
    new URL("/login?error=auth_callback_failed", requestUrl.origin)
  )
}
