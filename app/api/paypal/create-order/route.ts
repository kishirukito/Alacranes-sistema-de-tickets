/**
 * app/api/paypal/create-order/route.ts
 * Crea una orden de pago en PayPal Sandbox.
 * Requiere: PAYPAL_CLIENT_ID y PAYPAL_CLIENT_SECRET en .env.local
 *
 * POST /api/paypal/create-order
 * Header: Idempotency-Key: <uuid>
 * Body: { cartItems: [...] }
 */
import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { withIdempotency } from "@/lib/idempotency"
import { createPayPalOrder, PAYPAL_CONFIGURED } from "@/lib/paypal"

export async function POST(request: NextRequest) {
  return withIdempotency(request, async () => {
    try {
      const supabase = await createServerSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 })
      }

      // Verificar que PayPal esté configurado
      if (!PAYPAL_CONFIGURED) {
        return NextResponse.json(
          {
            error: "PayPal no configurado",
            message:
              "Añade PAYPAL_CLIENT_ID y PAYPAL_CLIENT_SECRET al .env.local. " +
              "Instrucciones en lib/paypal.ts",
          },
          { status: 503 }
        )
      }

      // Obtener carrito actual del usuario desde Supabase
      const { data: cartItems, error: cartError } = await supabase
        .from("cart_items")
        .select(`
          id, quantity, unit_price,
          zone:zones (id, name, zone_key),
          match:matches (
            id, match_date,
            home_team:teams!matches_home_team_id_fkey (name),
            away_team:teams!matches_away_team_id_fkey (name)
          )
        `)
        .eq("user_id", user.id)
        .gt("expires_at", new Date().toISOString())

      if (cartError || !cartItems || cartItems.length === 0) {
        return NextResponse.json(
          { error: "El carrito está vacío o expirado" },
          { status: 400 }
        )
      }

      // Calcular totales
      const subtotal = cartItems.reduce(
        (sum, item) => sum + item.unit_price * item.quantity,
        0
      )
      const serviceFee = Math.round(subtotal * 0.05)
      const total = subtotal + serviceFee

      // Crear la orden en nuestra BD primero
      const { data: order, error: orderError } = await supabaseAdmin
        .from("orders")
        .insert({
          user_id: user.id,
          status: "pending",
          total_amount: total,
          payment_method: "paypal",
        })
        .select()
        .single()

      if (orderError || !order) {
        return NextResponse.json({ error: "Error al crear la orden" }, { status: 500 })
      }

      // Preparar items para PayPal
      const paypalItems = cartItems.map((item) => {
        const zone = item.zone as unknown as { id: string; name: string; zone_key: string }
        const match = item.match as unknown as {
          id: string; match_date: string;
          home_team: { name: string }; away_team: { name: string }
        }
        return {
          name: `${match?.home_team?.name} vs ${match?.away_team?.name} — ${zone?.name}`,
          quantity: item.quantity,
          unitAmount: item.unit_price,
          description: `Zona ${zone?.zone_key} — ${new Date(match?.match_date + "T00:00:00").toLocaleDateString("es-MX")}`,
        }
      })

      // Añadir cargo de servicio como item separado
      paypalItems.push({
        name: "Cargo por Servicio",
        quantity: 1,
        unitAmount: serviceFee,
        description: "Cargo de procesamiento (5%)",
      })

      // Obtener URL base desde el request (funciona en cualquier dominio)
      const origin = request.headers.get("origin") ||
        request.headers.get("x-forwarded-host")
          ? `https://${request.headers.get("x-forwarded-host")}`
          : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

      // Crear orden en PayPal
      const { paypalOrderId, approveUrl } = await createPayPalOrder(
        paypalItems,
        total,
        "MXN",
        order.id,
        origin
      )

      // Guardar paypal_order_id en nuestra orden
      await supabaseAdmin
        .from("orders")
        .update({ paypal_order_id: paypalOrderId })
        .eq("id", order.id)

      return NextResponse.json({
        success: true,
        orderId: order.id,
        paypalOrderId,
        approveUrl,
        summary: {
          subtotal,
          serviceFee,
          total,
          currency: "MXN",
        },
      })
    } catch (err) {
      console.error("PayPal create-order error:", err)
      return NextResponse.json(
        { error: "Error al crear la orden de PayPal" },
        { status: 500 }
      )
    }
  })
}
