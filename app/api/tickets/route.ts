/**
 * app/api/tickets/route.ts
 * Boletos del usuario autenticado desde Supabase.
 *
 * Usa supabaseAdmin para los joins de datos (matches, zones, venues, teams)
 * ya que RLS en matches solo muestra partidos publicados, pero los boletos
 * comprados deben verse aunque el partido no esté publicado.
 */
import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación con el cliente del usuario
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") // activo | usado | expirado

    // Usar supabaseAdmin para bypasear RLS en los joins de match/zone/etc.
    let query = supabaseAdmin
      .from("tickets")
      .select(`
        id,
        price,
        status,
        qr_code,
        used_at,
        created_at,
        order:orders (
          id,
          created_at,
          payment_method,
          total_amount
        ),
        match:matches (
          id,
          match_date,
          match_time,
          home_team:teams!matches_home_team_id_fkey (name, logo_url),
          away_team:teams!matches_away_team_id_fkey (name, logo_url),
          venue:venues (name, address)
        ),
        zone:zones (
          id,
          name,
          zone_key,
          gate
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (status) {
      query = query.eq("status", status)
    }

    const { data: tickets, error } = await query

    if (error) {
      console.error("Tickets fetch error:", error)
      return NextResponse.json(
        { error: "Error al obtener los boletos" },
        { status: 500 }
      )
    }

    const formatted = (tickets || []).map((t) => {
      const order = t.order as unknown as { id: string; created_at: string; payment_method: string; total_amount: number } | null
      const match = t.match as unknown as {
        id: string; match_date: string; match_time: string;
        home_team: { name: string; logo_url?: string };
        away_team: { name: string; logo_url?: string };
        venue: { name: string; address?: string }
      } | null
      const zone = t.zone as unknown as { id: string; name: string; zone_key: string; gate?: string } | null

      // Formatear fecha del evento de forma segura
      let matchDateFormatted = "Fecha no disponible"
      if (match?.match_date) {
        const d = new Date(match.match_date + "T00:00:00")
        if (!isNaN(d.getTime())) {
          matchDateFormatted = d.toLocaleDateString("es-MX", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })
        }
      }

      // Formatear fecha de compra de forma segura
      let orderDateFormatted = ""
      if (order?.created_at) {
        const d = new Date(order.created_at)
        if (!isNaN(d.getTime())) {
          orderDateFormatted = d.toLocaleDateString("es-MX", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })
        }
      }

      return {
        id: t.id,
        orderId: order?.id || "",
        orderDate: orderDateFormatted,
        homeTeam: match?.home_team?.name || "Alacranes de Durango",
        awayTeam: match?.away_team?.name || "Visitante",
        matchDate: matchDateFormatted,
        matchTime: match?.match_time ? `${match.match_time.slice(0, 5)} HRS` : "20:00 HRS",
        venue: match?.venue?.name || "Estadio Zarco",
        zone: zone?.name || "General",
        gate: zone?.gate || "A",
        section: zone?.zone_key?.toUpperCase() || "GRAL",
        seat: "GRAL",
        price: Number(t.price) || 0,
        status: t.status as "activo" | "usado" | "expirado" | "cancelado",
        qrCode: t.qr_code || "",
        usedAt: t.used_at || null,
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        tickets: formatted,
        total: formatted.length,
        byStatus: {
          activo: formatted.filter((t) => t.status === "activo").length,
          usado: formatted.filter((t) => t.status === "usado").length,
          expirado: formatted.filter((t) => t.status === "expirado").length,
        },
      },
    })
  } catch (err) {
    console.error("Tickets API error:", err)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
