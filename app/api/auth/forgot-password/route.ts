import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: "Email es requerido" },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Formato de email invalido" },
        { status: 400 }
      )
    }

    // In production:
    // 1. Check if user exists
    // 2. Generate secure reset token
    // 3. Store token with expiration
    // 4. Send email with reset link

    // Always return success to prevent email enumeration
    return NextResponse.json({
      success: true,
      message: "Si el email existe, recibiras instrucciones para restablecer tu contraseña",
    })
  } catch {
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
