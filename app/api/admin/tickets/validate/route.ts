/**
 * app/api/admin/tickets/validate/route.ts
 * Valida un boleto escaneado en taquilla y lo marca como 'usado'.
 * POST /api/admin/tickets/validate
 *
 * Body: { qrPayload: string }
 * Requiere rol 'admin' o 'staff'.
 */
import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { parseTicketQR } from "@/lib/qr"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    // Verificar que sea admin o staff
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile || !["admin", "staff"].includes(profile.role)) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const body = await request.json()
    const { qrPayload } = body

    if (!qrPayload || typeof qrPayload !== "string") {
      return NextResponse.json({ error: "QR inválido" }, { status: 400 })
    }

    // Parsear el QR
    const parsed = parseTicketQR(qrPayload)
    if (!parsed) {
      return NextResponse.json({
        valid: false,
        reason: "qr_invalido",
        message: "El código QR no es reconocido por el sistema.",
      }, { status: 200 })
    }

    const { ticketId, matchId, zoneId, userId } = parsed

    // Buscar el boleto en la DB
    const { data: ticket, error: fetchError } = await supabaseAdmin
      .from("tickets")
      .select(`
        id, status, used_at, price,
        match:matches (
          id, match_date, match_time,
          home_team:teams!matches_home_team_id_fkey (name),
          away_team:teams!matches_away_team_id_fkey (name),
          venue:venues (name)
        ),
        zone:zones (name, gate),
        owner:profiles (full_name)
      `)
      .eq("id", ticketId)
      .eq("match_id", matchId)
      .eq("zone_id", zoneId)
      .eq("user_id", userId)
      .single()

    if (fetchError || !ticket) {
      return NextResponse.json({
        valid: false,
        reason: "no_encontrado",
        message: "No se encontró el boleto en el sistema.",
      }, { status: 200 })
    }

    // Extraer datos del boleto para la respuesta
    const match = ticket.match as unknown as {
      id: string
      match_date: string
      match_time: string
      home_team: { name: string }
      away_team: { name: string }
      venue: { name: string }
    }
    const zone = ticket.zone as unknown as { name: string; gate: string }
    const owner = ticket.owner as unknown as { full_name: string }

    const ticketInfo = {
      id: ticket.id,
      status: ticket.status,
      price: ticket.price,
      matchTitle: `${match?.home_team?.name} vs ${match?.away_team?.name}`,
      matchDate: match?.match_date,
      matchTime: match?.match_time?.slice(0, 5),
      venue: match?.venue?.name,
      zone: zone?.name,
      gate: zone?.gate,
      ownerName: owner?.full_name || "Usuario",
      usedAt: ticket.used_at,
    }

    // --- Validaciones de estado ---

    if (ticket.status === "usado") {
      return NextResponse.json({
        valid: false,
        reason: "ya_usado",
        message: "Este boleto ya fue usado.",
        usedAt: ticket.used_at,
        ticket: ticketInfo,
      }, { status: 200 })
    }

    if (ticket.status === "cancelado") {
      return NextResponse.json({
        valid: false,
        reason: "cancelado",
        message: "Este boleto fue cancelado.",
        ticket: ticketInfo,
      }, { status: 200 })
    }

    if (ticket.status === "expirado") {
      return NextResponse.json({
        valid: false,
        reason: "expirado",
        message: "Este boleto ha expirado.",
        ticket: ticketInfo,
      }, { status: 200 })
    }

    // Verificar que el partido sea hoy (±1 día de tolerancia)
    const matchDate = new Date(match.match_date + "T00:00:00")
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diffDays = Math.abs(
      (matchDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (diffDays > 1) {
      return NextResponse.json({
        valid: false,
        reason: "fecha_incorrecta",
        message: `Este boleto es para el ${matchDate.toLocaleDateString("es-MX", { day: "numeric", month: "long" })}. No corresponde a hoy.`,
        ticket: ticketInfo,
      }, { status: 200 })
    }

    const usedAt = new Date().toISOString()

    const { error: updateError } = await supabaseAdmin
      .from("tickets")
      .update({ status: "usado", used_at: usedAt })
      .eq("id", ticketId)

    if (updateError) {
      console.error("Error al marcar boleto como usado:", updateError)
      return NextResponse.json(
        { error: "Error al actualizar el boleto" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      valid: true,
      reason: "valido",
      message: "Boleto válido. Acceso permitido.",
      usedAt,
      ticket: { ...ticketInfo, status: "usado", usedAt },
    }, { status: 200 })

  } catch (err) {
    console.error("Validate ticket error:", err)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
