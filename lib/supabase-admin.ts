/**
 * lib/supabase-admin.ts
 * Cliente Supabase con SERVICE ROLE para uso EXCLUSIVO en el servidor.
 * Bypassa RLS — NUNCA usar en Client Components ni exponer al cliente.
 * Usar solo en Route Handlers (app/api/**) y Server Actions.
 */
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY"
  )
}

/**
 * Cliente admin con service_role — acceso total sin restricciones RLS.
 * Singleton para no crear múltiples instancias en cada request.
 */
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

/**
 * Verifica si el usuario autenticado tiene rol de admin.
 * Usar en todos los endpoints de /api/admin/** para proteger el acceso.
 */
export async function requireAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single()

  if (error || !data) return false
  return data.role === "admin"
}

/**
 * Verifica si el usuario autenticado tiene rol de admin o staff.
 */
export async function requireStaff(userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single()

  if (error || !data) return false
  return ["admin", "staff"].includes(data.role)
}
