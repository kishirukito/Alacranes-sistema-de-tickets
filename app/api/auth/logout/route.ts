/**
 * app/api/auth/logout/route.ts
 * Cierre de sesión via Supabase Auth — limpia el JWT de las cookies.
 */
import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      return NextResponse.json(
        { error: "Error al cerrar sesión" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Sesión cerrada exitosamente",
    })
  } catch {
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
