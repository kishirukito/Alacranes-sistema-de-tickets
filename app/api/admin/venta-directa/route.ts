/**
 * app/api/admin/venta-directa/route.ts
 * Venta directa de boletos en taquilla — Admin (pago en efectivo).
 * La orden se registra a nombre del admin que realizó la venta.
 */
import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { supabaseAdmin, requireAdmin } from "@/lib/supabase-admin"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !(await requireAdmin(user.id))) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const body = await request.json()
    const { matchId, zoneId, inventoryId, quantity, pricePer, isCourtesy } = body

    if (!matchId || !zoneId || !inventoryId || !quantity || pricePer === undefined || pricePer === null) {
      return NextResponse.json(
        { error: "matchId, zoneId, inventoryId, quantity y pricePer son requeridos" },
        { status: 400 }
      )
    }

    if (quantity < 1 || quantity > 10) {
      return NextResponse.json(
        { error: "La cantidad debe ser entre 1 y 10 boletos" },
        { status: 400 }
      )
    }

    // Verificar disponibilidad
    const { data: inv, error: invErr } = await supabaseAdmin
      .from("match_zone_inventory")
      .select("available_seats")
      .eq("id", inventoryId)
      .single()

    if (invErr || !inv) {
      return NextResponse.json({ error: "Inventario no encontrado" }, { status: 404 })
    }

    if (inv.available_seats < quantity) {
      return NextResponse.json(
        { error: `Solo quedan ${inv.available_seats} lugares disponibles en esta zona` },
        { status: 409 }
      )
    }

    // Si es cortesía forzamos precio 0 independientemente de lo que venga
    const effectivePrice = isCourtesy ? 0 : Number(pricePer)
    const totalAmount = effectivePrice * quantity
    // La venta directa se registra a nombre del admin que realizó la venta
    const adminUserId = user.id

    // 1. Crear la orden
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: adminUserId,
        status: "paid",
        total_amount: totalAmount,
        payment_method: isCourtesy ? "courtesy" : "cash",
        payment_ref: isCourtesy
          ? `COURTESY-${Date.now()}-BY:${adminUserId.slice(0, 8)}`
          : `CASH-${Date.now()}-BY:${adminUserId.slice(0, 8)}`,
        paid_at: new Date().toISOString(),
      })
      .select("id")
      .single()

    if (orderErr || !order) {
      console.error("Error creando orden:", orderErr)
      return NextResponse.json({ error: "Error al crear la orden" }, { status: 500 })
    }

    // 2. Crear tickets con QR payload
    const ticketsToInsert = []
    for (let i = 0; i < quantity; i++) {
      const ticketId = crypto.randomUUID()
      const qrPayload = `TKT:${ticketId}|MTH:${matchId}|ZN:${zoneId}|USR:${adminUserId}`

      ticketsToInsert.push({
        id: ticketId,
        order_id: order.id,
        match_id: matchId,
        zone_id: zoneId,
        user_id: adminUserId,
        price: effectivePrice,   // $0.00 si es cortesía
        status: "activo",
        qr_code: qrPayload,
        created_at: new Date().toISOString(),
      })
    }

    const { error: ticketErr } = await supabaseAdmin
      .from("tickets")
      .insert(ticketsToInsert)

    if (ticketErr) {
      console.error("Error creando tickets:", ticketErr)
      await supabaseAdmin.from("orders").delete().eq("id", order.id)
      return NextResponse.json({ error: "Error al crear los boletos" }, { status: 500 })
    }

    // 3. Descontar inventario
    const { error: decrErr } = await supabaseAdmin
      .from("match_zone_inventory")
      .update({ available_seats: inv.available_seats - quantity })
      .eq("id", inventoryId)

    if (decrErr) {
      console.error("Error actualizando inventario:", decrErr)
    }

    return NextResponse.json({
      success: true,
      message: `${quantity} boleto${quantity > 1 ? "s" : ""} registrado${quantity > 1 ? "s" : ""} correctamente`,
      data: {
        orderId: order.id,
        tickets: ticketsToInsert.map((t) => ({ id: t.id, qrCode: t.qr_code })),
        total: totalAmount,
      },
    })
  } catch (err) {
    console.error("Venta directa error:", err)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
