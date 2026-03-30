/**
 * app/api/admin/discount-codes/route.ts
 * Gestión completa de códigos de descuento — Admin.
 * GET    /api/admin/discount-codes
 * POST   /api/admin/discount-codes — crear nuevo código
 * PUT    /api/admin/discount-codes — actualizar código existente
 * DELETE /api/admin/discount-codes?id=<uuid>
 */
import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { supabaseAdmin, requireAdmin } from "@/lib/supabase-admin"

// GET — Listar todos los códigos de descuento
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !(await requireAdmin(user.id))) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get("active") === "true"

    let query = supabaseAdmin
      .from("discount_codes")
      .select(`
        id, code, type, value, description,
        min_purchase, max_uses, current_uses,
        expires_at, is_active, created_at, updated_at,
        created_by:profiles(full_name)
      `)
      .order("created_at", { ascending: false })

    if (activeOnly) {
      query = query.eq("is_active", true)
    }

    const { data: codes, error } = await query
    if (error) {
      return NextResponse.json({ error: "Error al obtener cupones" }, { status: 500 })
    }

    const now = new Date()
    const formatted = (codes || []).map((c) => {
      const isExpired = c.expires_at ? new Date(c.expires_at) < now : false
      const isExhausted = c.max_uses !== null && c.current_uses >= c.max_uses
      const effectiveStatus = !c.is_active
        ? "inactivo"
        : isExpired
        ? "expirado"
        : isExhausted
        ? "agotado"
        : "activo"

      const creator = c.created_by as unknown as { full_name: string } | null

      return {
        id: c.id,
        code: c.code,
        type: c.type,
        value: c.value,
        description: c.description || "",
        minPurchase: c.min_purchase || 0,
        maxUses: c.max_uses,
        currentUses: c.current_uses,
        usesLeft: c.max_uses !== null ? c.max_uses - c.current_uses : null,
        expiresAt: c.expires_at,
        isActive: c.is_active,
        status: effectiveStatus,
        createdAt: c.created_at,
        createdBy: creator?.full_name || "Sistema",
      }
    })

    return NextResponse.json({ success: true, data: formatted })
  } catch (err) {
    console.error("Discount codes GET error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// POST — Crear nuevo código de descuento
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !(await requireAdmin(user.id))) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const body = await request.json()
    const {
      code,
      type,         // 'percentage' | 'fixed'
      value,        // número: % o MXN fijo
      description,
      minPurchase = 0,
      maxUses = null,     // null = ilimitado
      expiresAt = null,   // null = no expira
      isActive = true,
    } = body

    if (!code || !type || value === undefined) {
      return NextResponse.json(
        { error: "code, type y value son requeridos" },
        { status: 400 }
      )
    }

    if (!["percentage", "fixed"].includes(type)) {
      return NextResponse.json({ error: "type debe ser 'percentage' o 'fixed'" }, { status: 400 })
    }

    if (type === "percentage" && (value <= 0 || value > 100)) {
      return NextResponse.json({ error: "El porcentaje debe estar entre 1 y 100" }, { status: 400 })
    }

    if (value <= 0) {
      return NextResponse.json({ error: "El valor debe ser mayor a 0" }, { status: 400 })
    }

    // Verificar que el código no exista ya
    const { data: existing } = await supabaseAdmin
      .from("discount_codes")
      .select("id")
      .eq("code", code.toUpperCase().trim())
      .single()

    if (existing) {
      return NextResponse.json(
        { error: "Ya existe un código con ese nombre" },
        { status: 409 }
      )
    }

    const { data: newCode, error } = await supabaseAdmin
      .from("discount_codes")
      .insert({
        code: code.toUpperCase().trim(),
        type,
        value,
        description: description || null,
        min_purchase: minPurchase || 0,
        max_uses: maxUses || null,
        expires_at: expiresAt || null,
        is_active: isActive,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error("Discount code insert error:", error)
      return NextResponse.json({ error: "Error al crear el código" }, { status: 500 })
    }

    return NextResponse.json(
      { success: true, data: newCode, message: "Código creado exitosamente" },
      { status: 201 }
    )
  } catch (err) {
    console.error("Discount codes POST error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// PUT — Actualizar código existente
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !(await requireAdmin(user.id))) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: "id es requerido" }, { status: 400 })
    }

    // Mapear camelCase a snake_case
    const dbUpdates: Record<string, unknown> = {}
    if (updates.description !== undefined) dbUpdates.description = updates.description
    if (updates.maxUses !== undefined) dbUpdates.max_uses = updates.maxUses
    if (updates.minPurchase !== undefined) dbUpdates.min_purchase = updates.minPurchase
    if (updates.expiresAt !== undefined) dbUpdates.expires_at = updates.expiresAt
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive
    if (updates.value !== undefined) dbUpdates.value = updates.value
    dbUpdates.updated_at = new Date().toISOString()

    const { error } = await supabaseAdmin
      .from("discount_codes")
      .update(dbUpdates)
      .eq("id", id)

    if (error) {
      return NextResponse.json({ error: "Error al actualizar el código" }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Código actualizado correctamente" })
  } catch (err) {
    console.error("Discount codes PUT error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// DELETE — Eliminar código
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !(await requireAdmin(user.id))) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "id es requerido" }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from("discount_codes")
      .delete()
      .eq("id", id)

    if (error) {
      return NextResponse.json({ error: "Error al eliminar el código" }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Código eliminado" })
  } catch (err) {
    console.error("Discount codes DELETE error:", err)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
