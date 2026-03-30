/**
 * app/api/admin/catalogs/route.ts
 * Datos de catálogo para selects del panel admin: teams, venues, zones.
 */
import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { supabaseAdmin, requireAdmin } from "@/lib/supabase-admin"

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !(await requireAdmin(user.id))) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const [
      { data: teams },
      { data: venues },
      { data: zones },
    ] = await Promise.all([
      supabaseAdmin.from("teams").select("id, name, short_name").order("name"),
      supabaseAdmin.from("venues").select("id, name, city").order("name"),
      supabaseAdmin.from("zones").select("id, zone_key, name, price, total_seats").order("name"),
    ])

    return NextResponse.json({
      success: true,
      teams: (teams || []).map(t => ({ id: t.id, name: t.name, shortName: t.short_name })),
      venues: (venues || []).map(v => ({ id: v.id, name: v.name, city: v.city })),
      zones: (zones || []).map(z => ({ id: z.id, zoneKey: z.zone_key, name: z.name, price: z.price, totalSeats: z.total_seats })),
    })
  } catch (err) {
    console.error("Catalogs error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
