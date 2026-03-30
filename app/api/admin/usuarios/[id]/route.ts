import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Mock user data
  const user = {
    id,
    name: "Juan Pérez",
    email: "juan.perez@alacranes.com",
    registrationDate: "2024-01-12",
    status: "Activo",
    role: "Personal de Staff",
    initials: "JP",
  }

  return NextResponse.json({
    success: true,
    data: user,
  })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  const updatedUser = {
    id,
    ...body,
    initials: body.name
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2),
  }

  return NextResponse.json({
    success: true,
    data: updatedUser,
  })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  return NextResponse.json({
    success: true,
    message: `User ${id} deleted successfully`,
  })
}
