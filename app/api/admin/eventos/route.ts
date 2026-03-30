/**
 * app/api/admin/eventos/route.ts
 * Gestión de partidos/eventos — Admin.
 */
import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { supabaseAdmin, requireAdmin } from "@/lib/supabase-admin"

// GET /api/admin/eventos
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !(await requireAdmin(user.id))) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const { searchParams } = request.nextUrl
    const status = searchParams.get("status")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const offset = (page - 1) * limit

    let query = supabaseAdmin
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
        venue:venues (id, name, city)
      `, { count: "exact" })
      .order("match_date", { ascending: false })
      .range(offset, offset + limit - 1)

    // Filtrar por status calculado
    if (status && status !== "Todos" && status !== "Agotados" && status !== "Completados") {
      const todayDate = new Date().toISOString().slice(0, 10)
      if (status === "Activos") {
        query = query.eq("is_published", true).gte("match_date", todayDate)
      } else if (status === "Próximos") {
        query = query.eq("is_published", false).gte("match_date", todayDate)
      } else if (status === "Cancelados") {
        query = query.eq("is_published", false).lt("match_date", todayDate)
      }
    }
    // "Completados" = partidos ya jugados (fecha pasada, publicados o no)
    if (status === "Completados") {
      const todayDate = new Date().toISOString().slice(0, 10)
      query = query.lt("match_date", todayDate)
    }

    // Filtrar por rango de fechas
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    if (startDate) query = query.gte("match_date", startDate)
    if (endDate) query = query.lte("match_date", endDate)

    const { data: matches, count, error } = await query

    if (error) {
      return NextResponse.json(
        { error: "Error al obtener eventos" },
        { status: 500 }
      )
    }

    // Capacidad total del estadio: suma directa de zones.total_seats
    const { data: allZones } = await supabaseAdmin
      .from("zones")
      .select("total_seats")
    const stadiumCapacity = (allZones || []).reduce(
      (sum, z) => sum + (z.total_seats || 0), 0
    )

    // Boletos vendidos reales agrupados por partido
    const matchIds = (matches || []).map((m) => m.id)
    const ticketCountByMatch: Record<string, number> = {}
    if (matchIds.length > 0) {
      const { data: ticketCounts } = await supabaseAdmin
        .from("tickets")
        .select("match_id")
        .in("match_id", matchIds)
        .in("status", ["activo", "usado"])
      ;(ticketCounts || []).forEach((t) => {
        ticketCountByMatch[t.match_id] = (ticketCountByMatch[t.match_id] || 0) + 1
      })
    }

    const formatted = (matches || []).map((m) => {
      const homeTeam = m.home_team as unknown as { id: string; name: string; short_name: string }
      const awayTeam = m.away_team as unknown as { id: string; name: string; short_name: string }
      const venue = m.venue as unknown as { id: string; name: string; city: string }

      const totalSeats = stadiumCapacity
      const soldSeats = ticketCountByMatch[m.id] || 0
      const availableSeats = Math.max(0, totalSeats - soldSeats)

      return {
        id: m.id,
        name: `${homeTeam?.name} vs ${awayTeam?.name}`,
        date: m.match_date,
        time: m.match_time?.slice(0, 5) || "20:00",
        status: m.is_published
          ? soldSeats >= totalSeats
            ? "Agotado"
            : "Activo"
          : "Próximo",
        availability: { sold: soldSeats, total: totalSeats, available: availableSeats },
        teams: {
          home: homeTeam?.name,
          away: awayTeam?.name,
        },
        homeCode: homeTeam?.short_name,
        awayCode: awayTeam?.short_name,
        venue: venue?.name,
        season: m.season,
        competition: m.competition,
        isPublished: m.is_published,
      }
    })

    // Post-filtrar Agotados (requiere datos de tickets calculados)
    const finalData = status === "Agotados"
      ? formatted.filter((e) => e.status === "Agotado")
      : formatted

    return NextResponse.json({
      success: true,
      data: finalData,
      total: status === "Agotados" ? finalData.length : (count || 0),
      page,
    })
  } catch (err) {
    console.error("Admin events GET error:", err)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}


// POST /api/admin/eventos — Crear nuevo partido
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !(await requireAdmin(user.id))) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const body = await request.json()
    const {
      homeTeamId,
      awayTeamId,
      venueId,
      matchDate,
      matchTime,
      dayOfWeek,
      season,
      competition,
      isPublished = false,
      zonesInventory = [], // [{ zoneId, availableSeats, priceOverride? }]
    } = body

    if (!homeTeamId || !awayTeamId || !venueId || !matchDate || !matchTime) {
      return NextResponse.json(
        { error: "Faltan campos requeridos" },
        { status: 400 }
      )
    }

    // Crear el partido
    const { data: newMatch, error: matchError } = await supabaseAdmin
      .from("matches")
      .insert({
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        venue_id: venueId,
        match_date: matchDate,
        match_time: matchTime,
        day_of_week: dayOfWeek || null,
        season: season || new Date().getFullYear().toString(),
        competition: competition || "Liga TDP",
        is_published: isPublished,
      })
      .select()
      .single()

    if (matchError || !newMatch) {
      console.error("Match insert error:", matchError)
      return NextResponse.json(
        { error: "Error al crear el partido" },
        { status: 500 }
      )
    }

    // Crear inventario por zona si se especificó
    if (zonesInventory.length > 0) {
      const invRows = zonesInventory.map(
        (z: { zoneId: string; availableSeats: number; priceOverride?: number }) => ({
          match_id: newMatch.id,
          zone_id: z.zoneId,
          available_seats: z.availableSeats,
          price_override: z.priceOverride || null,
        })
      )
      await supabaseAdmin.from("match_zone_inventory").insert(invRows)
    }

    return NextResponse.json(
      {
        success: true,
        data: newMatch,
        message: "Partido creado exitosamente",
      },
      { status: 201 }
    )
  } catch (err) {
    console.error("Admin events POST error:", err)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
