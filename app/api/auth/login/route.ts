/**
 * app/api/auth/login/route.ts
 * Autenticación via Supabase Auth.
 * La sesión JWT se guarda automáticamente en cookies httpOnly.
 */
import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y contraseña son requeridos" },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // Autenticar con Supabase — guarda JWT en cookies httpOnly automáticamente
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    })

    if (error) {
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      )
    }

    // Obtener datos adicionales del perfil
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone, role, avatar_url")
      .eq("id", data.user.id)
      .single()

    return NextResponse.json({
      success: true,
      message: "Inicio de sesión exitoso",
      user: {
        id: data.user.id,
        email: data.user.email,
        fullName: profile?.full_name || "",
        phone: profile?.phone || "",
        role: profile?.role || "fan",
        avatarUrl: profile?.avatar_url || null,
      },
    })
  } catch {
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
