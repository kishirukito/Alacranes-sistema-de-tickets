/**
 * app/api/admin/reportes/route.ts
 * Datos reales para el dashboard de reportes del administrador.
 * GET /api/admin/reportes?period=month&format=json
 * GET /api/admin/reportes?format=csv  (exportación CSV)
 */
import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { supabaseAdmin, requireAdmin } from "@/lib/supabase-admin"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !(await requireAdmin(user.id))) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get("format") || "json"
    const period = searchParams.get("period") || "month"
    const matchIdFilter = searchParams.get("matchId")
    const adminIdFilter = searchParams.get("adminId")
    const commissionFilter = searchParams.get("commission") // "yes" | "no"
    const startDateParam = searchParams.get("startDate")
    const endDateParam = searchParams.get("endDate")

    // Calcular rango de fechas
    const now = new Date()
    let fromDate: Date

    if (startDateParam) {
      fromDate = new Date(startDateParam + "T00:00:00")
    } else {
      switch (period) {
        case "week":
          fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case "month":
          fromDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        case "quarter":
          fromDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
          break
        case "year":
          fromDate = new Date(now.getFullYear(), 0, 1)
          break
        default:
          fromDate = new Date(now.getFullYear(), now.getMonth(), 1)
      }
    }

    const toDate = endDateParam ? new Date(endDateParam + "T23:59:59") : now
    const fromISO = fromDate.toISOString()
    const toISO = toDate.toISOString()

    // Filtro por evento específico — obtener order_ids
    let matchOrderIds: string[] | null = null
    if (matchIdFilter) {
      const { data: matchTickets } = await supabaseAdmin
        .from("tickets")
        .select("order_id")
        .eq("match_id", matchIdFilter)
      matchOrderIds = [...new Set((matchTickets || []).map((t) => t.order_id))] as string[]
    }

    // --- Stats globales ---
    let paidOrdersQuery = supabaseAdmin
      .from("orders")
      .select("total_amount, paid_at, payment_method")
      .eq("status", "paid")
      .gte("paid_at", fromISO)
      .lte("paid_at", toISO)

    if (matchOrderIds !== null) paidOrdersQuery = paidOrdersQuery.in("id", matchOrderIds)
    if (adminIdFilter) paidOrdersQuery = (paidOrdersQuery as typeof paidOrdersQuery).eq("user_id", adminIdFilter)
    if (commissionFilter === "yes") paidOrdersQuery = paidOrdersQuery.neq("payment_method", "cash")
    if (commissionFilter === "no") paidOrdersQuery = paidOrdersQuery.eq("payment_method", "cash")

    const [
      { data: paidOrders },
      { count: totalTickets },
      { count: totalUsers },
    ] = await Promise.all([
      paidOrdersQuery,
      supabaseAdmin
        .from("tickets")
        .select("id", { count: "exact", head: true })
        .in("status", ["activo", "usado"])
        .gte("created_at", fromISO)
        .lte("created_at", toISO),
      supabaseAdmin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", fromISO),
    ])

    const totalRevenue = (paidOrders || []).reduce(
      (sum, o) => sum + (o.total_amount || 0), 0
    )
    const avgOrderValue =
      paidOrders && paidOrders.length > 0
        ? totalRevenue / paidOrders.length
        : 0

    // --- Ventas por evento (top 10) ---
    const { data: ticketsByMatch } = await supabaseAdmin
      .from("tickets")
      .select(`
        match:matches (
          id, match_date,
          home_team:teams!matches_home_team_id_fkey (name, short_name),
          away_team:teams!matches_away_team_id_fkey (name, short_name)
        )
      `)
      .in("status", ["activo", "usado"])
      .gte("created_at", fromISO)

    const matchTicketCounts: Record<
      string,
      { label: string; value: number; matchDate: string }
    > = {}

    for (const t of ticketsByMatch || []) {
      const match = t.match as unknown as {
        id: string; match_date: string;
        home_team: { name: string; short_name: string };
        away_team: { name: string; short_name: string }
      }
      if (!match) continue
      const key = match.id
      if (!matchTicketCounts[key]) {
        matchTicketCounts[key] = {
          label: `VS ${match.away_team?.short_name || "?"}`,
          value: 0,
          matchDate: match.match_date,
        }
      }
      matchTicketCounts[key].value++
    }

    const salesByEvent = Object.values(matchTicketCounts)
      .sort((a, b) => b.value - a.value)
      .slice(0, 12)

    // --- Ventas por zona ---
    const { data: ticketsByZone } = await supabaseAdmin
      .from("tickets")
      .select("zone:zones (name, zone_key)")
      .in("status", ["activo", "usado"])
      .gte("created_at", fromISO)

    const zoneCounts: Record<string, { name: string; count: number }> = {}
    for (const t of ticketsByZone || []) {
      const zone = t.zone as unknown as { name: string; zone_key: string }
      if (!zone) continue
      if (!zoneCounts[zone.zone_key]) zoneCounts[zone.zone_key] = { name: zone.name, count: 0 }
      zoneCounts[zone.zone_key].count++
    }

    const totalZoneTickets = Object.values(zoneCounts).reduce(
      (s, z) => s + z.count, 0
    )
    const salesByZone = Object.entries(zoneCounts)
      .map(([key, z]) => ({
        name: z.name.toUpperCase(),
        zoneKey: key,
        tickets: z.count,
        pct:
          totalZoneTickets > 0
            ? Math.round((z.count / totalZoneTickets) * 100)
            : 0,
      }))
      .sort((a, b) => b.tickets - a.tickets)

    // --- Para exportación CSV ---
    if (format === "csv") {
      const { data: allOrders } = await supabaseAdmin
        .from("orders")
        .select(`
          id, status, total_amount, payment_method, paid_at, created_at,
          user:profiles (full_name),
          tickets (
            id, price,
            zone:zones (name),
            match:matches (
              match_date,
              home_team:teams!matches_home_team_id_fkey (name),
              away_team:teams!matches_away_team_id_fkey (name)
            )
          )
        `)
        .gte("created_at", fromISO)
        .order("created_at", { ascending: false })

      const rows = (allOrders || []).map((o) => {
        const profile = o.user as unknown as { full_name: string }
        const tickets = o.tickets as unknown as Array<{
          id: string; price: number;
          zone: { name: string };
          match: { match_date: string; home_team: { name: string }; away_team: { name: string } }
        }>
        const firstTicket = tickets?.[0]
        const match = firstTicket?.match

        return [
          o.id,
          profile?.full_name || "",
          match ? `${match.home_team?.name} vs ${match.away_team?.name}` : "",
          match?.match_date || "",
          firstTicket?.zone?.name || "",
          tickets?.length || 0,
          o.total_amount,
          o.status,
          o.payment_method || "",
          o.paid_at ? new Date(o.paid_at).toLocaleDateString("es-MX") : "",
          new Date(o.created_at).toLocaleDateString("es-MX"),
        ].join(",")
      })

      const csvContent =
        "ID Orden,Cliente,Partido,Fecha Partido,Zona,Boletos,Total MXN,Estado,Método Pago,Fecha Pago,Fecha Compra\n" +
        rows.join("\n")

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="reporte-alacranes-${period}-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      })
    }

    // --- Respuesta JSON ---
    return NextResponse.json({
      success: true,
      period,
      from: fromISO,
      to: now.toISOString(),
      stats: {
        totalRevenue,
        totalTickets: totalTickets || 0,
        totalOrders: paidOrders?.length || 0,
        avgOrderValue: Math.round(avgOrderValue),
        newUsers: totalUsers || 0,
      },
      salesByEvent,
      salesByZone,
    })
  } catch (err) {
    console.error("Admin reportes error:", err)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
