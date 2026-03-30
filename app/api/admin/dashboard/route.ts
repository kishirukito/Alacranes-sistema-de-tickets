/**
 * app/api/admin/dashboard/route.ts
 * Stats del dashboard admin calculados desde Supabase real.
 * Requiere rol 'admin'.
 */
import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { supabaseAdmin, requireAdmin } from "@/lib/supabase-admin"

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const isAdmin = await requireAdmin(user.id)
    if (!isAdmin) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayISO = today.toISOString()

    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()

    // Ventas del día
    const { data: dailyOrders } = await supabaseAdmin
      .from("orders")
      .select("total_amount")
      .eq("status", "paid")
      .gte("paid_at", todayISO)

    const dailySales = (dailyOrders || []).reduce(
      (sum, o) => sum + (o.total_amount || 0),
      0
    )

    // Ingresos del mes
    const { data: monthlyOrders } = await supabaseAdmin
      .from("orders")
      .select("total_amount")
      .eq("status", "paid")
      .gte("paid_at", firstOfMonth)

    const monthlyIncome = (monthlyOrders || []).reduce(
      (sum, o) => sum + (o.total_amount || 0),
      0
    )

    // Total de boletos vendidos
    const { count: ticketsSold } = await supabaseAdmin
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .in("status", ["activo", "usado"])

    // Ventas por mes (últimos 8 meses)
    const months = []
    for (let i = 7; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      months.push({
        month: d.toLocaleDateString("es-MX", { month: "short" }).toUpperCase(),
        year: d.getFullYear(),
        from: d.toISOString(),
        to: new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString(),
      })
    }

    const monthlySales = await Promise.all(
      months.map(async (m) => {
        const { data } = await supabaseAdmin
          .from("orders")
          .select("total_amount")
          .eq("status", "paid")
          .gte("paid_at", m.from)
          .lte("paid_at", m.to)

        return {
          month: m.month,
          amount: (data || []).reduce((sum, o) => sum + (o.total_amount || 0), 0),
        }
      })
    )

    // Todos los eventos (pasados + futuros) para el filtro del dashboard
    const { data: allMatches } = await supabaseAdmin
      .from("matches")
      .select(`
        id,
        match_date,
        match_time,
        is_published,
        home_team:teams!matches_home_team_id_fkey (name, short_name),
        away_team:teams!matches_away_team_id_fkey (name, short_name),
        venue:venues (name),
        match_zone_inventory (available_seats, zone:zones(total_seats))
      `)
      .order("match_date", { ascending: false })
      .limit(30)

    const todayStr = new Date().toISOString().split("T")[0]

    const upcomingEvents = (allMatches || []).map((m) => {
      const homeTeam = m.home_team as unknown as { name: string; short_name: string }
      const awayTeam = m.away_team as unknown as { name: string; short_name: string }
      const venue = m.venue as unknown as { name: string }
      const inventory = m.match_zone_inventory as unknown as Array<{
        available_seats: number; zone: { total_seats: number }
      }>

      const totalSeats = inventory?.reduce(
        (sum, inv) => sum + (inv.zone?.total_seats || 0), 0
      ) || 0
      const soldSeats = inventory?.reduce(
        (sum, inv) => sum + Math.max(0, (inv.zone?.total_seats || 0) - inv.available_seats), 0
      ) || 0
      const isSoldOut = totalSeats > 0 && soldSeats >= totalSeats
      const isPast = m.match_date < todayStr

      const matchDate = new Date(m.match_date + "T00:00:00")

      let status: "active" | "soldout" | "upcoming" | "cancelled" | "completed"
      if (isPast) {
        status = "completed"
      } else if (isSoldOut) {
        status = "soldout"
      } else if (m.is_published) {
        status = "active"
      } else {
        status = "upcoming"
      }

      return {
        id: m.id,
        title: `${homeTeam?.name} vs ${awayTeam?.name}`,
        subtitle: "Liga TDP",
        date: matchDate.toLocaleDateString("es-MX", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        time: `${m.match_time?.slice(0, 5) || "20:00"} HRS`,
        venue: venue?.name || "",
        status,
        icon: "match",
        sold: soldSeats,
        total: totalSeats,
      }
    })

    return NextResponse.json({
      stats: {
        dailySales: {
          amount: dailySales,
          currency: "MXN",
          change: 0,
          trend: "up",
        },
        monthlyIncome: {
          amount: monthlyIncome,
          currency: "MXN",
          change: 0,
          trend: "up",
        },
        ticketsSold: {
          amount: ticketsSold || 0,
          unit: "UNIDADES",
          change: 0,
          trend: "up",
        },
      },
      monthlySales,
      upcomingEvents,
      totalEvents: (allMatches || []).length,
    })
  } catch (err) {
    console.error("Dashboard API error:", err)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
