import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "50")
    const upcoming = searchParams.get("upcoming") === "true"
    const season = searchParams.get("season")

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
        home_team:teams!matches_home_team_id_fkey (
          id,
          name,
          short_name,
          logo_url,
          is_home_team
        ),
        away_team:teams!matches_away_team_id_fkey (
          id,
          name,
          short_name,
          logo_url
        ),
        venue:venues (
          id,
          name,
          city,
          address
        )
      `)
      .order("match_date", { ascending: true })
      .limit(limit)

    if (upcoming) {
      query = query.gte("match_date", new Date().toISOString().split("T")[0])
    }

    if (season) {
      query = query.eq("season", season)
    }

    const { data: matches, error } = await query

    if (error) {
      console.error("Error fetching matches:", error)
      return NextResponse.json(
        { success: false, error: "Error al obtener los partidos" },
        { status: 500 }
      )
    }

    // Formatear fechas para el frontend
    const formatted = (matches || []).map((m) => {
      const date = new Date(m.match_date + "T00:00:00")
      const day = date.getDate()
      const month = date
        .toLocaleDateString("es-MX", { month: "short" })
        .toUpperCase()

      type HomeTeam = { id: string; name: string; short_name: string; logo_url?: string | null; is_home_team: boolean }
      type AwayTeam = { id: string; name: string; short_name: string; logo_url?: string | null }
      type Venue = { id: string; name: string; city: string; address?: string | null }
      const homeTeam = m.home_team as unknown as HomeTeam
      const awayTeam = m.away_team as unknown as AwayTeam
      const venue = m.venue as unknown as Venue

      return {
        id: m.id,
        date: `${day} ${month}`,
        time: m.match_time?.slice(0, 5) || "20:00",
        dayOfWeek: m.day_of_week || date
          .toLocaleDateString("es-MX", { weekday: "long" })
          .toUpperCase(),
        season: m.season,
        competition: m.competition,
        homeTeam: {
          id: homeTeam?.id,
          name: homeTeam?.name,
          shortName: homeTeam?.short_name,
          logo: homeTeam?.logo_url || null,
        },
        awayTeam: {
          id: awayTeam?.id,
          name: awayTeam?.name,
          shortName: awayTeam?.short_name,
          logo: awayTeam?.logo_url || null,
        },
        venue: venue?.name || "",
        venueCity: venue?.city || "",
        isHome: homeTeam?.is_home_team || false,
        ticketsAvailable: true,
      }
    })

    return NextResponse.json({
      success: true,
      data: formatted,
      meta: {
        total: formatted.length,
        season: season || new Date().getFullYear().toString(),
      },
    })
  } catch (err) {
    console.error("Matches API error:", err)
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
