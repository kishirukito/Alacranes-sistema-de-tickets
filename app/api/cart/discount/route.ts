/**
 * app/api/cart/discount/route.ts
 * Validación de códigos de descuento desde Supabase.
 * Los códigos se gestionan desde /api/admin/discount-codes
 */
import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"

// POST /api/cart/discount — Validar y aplicar código de descuento
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const { code, subtotal } = await request.json()

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { error: "Código requerido" },
        { status: 400 }
      )
    }

    if (!subtotal || subtotal <= 0) {
      return NextResponse.json(
        { error: "Subtotal inválido" },
        { status: 400 }
      )
    }

    // Buscar el código en Supabase
    const { data: discount, error } = await supabase
      .from("discount_codes")
      .select("*")
      .eq("code", code.toUpperCase().trim())
      .eq("is_active", true)
      .single()

    if (error || !discount) {
      return NextResponse.json(
        { error: "Código de descuento inválido o expirado" },
        { status: 400 }
      )
    }

    // Verificar expiración
    if (discount.expires_at && new Date(discount.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "Este código de descuento ha expirado" },
        { status: 400 }
      )
    }

    // Verificar límite de usos
    if (
      discount.max_uses !== null &&
      discount.current_uses >= discount.max_uses
    ) {
      return NextResponse.json(
        { error: "Este código ha alcanzado su límite de usos" },
        { status: 400 }
      )
    }

    // Verificar compra mínima
    if (discount.min_purchase && subtotal < discount.min_purchase) {
      return NextResponse.json(
        {
          error: `El monto mínimo para usar este código es $${discount.min_purchase} MXN`,
        },
        { status: 400 }
      )
    }

    // Calcular descuento
    let discountAmount: number
    if (discount.type === "percentage") {
      discountAmount = Math.round((subtotal * discount.value) / 100)
    } else {
      discountAmount = Math.min(discount.value, subtotal)
    }

    return NextResponse.json({
      success: true,
      code: discount.code,
      type: discount.type,
      value: discount.value,
      discountAmount,
      description: discount.description,
      expiresAt: discount.expires_at,
    })
  } catch (err) {
    console.error("Discount API error:", err)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
