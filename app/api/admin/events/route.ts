import { NextRequest, NextResponse } from "next/server"

// GET /api/admin/events - Get all events with filters
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status") || "all"
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "10")

  // Mock events data
  const allEvents = [
    {
      id: "evt-001",
      title: "Alacranes vs Mineros de Zacatecas",
      subtitle: "Liga Premier - Jornada 12",
      date: "15 Oct, 2024",
      time: "20:00 HRS",
      venue: "Estadio Francisco Zarco",
      status: "active",
      ticketsSold: 2450,
      totalCapacity: 5000,
    },
    {
      id: "evt-002",
      title: "Alacranes vs Tecos UAG",
      subtitle: "Liga Premier - Jornada 14",
      date: "28 Oct, 2024",
      time: "19:30 HRS",
      venue: "Estadio Francisco Zarco",
      status: "soldout",
      ticketsSold: 5000,
      totalCapacity: 5000,
    },
    {
      id: "evt-003",
      title: "Presentación Uniforme 2025",
      subtitle: "Evento Corporativo",
      date: "05 Nov, 2024",
      time: "11:00 HRS",
      venue: "Centro de Convenciones",
      status: "upcoming",
      ticketsSold: 0,
      totalCapacity: 500,
    },
    {
      id: "evt-004",
      title: "Clínica de Verano 2024",
      subtitle: "Escuelas de Fútbol",
      date: "10 Nov, 2024",
      time: "09:00 HRS",
      venue: "Campos de Entrenamiento",
      status: "cancelled",
      ticketsSold: 120,
      totalCapacity: 200,
    },
  ]

  // Filter by status
  const filteredEvents = status === "all" 
    ? allEvents 
    : allEvents.filter(e => e.status === status)

  // Paginate
  const startIndex = (page - 1) * limit
  const paginatedEvents = filteredEvents.slice(startIndex, startIndex + limit)

  return NextResponse.json({
    events: paginatedEvents,
    total: filteredEvents.length,
    page,
    limit,
    totalPages: Math.ceil(filteredEvents.length / limit),
  })
}

// POST /api/admin/events - Create new event
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, subtitle, date, time, venue, totalCapacity } = body

    if (!title || !date || !venue) {
      return NextResponse.json(
        { error: "Titulo, fecha y sede son requeridos" },
        { status: 400 }
      )
    }

    // Mock creating event
    const newEvent = {
      id: `evt-${Date.now()}`,
      title,
      subtitle: subtitle || "",
      date,
      time: time || "00:00 HRS",
      venue,
      status: "upcoming",
      ticketsSold: 0,
      totalCapacity: totalCapacity || 5000,
      createdAt: new Date().toISOString(),
    }

    return NextResponse.json(newEvent, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: "Error al crear evento" },
      { status: 500 }
    )
  }
}
