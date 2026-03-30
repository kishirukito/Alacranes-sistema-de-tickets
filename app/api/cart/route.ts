/**
 * app/api/cart/route.ts
 * Carrito de compra persistente en Supabase.
 * Requiere sesión de usuario autenticado.
 */
import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"

// GET /api/cart — Obtener carrito del usuario autenticado
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    // Limpiar items expirados primero
    await supabase
      .from("cart_items")
      .delete()
      .eq("user_id", user.id)
      .lt("expires_at", new Date().toISOString())

    // ── 1. Obtener los cart_items del usuario (anon client con RLS por user_id) ──
    const { data: rawItems, error } = await supabase
      .from("cart_items")
      .select("id, match_id, zone_id, quantity, unit_price, expires_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("[cart GET] cart_items error:", error)
      return NextResponse.json({ error: "Error al obtener el carrito" }, { status: 500 })
    }

    console.log(`[cart GET] rawItems count=${rawItems?.length ?? 0}`)

    if (!rawItems || rawItems.length === 0) {
      return NextResponse.json({ items: [], subtotal: 0, serviceFee: 0, total: 0, itemCount: 0 })
    }

    // ── 2. Recopilar IDs únicos ────────────────────────────────────────────────
    const matchIds = [...new Set(rawItems.map(i => i.match_id).filter(Boolean))]
    const zoneIds  = [...new Set(rawItems.map(i => i.zone_id).filter(Boolean))]

    // ── 3. Fetch matches with venue join (supabaseAdmin bypasses RLS) ─────────
    const { data: matchRows, error: matchErr } = await supabaseAdmin
      .from("matches")
      .select(`
        id,
        match_date,
        match_time,
        home_team_id,
        away_team_id,
        venue:venues ( name )
      `)
      .in("id", matchIds)

    if (matchErr) console.error("[cart GET] matches error:", matchErr)
    console.log(`[cart GET] matchRows count=${matchRows?.length ?? 0}`, matchIds)

    type MatchRow = {
      id: string; match_date: string; match_time: string;
      home_team_id: string; away_team_id: string;
      venue: { name: string }[] | null
    }
    const matchMap = new Map<string, MatchRow>()
    for (const m of matchRows || []) matchMap.set(m.id, m as unknown as MatchRow)


    // ── 4. Fetch zones ────────────────────────────────────────────────────────
    const { data: zoneRows, error: zoneErr } = await supabaseAdmin
      .from("zones")
      .select("id, zone_key, name, color_hex, gate")
      .in("id", zoneIds)

    if (zoneErr) console.error("[cart GET] zones error:", zoneErr)

    const zoneMap = new Map<string, { id: string; zone_key: string; name: string; color_hex?: string; gate?: string }>()
    for (const z of zoneRows || []) zoneMap.set(z.id, z)

    // ── 5. Fetch teams ────────────────────────────────────────────────────────
    const teamIds = [...new Set([
      ...(matchRows || []).map(m => m.home_team_id),
      ...(matchRows || []).map(m => m.away_team_id),
    ].filter(Boolean))]

    const { data: teamRows, error: teamErr } = await supabaseAdmin
      .from("teams")
      .select("id, name, short_name, logo_url")
      .in("id", teamIds)

    if (teamErr) console.error("[cart GET] teams error:", teamErr)

    const teamMap = new Map<string, { name: string; short_name: string; logo_url?: string }>()
    for (const t of teamRows || []) teamMap.set(t.id, t)

    // ── 6. Ensamblar respuesta ────────────────────────────────────────────────
    const cartItems = rawItems.flatMap((item) => {
      const match = matchMap.get(item.match_id)
      if (!match) {
        console.warn(`[cart GET] match ${item.match_id} not found for cart_item ${item.id}`)
        return []
      }

      const zone     = zoneMap.get(item.zone_id)
      const homeTeam = teamMap.get(match.home_team_id)
      const awayTeam = teamMap.get(match.away_team_id)
      const matchDate = new Date(match.match_date + "T00:00:00")

      return [{
        id: item.id,
        matchId: match.id,
        matchTitle: `${homeTeam?.name ?? "Local"} vs. ${awayTeam?.name ?? "Visitante"}`,
        matchDate: matchDate.toLocaleDateString("es-MX", {
          weekday: "long",
          day: "numeric",
          month: "long",
        }) + ` — ${match.match_time?.slice(0, 5)} hrs`,
        venue: (match.venue as { name: string }[] | null)?.[0]?.name || "",
        zone: zone?.zone_key || "",
        zoneName: zone?.name || "",
        zoneColor: zone?.color_hex || "#D32F2F",
        gate: zone?.gate || "",
        price: item.unit_price,
        quantity: item.quantity,
        expiresAt: item.expires_at,
        homeTeamLogo: homeTeam?.logo_url || null,
        awayTeamLogo: awayTeam?.logo_url || null,
      }]
    })

    const subtotal   = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
    const serviceFee = Math.round(subtotal * 0.05)
    const total      = subtotal + serviceFee

    return NextResponse.json({
      items: cartItems,
      subtotal,
      serviceFee,
      total,
      itemCount: cartItems.reduce((sum, i) => sum + i.quantity, 0),
    })
  } catch (err) {
    console.error("Cart GET error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}



// POST /api/cart — Añadir item al carrito
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: "Debes iniciar sesión para agregar boletos al carrito" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { matchId, zoneId, quantity = 1 } = body

    if (!matchId || !zoneId) {
      return NextResponse.json(
        { error: "matchId y zoneId son requeridos" },
        { status: 400 }
      )
    }

    // ── 1. Obtener precio y capacidad ────────────────────────────────────────
    // Primero intento en match_zone_inventory (puede tener price_override)
    const { data: inv, error: invErr } = await supabase
      .from("match_zone_inventory")
      .select("price_override, zone:zones(price, total_seats)")
      .eq("match_id", matchId)
      .eq("zone_id", zoneId)
      .maybeSingle()   // maybeSingle: no falla si no existe

    if (invErr) {
      console.error("[cart POST] match_zone_inventory error:", invErr)
    }

    const zoneInfo = inv?.zone as unknown as { price: number; total_seats: number } | null

    // Si no hay registro en match_zone_inventory, consultar directamente zones
    let totalSeats: number = zoneInfo?.total_seats ?? 0
    let unitPrice: number = inv?.price_override ?? zoneInfo?.price ?? 0

    if (!inv) {
      const { data: zoneRow, error: zoneErr } = await supabase
        .from("zones")
        .select("price, total_seats")
        .eq("id", zoneId)
        .maybeSingle()

      if (zoneErr) console.error("[cart POST] zones fallback error:", zoneErr)

      totalSeats = zoneRow?.total_seats ?? 0
      unitPrice = zoneRow?.price ?? 0

      console.log(`[cart POST] No match_zone_inventory → zones fallback: totalSeats=${totalSeats}, price=${unitPrice}`)
    }

    console.log(`[cart POST] matchId=${matchId} zoneId=${zoneId} totalSeats=${totalSeats} unitPrice=${unitPrice}`)

    // ── 2. Disponibilidad real desde tickets ─────────────────────────────────
    const { count: soldCount, error: ticketsErr } = await supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .eq("match_id", matchId)
      .eq("zone_id", zoneId)
      .in("status", ["activo", "usado"])

    if (ticketsErr) console.error("[cart POST] tickets count error:", ticketsErr)

    const sold = soldCount ?? 0
    // Si no tenemos datos de capacidad (totalSeats=0), no bloquear
    const available = totalSeats > 0 ? Math.max(0, totalSeats - sold) : null

    console.log(`[cart POST] sold=${sold} available=${available ?? "sin cap"}`)

    // Solo bloquear si tenemos datos de capacidad Y no hay suficientes lugares
    if (available !== null && available < quantity) {
      return NextResponse.json(
        {
          error:
            available <= 0
              ? "Esta zona está agotada"
              : `Solo quedan ${available} lugares disponibles en esta zona`,
        },
        { status: 400 }
      )
    }

    // ── 3. Upsert en cart_items ──────────────────────────────────────────────
    const { data: existing } = await supabase
      .from("cart_items")
      .select("id, quantity")
      .eq("user_id", user.id)
      .eq("match_id", matchId)
      .eq("zone_id", zoneId)
      .maybeSingle()

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()

    if (existing) {
      const { error: updErr } = await supabase
        .from("cart_items")
        .update({
          quantity: existing.quantity + quantity,
          expires_at: expiresAt,
        })
        .eq("id", existing.id)

      if (updErr) {
        console.error("[cart POST] update error:", updErr)
        return NextResponse.json({ error: "Error al actualizar carrito" }, { status: 500 })
      }
    } else {
      const { error: insErr } = await supabase.from("cart_items").insert({
        user_id: user.id,
        match_id: matchId,
        zone_id: zoneId,
        quantity,
        unit_price: unitPrice,
        expires_at: expiresAt,
      })

      if (insErr) {
        console.error("[cart POST] insert error:", insErr)
        return NextResponse.json({ error: "Error al agregar al carrito" }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, message: "Añadido al carrito" })
  } catch (err) {
    console.error("Cart POST error:", err)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// PUT /api/cart — Actualizar cantidad de un item
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const { id, quantity } = await request.json()

    if (!id) {
      return NextResponse.json({ error: "id es requerido" }, { status: 400 })
    }

    if (quantity <= 0) {
      await supabase
        .from("cart_items")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id)
    } else {
      const { error } = await supabase
        .from("cart_items")
        .update({ quantity })
        .eq("id", id)
        .eq("user_id", user.id)

      if (error) {
        return NextResponse.json(
          { error: "Error al actualizar" },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Cart PUT error:", err)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// DELETE /api/cart?id=<uuid> — Eliminar item o vaciar carrito
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (id) {
      await supabase
        .from("cart_items")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id)
    } else {
      // Vaciar todo el carrito
      await supabase
        .from("cart_items")
        .delete()
        .eq("user_id", user.id)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Cart DELETE error:", err)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
