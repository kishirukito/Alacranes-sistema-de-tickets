/**
 * app/api/sponsors/route.ts
 * Patrocinadores — GET (público) + POST (admin)
 */
import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { supabaseAdmin, requireAdmin } from "@/lib/supabase-admin"

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: sponsors, error } = await supabase
      .from("sponsors")
      .select("id, name, logo_url, website_url, tier, display_order, is_active")
      .eq("is_active", true)
      .order("display_order", { ascending: true })

    if (error) {
      console.error("Error fetching sponsors:", error)
      return NextResponse.json(
        { success: false, error: "Error al obtener patrocinadores" },
        { status: 500 }
      )
    }

    const formatted = (sponsors || []).map((s) => ({
      id: s.id,
      name: s.name,
      logo: s.logo_url || null,
      websiteUrl: s.website_url || null,
      website: s.website_url ? s.website_url.replace(/^https?:\/\//, "") : null,
      tier: s.tier,
      displayOrder: s.display_order,
      isActive: s.is_active,
    }))

    return NextResponse.json({
      success: true,
      data: formatted,
    })
  } catch (err) {
    console.error("Sponsors API error:", err)
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !(await requireAdmin(user.id))) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const body = await request.json()
    const { name, websiteUrl, tier, logoUrl, displayOrder } = body

    if (!name || !tier) {
      return NextResponse.json(
        { error: "Nombre y nivel de patrocinio son requeridos" },
        { status: 400 }
      )
    }

    // Obtener el mayor display_order actual
    const { data: existing } = await supabaseAdmin
      .from("sponsors")
      .select("display_order")
      .order("display_order", { ascending: false })
      .limit(1)

    const nextOrder = displayOrder ?? ((existing?.[0]?.display_order ?? 0) + 1)

    const { data: newSponsor, error } = await supabaseAdmin
      .from("sponsors")
      .insert({
        name,
        website_url: websiteUrl || null,
        logo_url: logoUrl || null,
        tier,
        display_order: nextOrder,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error("Create sponsor error:", error)
      return NextResponse.json(
        { error: "Error al crear el patrocinador" },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: newSponsor.id,
          name: newSponsor.name,
          logo: newSponsor.logo_url || null,
          websiteUrl: newSponsor.website_url || null,
          website: newSponsor.website_url ? newSponsor.website_url.replace(/^https?:\/\//, "") : null,
          tier: newSponsor.tier,
          displayOrder: newSponsor.display_order,
          isActive: newSponsor.is_active,
        },
        message: "Patrocinador creado exitosamente",
      },
      { status: 201 }
    )
  } catch (err) {
    console.error("Sponsors POST error:", err)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !(await requireAdmin(user.id))) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const body = await request.json()
    const { id, name, websiteUrl, tier, logoUrl, displayOrder, isActive } = body

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name
    if (websiteUrl !== undefined) updates.website_url = websiteUrl || null
    if (tier !== undefined) updates.tier = tier
    if (logoUrl !== undefined) updates.logo_url = logoUrl || null
    if (displayOrder !== undefined) updates.display_order = displayOrder
    if (isActive !== undefined) updates.is_active = isActive

    const { data: updated, error } = await supabaseAdmin
      .from("sponsors")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Update sponsor error:", error)
      return NextResponse.json({ error: "Error al actualizar patrocinador" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        logo: updated.logo_url || null,
        websiteUrl: updated.website_url || null,
        tier: updated.tier,
        displayOrder: updated.display_order,
        isActive: updated.is_active,
      },
      message: "Patrocinador actualizado exitosamente",
    })
  } catch (err) {
    console.error("Sponsors PUT error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

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

    // Soft delete — marcar como inactivo en lugar de borrar
    const { error } = await supabaseAdmin
      .from("sponsors")
      .update({ is_active: false })
      .eq("id", id)

    if (error) {
      return NextResponse.json({ error: "Error al eliminar patrocinador" }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Patrocinador eliminado" })
  } catch (err) {
    console.error("Sponsors DELETE error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
