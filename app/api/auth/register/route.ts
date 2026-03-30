/**
 * app/api/auth/register/route.ts
 * Registro de nuevos usuarios via Supabase Auth.
 * El trigger handle_new_user crea el perfil automáticamente.
 */
import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, nombre, apellido, telefono } = body

    // Validaciones
    if (!email || !password || !nombre || !apellido) {
      return NextResponse.json(
        { error: "Todos los campos obligatorios son requeridos" },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Formato de email inválido" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const fullName = `${nombre.trim()} ${apellido.trim()}`

    // Registrar en Supabase Auth — el trigger crea el perfil con full_name
    const { data, error } = await supabase.auth.signUp({
      email: email.toLowerCase().trim(),
      password,
      options: {
        data: {
          full_name: fullName,
          phone: telefono || null,
        },
      },
    })

    if (error) {
      if (error.message.includes("already registered")) {
        return NextResponse.json(
          { error: "Ya existe una cuenta con este email" },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (!data.user) {
      return NextResponse.json(
        { error: "Error al crear la cuenta" },
        { status: 500 }
      )
    }

    // Actualizar teléfono en el perfil si se proporcionó
    if (telefono) {
      await supabase
        .from("profiles")
        .update({ phone: telefono, updated_at: new Date().toISOString() })
        .eq("id", data.user.id)
    }

    // Supabase devuelve session=null cuando requiere confirmación de email
    const requiresConfirmation = !data.session

    return NextResponse.json({
      success: true,
      message: requiresConfirmation
        ? "Revisa tu correo para confirmar tu cuenta"
        : "Cuenta creada exitosamente",
      requiresConfirmation,
      user: {
        id: data.user.id,
        email: data.user.email,
        fullName,
        role: "fan",
      },
    })
  } catch {
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
