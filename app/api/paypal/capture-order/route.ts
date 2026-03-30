/**
 * app/api/paypal/capture-order/route.ts
 * Captura el pago de PayPal y genera los boletos con QR.
 * Llamar SOLO cuando el usuario aprueba el pago en el popup de PayPal.
 *
 * POST /api/paypal/capture-order
 * Header: Idempotency-Key: <uuid>
 * Body: { paypalOrderId, orderId }
 */
import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { withIdempotency } from "@/lib/idempotency"
import { capturePayPalOrder, PAYPAL_CONFIGURED } from "@/lib/paypal"

export async function POST(request: NextRequest) {
  return withIdempotency(request, async () => {
    try {
      const supabase = await createServerSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 })
      }

      if (!PAYPAL_CONFIGURED) {
        return NextResponse.json({ error: "PayPal no configurado" }, { status: 503 })
      }

      const { paypalOrderId, orderId } = await request.json()

      if (!paypalOrderId || !orderId) {
        return NextResponse.json(
          { error: "paypalOrderId y orderId son requeridos" },
          { status: 400 }
        )
      }

      // Verificar que la orden pertenece al usuario y está pendiente
      const { data: order, error: orderFetchError } = await supabaseAdmin
        .from("orders")
        .select("id, status, paypal_order_id, user_id, total_amount")
        .eq("id", orderId)
        .eq("user_id", user.id)
        .single()

      if (orderFetchError || !order) {
        return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 })
      }

      if (order.status === "paid") {
        return NextResponse.json(
          { success: true, message: "Esta orden ya fue pagada", alreadyPaid: true },
          { status: 200 }
        )
      }

      if (order.status !== "pending") {
        return NextResponse.json(
          { error: "No se puede procesar esta orden" },
          { status: 400 }
        )
      }

      // Capturar el pago en PayPal
      const { status: paypalStatus, captureId } = await capturePayPalOrder(paypalOrderId)

      if (paypalStatus !== "COMPLETED") {
        return NextResponse.json(
          { error: `Pago no completado. Estado PayPal: ${paypalStatus}` },
          { status: 402 }
        )
      }

      // Obtener items del carrito del usuario
      const { data: cartItems } = await supabaseAdmin
        .from("cart_items")
        .select(`
          id, quantity, unit_price, zone_id, match_id,
          zone:zones (id, name, zone_key, gate),
          match:matches (id, match_date, match_time,
            home_team:teams!matches_home_team_id_fkey (name),
            away_team:teams!matches_away_team_id_fkey (name))
        `)
        .eq("user_id", user.id)

      if (!cartItems || cartItems.length === 0) {
        return NextResponse.json({ error: "Carrito vacío" }, { status: 400 })
      }

      // Generar boletos individuales con QR
      const ticketsToInsert: Array<Record<string, unknown>> = []

      for (const item of cartItems) {
        const zone = item.zone as unknown as { id: string; name: string; zone_key: string; gate: string }
        const match = item.match as unknown as {
          id: string; match_date: string; match_time: string;
          home_team: { name: string }; away_team: { name: string }
        }

        for (let i = 0; i < item.quantity; i++) {
          const ticketId = crypto.randomUUID()
          // El QR contiene: ticketId|matchId|zoneId|userId — payload corto para validación en taquilla
          // Se guarda el payload de texto plano; el QR visual se genera en el frontend
          const qrPayload = `TKT:${ticketId}|MTH:${match.id}|ZN:${zone.id}|USR:${user.id}`

          ticketsToInsert.push({
            id: ticketId,
            order_id: orderId,
            match_id: item.match_id,
            zone_id: item.zone_id,
            seat_id: null, // zona general sin asiento fijo
            user_id: user.id,
            price: item.unit_price,
            status: "activo",
            qr_code: qrPayload, // payload corto — el QR visual se renderiza en el cliente
          })
        }

        // Decrementar inventario disponible
        await supabaseAdmin.rpc("decrement_inventory", {
          p_match_id: item.match_id,
          p_zone_id: item.zone_id,
          p_quantity: item.quantity,
        })
      }

      // Insertar todos los boletos
      console.log("Insertando boletos:", JSON.stringify(ticketsToInsert.map(t => ({
        id: t.id, order_id: t.order_id, match_id: t.match_id, zone_id: t.zone_id,
        user_id: t.user_id, status: t.status, qr_code_length: String(t.qr_code).length
      }))))

      const { error: ticketInsertError } = await supabaseAdmin
        .from("tickets")
        .insert(ticketsToInsert)

      if (ticketInsertError) {
        console.error("Ticket insert error (código):", ticketInsertError.code)
        console.error("Ticket insert error (mensaje):", ticketInsertError.message)
        console.error("Ticket insert error (detalle):", ticketInsertError.details)
        console.error("Ticket insert error (hint):", ticketInsertError.hint)
        return NextResponse.json(
          { error: "Error al generar los boletos", detail: ticketInsertError.message },
          { status: 500 }
        )
      }

      // Marcar orden como pagada
      await supabaseAdmin
        .from("orders")
        .update({
          status: "paid",
          payment_ref: captureId,
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId)

      // Vaciar el carrito del usuario
      await supabaseAdmin
        .from("cart_items")
        .delete()
        .eq("user_id", user.id)

      return NextResponse.json({
        success: true,
        message: "¡Pago realizado! Tus boletos están listos.",
        orderId,
        paypalCaptureId: captureId,
        ticketsGenerated: ticketsToInsert.length,
      })
    } catch (err) {
      console.error("PayPal capture-order error:", err)
      return NextResponse.json(
        { error: "Error al procesar el pago" },
        { status: 500 }
      )
    }
  })
}
