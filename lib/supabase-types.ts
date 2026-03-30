/**
 * lib/supabase-types.ts
 * Helper para castear respuestas de relaciones de Supabase a tipos seguros.
 * Supabase devuelve relaciones como `Json | unknown` que TypeScript strict rechaza.
 *
 * Uso:
 *   import { castAs } from "@/lib/supabase-types"
 *   const match = castAs<MatchRow>(ticket.match)
 */

/**
 * Castea un valor de relación de Supabase al tipo deseado.
 * Equivalente a un double-cast seguro: (value as unknown as T)
 */
export function castAs<T>(value: unknown): T {
  return value as T
}

// ─── Tipos comunes de respuesta Supabase ─────────────────────────────────────

export interface TeamRow {
  id: string
  name: string
  short_name: string
  logo_url?: string | null
  is_home_team?: boolean
}

export interface VenueRow {
  id: string
  name: string
  city: string
  address?: string | null
}

export interface ZoneRow {
  id: string
  zone_key: string
  name: string
  price: number
  total_seats: number
  color_hex?: string | null
  gate?: string | null
}

export interface MatchRow {
  id: string
  match_date: string
  match_time: string
  home_team?: TeamRow | null
  away_team?: TeamRow | null
  venue?: VenueRow | null
}

export interface OrderRow {
  id: string
  created_at: string
  total_amount: number
  payment_method?: string | null
  status?: string
}

export interface ZoneSimple {
  name: string
  zone_key?: string
  gate?: string | null
}

export interface MatchSimple {
  id: string
  match_date: string
  home_team?: { name: string } | null
  away_team?: { name: string } | null
}

export interface ProfileRow {
  full_name?: string | null
}

export interface InventoryRow {
  id: string
  available_seats: number
  price_override?: number | null
  zone?: ZoneRow | null
}
