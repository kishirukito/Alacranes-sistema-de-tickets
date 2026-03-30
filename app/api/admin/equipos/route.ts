/**
 * app/api/admin/equipos/route.ts
 * CRUD de equipos (teams) — Admin.
 */
import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { supabaseAdmin, requireAdmin } from "@/lib/supabase-admin"

// GET /api/admin/equipos — listar todos los equipos
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !(await requireAdmin(user.id))) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const { data: teams, error } = await supabaseAdmin
      .from("teams")
      .select("id, name, short_name, city, logo_url, is_home_team, created_at")
      .order("name", { ascending: true })

    if (error) {
      console.error("Teams GET error:", error)
      return NextResponse.json({ error: "Error al obtener equipos" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: (teams || []).map((t) => ({
        id: t.id,
        name: t.name,
        shortName: t.short_name,
        city: t.city || "",
        logoUrl: t.logo_url || null,
        isHomeTeam: t.is_home_team ?? false,
        createdAt: t.created_at,
      })),
    })
  } catch (err) {
    console.error("Teams GET error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// POST /api/admin/equipos — crear equipo
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !(await requireAdmin(user.id))) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const body = await request.json()
    const { name, shortName, city, logoUrl, isHomeTeam } = body

    if (!name?.trim() || !shortName?.trim()) {
      return NextResponse.json(
        { error: "Nombre y abreviatura son obligatorios" },
        { status: 400 }
      )
    }

    const { data: team, error } = await supabaseAdmin
      .from("teams")
      .insert({
        name: name.trim(),
        short_name: shortName.trim().toUpperCase(),
        city: city?.trim() || null,
        logo_url: logoUrl?.trim() || null,
        is_home_team: isHomeTeam ?? false,
      })
      .select()
      .single()

    if (error) {
      console.error("Team create error:", error)
      return NextResponse.json({ error: "Error al crear el equipo" }, { status: 500 })
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: team.id,
          name: team.name,
          shortName: team.short_name,
          city: team.city || "",
          logoUrl: team.logo_url || null,
          isHomeTeam: team.is_home_team ?? false,
          createdAt: team.created_at,
        },
        message: "Equipo creado exitosamente",
      },
      { status: 201 }
    )
  } catch (err) {
    console.error("Team POST error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// PUT /api/admin/equipos — actualizar equipo
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !(await requireAdmin(user.id))) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const body = await request.json()
    const { id, name, shortName, city, logoUrl, isHomeTeam } = body

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name.trim()
    if (shortName !== undefined) updates.short_name = shortName.trim().toUpperCase()
    if (city !== undefined) updates.city = city?.trim() || null
    if (logoUrl !== undefined) updates.logo_url = logoUrl?.trim() || null
    if (isHomeTeam !== undefined) updates.is_home_team = isHomeTeam

    const { data: updated, error } = await supabaseAdmin
      .from("teams")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Team update error:", error)
      return NextResponse.json({ error: "Error al actualizar equipo" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        shortName: updated.short_name,
        city: updated.city || "",
        logoUrl: updated.logo_url || null,
        isHomeTeam: updated.is_home_team ?? false,
        createdAt: updated.created_at,
      },
      message: "Equipo actualizado exitosamente",
    })
  } catch (err) {
    console.error("Team PUT error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// DELETE /api/admin/equipos?id=<uuid> — eliminar equipo
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !(await requireAdmin(user.id))) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 })
    }

    // Verificar si el equipo tiene partidos asociados antes de eliminar
    const { count: matchCount } = await supabaseAdmin
      .from("matches")
      .select("id", { count: "exact", head: true })
      .or(`home_team_id.eq.${id},away_team_id.eq.${id}`)

    if ((matchCount ?? 0) > 0) {
      return NextResponse.json(
        {
          error: `No se puede eliminar: el equipo tiene ${matchCount} partido(s) asociado(s). Elimina primero los partidos.`,
        },
        { status: 409 }
      )
    }

    const { error } = await supabaseAdmin.from("teams").delete().eq("id", id)

    if (error) {
      console.error("Team delete error:", error)
      return NextResponse.json({ error: "Error al eliminar equipo" }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Equipo eliminado correctamente" })
  } catch (err) {
    console.error("Team DELETE error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
