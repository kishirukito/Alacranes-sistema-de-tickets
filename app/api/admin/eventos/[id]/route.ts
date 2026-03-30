import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { supabaseAdmin, requireAdmin } from "@/lib/supabase-admin"

// GET /api/admin/eventos/[id] — Detalle completo de un partido
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !(await requireAdmin(user.id))) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    // Obtener el partido
    const { data: match, error } = await supabaseAdmin
      .from("matches")
      .select(`
        id,
        match_date,
        match_time,
        day_of_week,
        season,
        competition,
        is_published,
        home_team:teams!matches_home_team_id_fkey (id, name, short_name),
        away_team:teams!matches_away_team_id_fkey (id, name, short_name),
        venue:venues (id, name, city),
        match_zone_inventory (
          id,
          available_seats,
          price_override,
          zone:zones (id, name, total_seats, price, zone_key)
        )
      `)
      .eq("id", id)
      .single()

    if (error || !match) {
      return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 })
    }

    const homeTeam = match.home_team as unknown as { id: string; name: string; short_name: string }
    const awayTeam = match.away_team as unknown as { id: string; name: string; short_name: string }
    const venue = match.venue as unknown as { id: string; name: string; city: string }
    const rawInventory = match.match_zone_inventory as unknown as Array<{
      id: string; available_seats: number; price_override: number | null;
      zone: { id: string; name: string; total_seats: number; price: number; zone_key: string }
    }>

    // Si NO hay inventario, traer todas las zonas directamente
    let inventorySource: Array<{
      inventoryId: string | null
      zoneId: string
      zoneName: string
      zoneKey: string
      totalSeats: number
      basePrice: number
      priceOverride: number | null
    }> = []

    if (rawInventory && rawInventory.length > 0) {
      // Inventario real existe
      inventorySource = rawInventory.map(inv => ({
        inventoryId: inv.id,
        zoneId: inv.zone?.id,
        zoneName: inv.zone?.name,
        zoneKey: inv.zone?.zone_key,
        totalSeats: inv.zone?.total_seats || 0,
        basePrice: inv.zone?.price || 0,
        priceOverride: inv.price_override,
      }))
    } else {
      // Sin inventario: cargar zonas directamente
      const { data: allZones } = await supabaseAdmin
        .from("zones")
        .select("id, name, zone_key, total_seats, price")
        .order("name")
      inventorySource = (allZones || []).map(z => ({
        inventoryId: null,
        zoneId: z.id,
        zoneName: z.name,
        zoneKey: z.zone_key,
        totalSeats: z.total_seats || 0,
        basePrice: z.price || 0,
        priceOverride: null,
      }))
    }

    // Boletos vendidos reales, agrupados por zona_id
    const { data: ticketRows } = await supabaseAdmin
      .from("tickets")
      .select("zone_id")
      .eq("match_id", id)
      .in("status", ["activo", "usado"])
    const soldByZone: Record<string, number> = {}
    ;(ticketRows || []).forEach((t) => {
      soldByZone[t.zone_id] = (soldByZone[t.zone_id] || 0) + 1
    })

    // Totales globales del partido
    const totalSeats = inventorySource.reduce((s, z) => s + z.totalSeats, 0)
    const soldSeats = Object.values(soldByZone).reduce((a, b) => a + b, 0)
    const availableSeatsTotal = Math.max(0, totalSeats - soldSeats)

    const inventory = inventorySource.map(z => {
      const zoneSold = soldByZone[z.zoneId] || 0
      const zoneAvailable = Math.max(0, z.totalSeats - zoneSold)
      return {
        inventoryId: z.inventoryId,
        zoneId: z.zoneId,
        zoneName: z.zoneName,
        zoneKey: z.zoneKey,
        availableSeats: zoneAvailable,
        soldSeats: zoneSold,
        totalSeats: z.totalSeats,
        priceOverride: z.priceOverride,
        basePrice: z.basePrice,
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: match.id,
        name: `${homeTeam?.name} vs ${awayTeam?.name}`,
        date: match.match_date,
        time: match.match_time?.slice(0, 5) || "20:00",
        status: match.is_published
          ? soldSeats >= totalSeats ? "Agotado" : "Activo"
          : "Próximo",
        homeTeamId: homeTeam?.id,
        awayTeamId: awayTeam?.id,
        venueId: venue?.id,
        season: match.season,
        competition: match.competition,
        dayOfWeek: match.day_of_week,
        isPublished: match.is_published,
        availability: { sold: soldSeats, total: totalSeats, available: availableSeatsTotal },
        homeCode: homeTeam?.short_name,
        awayCode: awayTeam?.short_name,
        venue: venue?.name,
        inventory,
      },
    })
  } catch (err) {
    console.error("Admin evento GET error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })

  }
}

// PUT /api/admin/eventos/[id] — Actualizar partido
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !(await requireAdmin(user.id))) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const body = await request.json()
    const {
      matchDate,
      matchTime,
      dayOfWeek,
      season,
      competition,
      isPublished,
      homeTeamId,
      awayTeamId,
      venueId,
    } = body

    const updates: Record<string, unknown> = {}
    if (matchDate !== undefined) updates.match_date = matchDate
    if (matchTime !== undefined) updates.match_time = matchTime
    if (dayOfWeek !== undefined) updates.day_of_week = dayOfWeek
    if (season !== undefined) updates.season = season
    if (competition !== undefined) updates.competition = competition
    if (isPublished !== undefined) updates.is_published = isPublished
    if (homeTeamId !== undefined) updates.home_team_id = homeTeamId
    if (awayTeamId !== undefined) updates.away_team_id = awayTeamId
    if (venueId !== undefined) updates.venue_id = venueId

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 })
    }

    const { data: updated, error } = await supabaseAdmin
      .from("matches")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Match update error:", error)
      return NextResponse.json({ error: "Error al actualizar el partido" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Evento actualizado exitosamente",
    })
  } catch (err) {
    console.error("Admin evento PUT error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// DELETE /api/admin/eventos/[id] — Eliminar partido
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !(await requireAdmin(user.id))) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    // Primero eliminar inventario asociado
    await supabaseAdmin
      .from("match_zone_inventory")
      .delete()
      .eq("match_id", id)

    // Luego eliminar el partido
    const { error } = await supabaseAdmin
      .from("matches")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Match delete error:", error)
      return NextResponse.json({ error: "Error al eliminar el partido" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Evento eliminado exitosamente",
      deletedId: id,
    })
  } catch (err) {
    console.error("Admin evento DELETE error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
