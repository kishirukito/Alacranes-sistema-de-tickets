import { NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const eventId = parseInt(id)

  // Mock zone pricing
  const pricing = {
    zones: [
      { id: 1, name: "Premium Norte", price: 450, quantity: 500 },
      { id: 2, name: "General Sur", price: 250, quantity: 1200 },
      { id: 3, name: "Lateral Este", price: 300, quantity: 650 },
      { id: 4, name: "Lateral Oeste", price: 300, quantity: 650 },
    ],
  }

  return NextResponse.json({ success: true, data: pricing })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const eventId = parseInt(id)
  const body = await request.json()

  return NextResponse.json(
    {
      success: true,
      message: "Precios asignados exitosamente",
      eventId,
      zones: body.zones,
    },
    { status: 201 }
  )
}
