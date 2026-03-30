/**
 * app/api/admin/usuarios/route.ts
 * Gestión de usuarios — Admin.
 */
import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { supabaseAdmin, requireAdmin } from "@/lib/supabase-admin"

// GET /api/admin/usuarios
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !(await requireAdmin(user.id))) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const { searchParams } = request.nextUrl
    const search = searchParams.get("search") || ""
    const roleFilter = searchParams.get("role") || ""
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const offset = (page - 1) * limit

    let query = supabaseAdmin
      .from("profiles")
      .select("id, full_name, phone, role, avatar_url, created_at", {
        count: "exact",
      })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (search) {
      query = query.ilike("full_name", `%${search}%`)
    }

    if (roleFilter && roleFilter !== "Todos") {
      query = query.eq("role", roleFilter.toLowerCase())
    }

    const { data: profiles, count, error } = await query

    if (error) {
      return NextResponse.json(
        { error: "Error al obtener usuarios" },
        { status: 500 }
      )
    }

    // Obtener emails de auth.users via admin API
    const { data: authData } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: limit,
    })

    const authMap = new Map(
      (authData?.users || []).map((u) => [u.id, u.email])
    )

    const formatted = (profiles || []).map((p) => {
      const nameParts = (p.full_name || "").split(" ")
      const initials = nameParts
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)

      const roleLabels: Record<string, string> = {
        admin: "Administrador",
        staff: "Personal de Staff",
        fan: "Aficionado",
      }

      return {
        id: p.id,
        name: p.full_name || "Sin nombre",
        email: authMap.get(p.id) || "",
        phone: p.phone || "",
        registrationDate: new Date(p.created_at).toLocaleDateString("es-MX"),
        status: "Activo",
        role: roleLabels[p.role] || p.role,
        roleKey: p.role,
        initials,
        avatarUrl: p.avatar_url || null,
      }
    })

    return NextResponse.json({
      success: true,
      data: formatted,
      total: count || 0,
      page,
    })
  } catch (err) {
    console.error("Admin users GET error:", err)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// POST /api/admin/usuarios — Cambiar rol de usuario
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !(await requireAdmin(user.id))) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const { userId, role } = await request.json()

    if (!userId || !role) {
      return NextResponse.json(
        { error: "userId y role son requeridos" },
        { status: 400 }
      )
    }

    const validRoles = ["fan", "staff", "admin"]
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Rol inválido" },
        { status: 400 }
      )
    }

    // No permitir cambiar el propio rol
    if (userId === user.id) {
      return NextResponse.json(
        { error: "No puedes cambiar tu propio rol" },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ role, updated_at: new Date().toISOString() })
      .eq("id", userId)

    if (error) {
      return NextResponse.json(
        { error: "Error al actualizar rol" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Rol actualizado correctamente",
    })
  } catch (err) {
    console.error("Admin users POST error:", err)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
