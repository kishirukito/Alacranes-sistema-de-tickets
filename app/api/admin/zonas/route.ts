/**
 * app/api/admin/zonas/route.ts
 * Gestión de zonas de precios — Admin.
 */
import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { supabaseAdmin, requireAdmin } from "@/lib/supabase-admin"

// GET /api/admin/zonas?matchId=<uuid>
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !(await requireAdmin(user.id))) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const matchId = searchParams.get("matchId")

    if (matchId) {
      // Zonas con inventario para un partido específico
      const { data: inventory, error } = await supabaseAdmin
        .from("match_zone_inventory")
        .select(`
          id,
          available_seats,
          price_override,
          zone:zones (
            id,
            zone_key,
            name,
            price,
            total_seats,
            color_hex,
            gate
          )
        `)
        .eq("match_id", matchId)

      if (error) {
        return NextResponse.json({ error: "Error al obtener zonas" }, { status: 500 })
      }

      const formatted = (inventory || []).map((inv) => {
        const zone = inv.zone as unknown as {
          id: string; zone_key: string; name: string; price: number;
          total_seats: number; color_hex?: string; gate?: string
        }
        const price = inv.price_override ?? zone.price
        const sold = zone.total_seats - inv.available_seats

        return {
          id: zone.zone_key,
          zoneId: zone.id,
          inventoryId: inv.id,
          name: zone.name,
          price,
          basePrice: zone.price,
          priceOverride: inv.price_override,
          capacity: zone.total_seats,
          sold,
          available: inv.available_seats,
          color: zone.color_hex || "#D32F2F",
          gate: zone.gate || "",
          status:
            inv.available_seats === 0
              ? "Agotado"
              : inv.available_seats < zone.total_seats * 0.15
              ? "Limitado"
              : "Disponible",
        }
      })

      return NextResponse.json({ data: formatted })
    }

    // Sin matchId — todas las zonas del venue principal
    const { data: zones, error } = await supabaseAdmin
      .from("zones")
      .select("id, zone_key, name, price, total_seats, color_hex, gate, venue:venues(name)")
      .order("name")

    if (error) {
      return NextResponse.json({ error: "Error al obtener zonas" }, { status: 500 })
    }

    return NextResponse.json({ data: zones })
  } catch (err) {
    console.error("Admin zonas GET error:", err)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// PUT /api/admin/zonas — Actualizar zona o inventario
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !(await requireAdmin(user.id))) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const body = await request.json()
    const { zoneId, inventoryId, name, price, totalSeats, priceOverride, availableSeats } = body

    if (!zoneId && !inventoryId) {
      return NextResponse.json(
        { error: "zoneId o inventoryId son requeridos" },
        { status: 400 }
      )
    }

    // Actualizar zona base
    if (zoneId) {
      const updates: Record<string, unknown> = {}
      if (name !== undefined) updates.name = name
      if (price !== undefined) updates.price = price
      if (totalSeats !== undefined) updates.total_seats = totalSeats

      if (Object.keys(updates).length > 0) {
        await supabaseAdmin.from("zones").update(updates).eq("id", zoneId)
      }
    }

    // Actualizar inventario por partido
    if (inventoryId) {
      const invUpdates: Record<string, unknown> = {}
      if (priceOverride !== undefined) invUpdates.price_override = priceOverride
      if (availableSeats !== undefined) invUpdates.available_seats = availableSeats

      if (Object.keys(invUpdates).length > 0) {
        await supabaseAdmin
          .from("match_zone_inventory")
          .update(invUpdates)
          .eq("id", inventoryId)
      }
    }

    return NextResponse.json({
      success: true,
      message: "Zona actualizada correctamente",
    })
  } catch (err) {
    console.error("Admin zonas PUT error:", err)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
