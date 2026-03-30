/**
 * app/api/profile/route.ts
 * Perfil del usuario autenticado — Supabase.
 */
import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"

// GET /api/profile
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    // Usar supabaseAdmin para leer perfil y evitar recursión RLS
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, phone, avatar_url, role, created_at")
      .eq("id", user.id)
      .single()

    if (error || !profile) {
      return NextResponse.json(
        { error: "Perfil no encontrado" },
        { status: 404 }
      )
    }

    const nameParts = (profile.full_name || "").split(" ")

    return NextResponse.json({
      success: true,
      data: {
        id: profile.id,
        name: nameParts[0] || "",
        lastName: nameParts.slice(1).join(" ") || "",
        fullName: profile.full_name || "",
        email: user.email || "",
        phone: profile.phone || "",
        role: profile.role || "fan",
        avatarUrl: profile.avatar_url || null,
        memberSince: profile.created_at
          ? new Date(profile.created_at).toLocaleDateString("es-MX")
          : "",
      },
    })
  } catch (err) {
    console.error("Profile GET error:", err)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// PUT /api/profile
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const body = await request.json()
    const { name, lastName, email, phone } = body

    if (!name || !lastName) {
      return NextResponse.json(
        { error: "Nombre y apellido son requeridos" },
        { status: 400 }
      )
    }

    const fullName = `${name.trim()} ${lastName.trim()}`

    // Usar supabaseAdmin para el UPDATE — bypasea RLS y evita recursión infinita
    // El servidor ya verificó la sesión arriba con getUser(), es seguro
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name: fullName,
        phone: phone || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)

    if (profileError) {
      console.error("Profile update error:", profileError)
      return NextResponse.json(
        { error: "Error al actualizar el perfil" },
        { status: 500 }
      )
    }

    // Actualizar email en auth si cambió
    if (email && email !== user.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: "El formato del email no es válido" },
          { status: 400 }
        )
      }
      await supabase.auth.updateUser({ email })
    }

    return NextResponse.json({
      success: true,
      message: "Perfil actualizado correctamente",
    })
  } catch (err) {
    console.error("Profile PUT error:", err)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
