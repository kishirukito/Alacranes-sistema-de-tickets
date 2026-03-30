/**
 * app/api/admin/ventas/route.ts
 * Reporte de ventas — Admin.
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
    const period = searchParams.get("period") || "all"
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const offset = (page - 1) * limit

    let query = supabaseAdmin
      .from("orders")
      .select(`
        id,
        status,
        total_amount,
        payment_method,
        payment_ref,
        paid_at,
        created_at,
        user:profiles (full_name),
        tickets (
          id,
          match:matches (
            id,
            match_date,
            home_team:teams!matches_home_team_id_fkey (name, short_name),
            away_team:teams!matches_away_team_id_fkey (name, short_name),
            venue:venues (name)
          )
        )
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    // Filtrar por período
    if (period !== "all") {
      let fromDate: Date
      let toDate: Date | null = null

      // Formato YYYY-MM (ej: "2026-03")
      if (/^\d{4}-\d{2}$/.test(period)) {
        const [year, month] = period.split("-").map(Number)
        fromDate = new Date(year, month - 1, 1)
        toDate = new Date(year, month, 1) // primer día del mes siguiente
      } else if (period === "today") {
        const now = new Date()
        fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      } else if (period === "week") {
        fromDate = new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000)
      } else if (period === "month") {
        const now = new Date()
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1)
      } else {
        fromDate = new Date(0)
      }

      query = query.gte("created_at", fromDate.toISOString())
      if (toDate) {
        query = query.lt("created_at", toDate.toISOString())
      }
    }

    // Filtrar por evento (matchId) — obtener order_ids que tengan tickets del partido
    const eventFilter = searchParams.get("event")
    if (eventFilter && eventFilter !== "all") {
      const { data: matchTickets } = await supabaseAdmin
        .from("tickets")
        .select("order_id")
        .eq("match_id", eventFilter)
      
      const orderIds = [...new Set((matchTickets || []).map((t) => t.order_id))]
      if (orderIds.length === 0) {
        // No hay ventas para ese evento → devolver vacío
        return NextResponse.json({
          success: true,
          data: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        })
      }
      query = query.in("id", orderIds)
    }

    const { data: orders, count, error } = await query

    if (error) {
      console.error("Ventas fetch error:", error)
      return NextResponse.json(
        { error: "Error al obtener ventas" },
        { status: 500 }
      )
    }

    const formatted = (orders || []).map((order) => {
      const tickets = order.tickets as unknown as Array<{
        id: string;
        match: {
          id: string; match_date: string;
          home_team: { name: string; short_name: string };
          away_team: { name: string; short_name: string };
          venue: { name: string }
        }
      }>

      const firstTicket = tickets?.[0]
      const match = firstTicket?.match
      const profile = order.user as unknown as { full_name: string }

      const statusMap: Record<string, string> = {
        paid: "Completada",
        pending: "Pendiente",
        cancelled: "Cancelada",
        refunded: "Reembolsada",
      }

      return {
        id: order.id.slice(0, 8).toUpperCase(),
        orderId: order.id,
        event: match
          ? `${match.home_team?.name} vs ${match.away_team?.name}`
          : "—",
        venue: match?.venue?.name || "—",
        date: order.created_at
          ? new Date(order.created_at).toLocaleDateString("es-MX")
          : "—",
        tickets: tickets?.length || 0,
        total: order.total_amount,
        status: statusMap[order.status] || order.status,
        paymentMethod: order.payment_method || "—",
        customer: profile?.full_name || "—",
        paidAt: order.paid_at || null,
      }
    })

    return NextResponse.json({
      success: true,
      data: formatted,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (err) {
    console.error("Ventas API error:", err)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
