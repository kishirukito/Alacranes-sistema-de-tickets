"use client"

import { Eye, Edit, Trash2 } from "lucide-react"

interface EventItem {
  id: string
  name: string
  date: string
  time: string
  status: string
  availability?: { sold: number; total: number }
  homeCode?: string
  awayCode?: string
}

interface EventsListProps {
  events: EventItem[]
  onSelectEvent: (event: EventItem) => void
  onDeleteEvent: (id: string) => void
}

export function EventsList({
  events,
  onSelectEvent,
  onDeleteEvent,
}: EventsListProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Activo":
        return "bg-emerald/10 text-emerald"
      case "Próximo":
        return "bg-blue-100 text-blue-700"
      case "Agotado":
        return "bg-red-100 text-red-700"
      case "Cancelado":
        return "bg-gray-100 text-gray-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  const getAvailabilityColor = (available: number, total: number) => {
    const percentage = (available / total) * 100
    if (percentage > 75) return "bg-emerald"
    if (percentage > 50) return "bg-yellow-500"
    if (percentage > 25) return "bg-orange-500"
    return "bg-red-500"
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full">
        <thead className="border-b border-border bg-secondary">
          <tr>
            <th className="px-6 py-3 text-left text-sm font-semibold text-muted-foreground">
              EVENTO
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-muted-foreground">
              FECHA & HORA
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-muted-foreground">
              ESTATUS
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-muted-foreground">
              DISPONIBILIDAD
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-muted-foreground">
              ACCIONES
            </th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => {
            const avail = event.availability ?? { sold: 0, total: 0 }
            const available = Math.max(0, avail.total - avail.sold)

            return (
              <tr
                key={event.id}
                className="border-b border-border hover:bg-secondary/50 transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 items-center justify-center gap-1.5 rounded-lg bg-secondary px-3 border border-border/50">
                      <span className="text-[11px] font-extrabold text-forest">
                        {event.homeCode}
                      </span>
                      <span className="text-[10px] font-bold text-muted-foreground/60">
                        vs
                      </span>
                      <span className="text-[11px] font-extrabold text-forest">
                        {event.awayCode}
                      </span>
                    </div>
                    <span className="font-medium text-foreground">
                      {event.name}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  <div>{event.date}</div>
                  <div className="text-xs">{event.time} hrs</div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(
                      event.status
                    )}`}
                  >
                    {event.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className={`h-full ${getAvailabilityColor(available, avail.total)}`}
                        style={{ width: avail.total > 0 ? `${(available / avail.total) * 100}%` : "0%" }}
                      />
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {available}/{avail.total}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectEvent(event)}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-forest transition-colors"
                      aria-label="Ver"
                    >
                      <Eye className="size-4" />
                    </button>
                    <button
                      onClick={() => onSelectEvent(event)}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-forest transition-colors"
                      aria-label="Editar"
                    >
                      <Edit className="size-4" />
                    </button>
                    <button
                      onClick={() => onDeleteEvent(event.id)}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
                      aria-label="Eliminar"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
