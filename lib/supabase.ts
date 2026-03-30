/**
 * lib/supabase.ts
 * Cliente Supabase para uso en el lado del cliente (Client Components).
 * Usa las variables públicas NEXT_PUBLIC_.
 */
import { createBrowserClient } from "@supabase/ssr"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

// Singleton para uso directo
export const supabase = createClient()
