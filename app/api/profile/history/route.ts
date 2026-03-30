/**
 * app/api/profile/history/route.ts
 * Historial de compras del usuario autenticado desde Supabase.
 */
import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function GET() {
  try {
    // Verificar sesión con el cliente normal (lee cookies)
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    // Usar supabaseAdmin para la consulta — bypasea RLS y evita recursión
    const { data: orders, error } = await supabaseAdmin
      .from("orders")
      .select(`
        id,
        status,
        total_amount,
        payment_method,
        paid_at,
        created_at,
        tickets (
          id,
          price,
          zone:zones (name),
          match:matches (
            id,
            match_date,
            home_team:teams!matches_home_team_id_fkey (name),
            away_team:teams!matches_away_team_id_fkey (name)
          )
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      console.error("History fetch error:", error)
      return NextResponse.json(
        { error: "Error al obtener historial" },
        { status: 500 }
      )
    }

    const history = (orders || []).map((order) => {
      const tickets = order.tickets as unknown as Array<{
        id: string; price: number;
        zone: { name: string };
        match: {
          id: string; match_date: string;
          home_team: { name: string };
          away_team: { name: string }
        }
      }>

      const firstTicket = tickets?.[0]
      const match = firstTicket?.match

      const orderDate = new Date(order.created_at)

      return {
        id: order.id,
        type: "boleto" as const,
        description: match
          ? `${match.home_team?.name} vs ${match.away_team?.name} — ${firstTicket?.zone?.name}`
          : "Compra de boletos",
        date: orderDate.toLocaleDateString("es-MX", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        quantity: tickets?.length || 0,
        total: order.total_amount,
        status:
          order.status === "paid"
            ? "completado"
            : order.status === "pending"
            ? "pendiente"
            : "cancelado",
        paymentMethod: order.payment_method || "",
        paidAt: order.paid_at || null,
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        history,
        total: history.length,
      },
    })
  } catch (err) {
    console.error("History API error:", err)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
