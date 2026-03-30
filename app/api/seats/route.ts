/**
 * app/api/seats/route.ts
 * Zonas y disponibilidad de asientos desde Supabase.
 * GET /api/seats?matchId=<uuid>&zone=<zone_key>
 * POST /api/seats — Reserva temporal (con idempotencia)
 */
import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { withIdempotency } from "@/lib/idempotency"

// GET — Zonas con disponibilidad para un partido
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const matchId = searchParams.get("matchId")
    const zoneKey = searchParams.get("zone")

    if (!matchId) {
      return NextResponse.json(
        { error: "matchId es requerido" },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // Obtener inventario de zonas para el partido
    const { data: inventory, error } = await supabase
      .from("match_zone_inventory")
      .select(`
        id,
        available_seats,
        price_override,
        zone:zones (
          id,
          zone_key,
          name,
          price,
          total_seats,
          color_hex,
          gate
        )
      `)
      .eq("match_id", matchId)

    if (error) {
      console.error("Error fetching seats:", error)
      return NextResponse.json(
        { error: "Error al obtener disponibilidad" },
        { status: 500 }
      )
    }

    // Determinar fuente de datos: inventario real o todas las zonas directamente
    type ZoneSource = {
      inventoryId: string | null
      zoneId: string
      zoneKey: string
      zoneName: string
      price: number
      totalSeats: number
      colorHex: string | null
      gate: string | null
      priceOverride: number | null
    }

    let zoneSources: ZoneSource[] = []

    if (inventory && inventory.length > 0) {
      // Hay inventario para este partido
      zoneSources = inventory.map((inv) => {
        const zone = inv.zone as unknown as {
          id: string; zone_key: string; name: string; price: number;
          total_seats: number; color_hex?: string | null; gate?: string | null
        }
        return {
          inventoryId: inv.id,
          zoneId: zone.id,
          zoneKey: zone.zone_key,
          zoneName: zone.name,
          price: inv.price_override ?? zone.price,
          totalSeats: zone.total_seats,
          colorHex: zone.color_hex ?? null,
          gate: zone.gate ?? null,
          priceOverride: inv.price_override,
        }
      })
    } else {
      // Sin inventario: traer todas las zonas con capacidad completa
      const { data: allZones } = await supabase
        .from("zones")
        .select("id, zone_key, name, price, total_seats, color_hex, gate")
        .order("name")
      zoneSources = (allZones || []).map((z) => ({
        inventoryId: null,
        zoneId: z.id,
        zoneKey: z.zone_key,
        zoneName: z.name,
        price: z.price,
        totalSeats: z.total_seats,
        colorHex: z.color_hex ?? null,
        gate: z.gate ?? null,
        priceOverride: null,
      }))
    }

    // Boletos vendidos reales por zona
    const soldByZone: Record<string, number> = {}
    if (zoneSources.length > 0) {
      const { data: ticketRows } = await supabase
        .from("tickets")
        .select("zone_id")
        .eq("match_id", matchId)
        .in("zone_id", zoneSources.map(z => z.zoneId))
        .in("status", ["activo", "usado"])
      ;(ticketRows || []).forEach((t) => {
        soldByZone[t.zone_id] = (soldByZone[t.zone_id] || 0) + 1
      })
    }

    const zones = zoneSources.map((z) => {
      const realSold = soldByZone[z.zoneId] || 0
      const available = Math.max(0, z.totalSeats - realSold)
      const pct = z.totalSeats > 0 ? available / z.totalSeats : 0

      return {
        id: z.zoneKey,
        zoneId: z.zoneId,
        inventoryId: z.inventoryId,
        name: z.zoneName,
        description: `Zona ${z.zoneName} — Puerta ${z.gate || "A"}`,
        price: z.price,
        childPrice: Math.round(z.price * 0.5),
        color: z.colorHex || "#D32F2F",
        availableSeats: available,
        soldSeats: realSold,
        totalSeats: z.totalSeats,
        gate: z.gate || "A",
        status:
          available === 0
            ? "soldout"
            : pct < 0.15
            ? "limited"
            : "available",
      }
    })

    // Filtrar por zona específica si se pidió
    if (zoneKey) {
      const zone = zones.find((z) => z.id === zoneKey)
      if (!zone) {
        return NextResponse.json({ error: "Zona no encontrada" }, { status: 404 })
      }
      return NextResponse.json(zone)
    }

    const totalAvailable = zones.reduce((sum, z) => sum + z.availableSeats, 0)

    return NextResponse.json({ zones, totalAvailable })
  } catch (err) {
    console.error("Seats API error:", err)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}


// POST — Reserva temporal de asientos (15 min) con idempotencia
export async function POST(request: NextRequest) {
  return withIdempotency(request, async () => {
    try {
      const { matchId, zoneId, quantity } = await request.json()

      if (!matchId || !zoneId || !quantity) {
        return NextResponse.json(
          { error: "matchId, zoneId y quantity son requeridos" },
          { status: 400 }
        )
      }

      if (quantity < 1 || quantity > 8) {
        return NextResponse.json(
          { error: "Cantidad debe ser entre 1 y 8 boletos" },
          { status: 400 }
        )
      }

      const supabase = await createServerSupabaseClient()

      // Verificar sesión del usuario
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json(
          { error: "Debes iniciar sesión para reservar" },
          { status: 401 }
        )
      }

      // Verificar disponibilidad en tiempo real
      const { data: inv, error: invError } = await supabase
        .from("match_zone_inventory")
        .select("id, available_seats, zone:zones(id, zone_key, name, price)")
        .eq("match_id", matchId)
        .eq("zone_id", zoneId)
        .single()

      if (invError || !inv) {
        return NextResponse.json(
          { error: "Inventario no encontrado" },
          { status: 404 }
        )
      }

      if (inv.available_seats < quantity) {
        return NextResponse.json(
          {
            error: `Solo quedan ${inv.available_seats} lugares disponibles en esta zona`,
          },
          { status: 400 }
        )
      }

      const zone = inv.zone as unknown as { id: string; zone_key: string; name: string; price: number }

      // Añadir al carrito en BD (reserva persistente con expiración de 30 min)
      const { error: cartError } = await supabase
        .from("cart_items")
        .upsert({
          user_id: user.id,
          match_id: matchId,
          zone_id: zoneId,
          quantity,
          unit_price: zone.price,
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        })

      if (cartError) {
        console.error("Cart upsert error:", cartError)
        return NextResponse.json(
          { error: "Error al reservar asientos" },
          { status: 500 }
        )
      }

      const reservationId = crypto.randomUUID()
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000)

      return NextResponse.json({
        success: true,
        reservationId,
        matchId,
        zoneKey: zone.zone_key,
        zoneName: zone.name,
        quantity,
        unitPrice: zone.price,
        totalPrice: zone.price * quantity,
        expiresAt: expiresAt.toISOString(),
        message: "Asientos reservados temporalmente por 30 minutos",
      })
    } catch (err) {
      console.error("Seats POST error:", err)
      return NextResponse.json(
        { error: "Error interno del servidor" },
        { status: 500 }
      )
    }
  })
}
