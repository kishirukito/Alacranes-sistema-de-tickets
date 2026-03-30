/**
 * lib/idempotency.ts
 * Control de idempotencia para operaciones críticas (pagos, reservas).
 *
 * USO:
 *  - El cliente envía el header: Idempotency-Key: <uuid-único-por-operación>
 *  - Si la clave ya existe en BD → devuelve la respuesta original cacheada
 *  - Si no existe → ejecuta la operación y guarda el resultado
 *
 * Tabla requerida en Supabase: idempotency_keys (ver schema_additions.sql)
 */
import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "./supabase-admin"

export const IDEMPOTENCY_TTL_HOURS = 24

/**
 * Verifica si existe una respuesta cacheada para esta clave de idempotencia.
 * @returns La respuesta cacheada si existe, null si no.
 */
export async function checkIdempotency(
  key: string
): Promise<{ response: Record<string, unknown>; statusCode: number } | null> {
  const { data, error } = await supabaseAdmin
    .from("idempotency_keys")
    .select("response, status_code, expires_at")
    .eq("key", key)
    .single()

  if (error || !data) return null

  // Verificar que no haya expirado
  if (new Date(data.expires_at) < new Date()) {
    // Limpiar clave expirada
    await supabaseAdmin.from("idempotency_keys").delete().eq("key", key)
    return null
  }

  return { response: data.response, statusCode: data.status_code }
}

/**
 * Guarda la respuesta de una operación para futuras peticiones con la misma clave.
 */
export async function saveIdempotencyResponse(
  key: string,
  response: Record<string, unknown>,
  statusCode: number,
  userId?: string
): Promise<void> {
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + IDEMPOTENCY_TTL_HOURS)

  await supabaseAdmin.from("idempotency_keys").upsert({
    key,
    response,
    status_code: statusCode,
    user_id: userId || null,
    expires_at: expiresAt.toISOString(),
  })
}

/**
 * Helper que extrae el Idempotency-Key del header de la request.
 * @returns El valor del header o null si no existe.
 */
export function getIdempotencyKey(request: NextRequest): string | null {
  return request.headers.get("Idempotency-Key")
}

/**
 * Wrapper completo de idempotencia para Route Handlers.
 *
 * @example
 * export async function POST(request: NextRequest) {
 *   return withIdempotency(request, async () => {
 *     // tu lógica aquí...
 *     return NextResponse.json({ success: true })
 *   })
 * }
 */
export async function withIdempotency(
  request: NextRequest,
  handler: () => Promise<NextResponse>,
  userId?: string
): Promise<NextResponse> {
  const idempotencyKey = getIdempotencyKey(request)

  // Si hay clave, verificar cache primero
  if (idempotencyKey) {
    const cached = await checkIdempotency(idempotencyKey)
    if (cached) {
      // Devolver respuesta cacheada con header indicativo
      return NextResponse.json(cached.response, {
        status: cached.statusCode,
        headers: {
          "Idempotency-Replayed": "true",
        },
      })
    }
  }

  // Ejecutar la operación original
  const response = await handler()

  // Guardar en cache si hay clave de idempotencia
  if (idempotencyKey) {
    try {
      const responseBody = await response.clone().json()
      await saveIdempotencyResponse(
        idempotencyKey,
        responseBody,
        response.status,
        userId
      )
    } catch {
      // Si no se puede serializar, ignorar (ej. respuestas no-JSON)
    }
  }

  return response
}
