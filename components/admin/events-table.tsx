"use client"

import { useState, useCallback } from "react"
import { MoreVertical, ChevronLeft, ChevronRight, Calendar, Presentation, GraduationCap, X, Eye, ExternalLink } from "lucide-react"

interface Event {
  id: string
  title: string
  subtitle: string
  date: string
  time: string
  venue: string
  status: "active" | "soldout" | "upcoming" | "cancelled" | "completed"
  icon?: string
  sold?: number
  total?: number
}

interface EventsTableProps {
  events: Event[]
  total: number
}

const statusLabels: Record<string, string> = {
  active:    "ACTIVO",
  soldout:   "AGOTADO",
  upcoming:  "PRÓXIMO",
  cancelled: "CANCELADO",
  completed: "COMPLETADO",
}

const statusStyles: Record<string, string> = {
  active:    "bg-emerald/10 text-emerald border-emerald/20",
  soldout:   "bg-gray-900 text-white border-gray-900",
  upcoming:  "bg-gray-100 text-gray-700 border-gray-200",
  cancelled: "bg-red-50 text-red-600 border-red-100",
  completed: "bg-blue-50 text-blue-600 border-blue-200",
}

const filters = ["Todos", "Activos", "Agotados", "Próximos", "Completados", "Cancelados"]

const filterToStatus: Record<string, string | null> = {
  Todos:       null,
  Activos:     "active",
  Agotados:    "soldout",
  Próximos:    "upcoming",
  Completados: "completed",
  Cancelados:  "cancelled",
}

export function EventsTable({ events, total }: EventsTableProps) {
  const [activeFilter, setActiveFilter] = useState("Todos")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const eventsPerPage = 4

  const getEventIcon = (iconType?: string) => {
    switch (iconType) {
      case "event":   return <Presentation className="size-4 text-white" />
      case "clinic":  return <GraduationCap className="size-4 text-white" />
      default:        return <Calendar className="size-4 text-white" />
    }
  }

  // ── Client-side filter ──────────────────────────────────────────────────────
  const targetStatus = filterToStatus[activeFilter]
  const filtered = targetStatus ? events.filter((e) => e.status === targetStatus) : events
  const totalPages = Math.max(1, Math.ceil(filtered.length / eventsPerPage))
  const paged = filtered.slice((currentPage - 1) * eventsPerPage, currentPage * eventsPerPage)

  const handleFilter = useCallback((f: string) => {
    setActiveFilter(f)
    setCurrentPage(1)
  }, [])

  return (
    <>
    <div className="rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
        <h3 className="text-lg font-bold text-card-foreground">Resumen de Eventos</h3>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-1 rounded-full border border-border bg-secondary/50 p-1">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => handleFilter(filter)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                activeFilter === filter
                  ? "bg-forest text-white"
                  : "text-muted-foreground hover:text-card-foreground"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="px-6 py-3 text-left text-[11px] font-semibold tracking-wider text-emerald uppercase">Evento / Partido</th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Fecha & Hora</th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Sede</th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Estatus</th>
              <th className="px-6 py-3 text-right text-[11px] font-semibold tracking-wider text-emerald uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paged.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-sm text-muted-foreground">
                  No hay eventos en esta categoría
                </td>
              </tr>
            ) : paged.map((event) => (
              <tr key={event.id} className="transition-colors hover:bg-secondary/20">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-emerald">
                      {getEventIcon(event.icon)}
                    </div>
                    <div>
                      <p className="font-medium text-card-foreground">{event.title}</p>
                      <p className="text-xs text-muted-foreground">{event.subtitle}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="font-medium text-card-foreground">{event.date}</p>
                  <p className="text-xs text-muted-foreground">{event.time}</p>
                </td>
                <td className="px-6 py-4 text-sm text-card-foreground">{event.venue}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-bold tracking-wide ${statusStyles[event.status] ?? "bg-secondary text-foreground border-border"}`}>
                    {statusLabels[event.status] ?? event.status.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => setSelectedEvent(event)}
                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-card-foreground"
                  >
                    <MoreVertical className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination + report link */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-3">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            Mostrando {paged.length} de {filtered.length} eventos
            {activeFilter !== "Todos" && <span className="ml-1 text-forest">({activeFilter})</span>}
          </p>
          <a
            href="/admin/reportes"
            className="flex items-center gap-1.5 rounded-lg border border-forest/30 bg-forest/5 px-3 py-1.5 text-xs font-semibold text-forest hover:bg-forest/10 transition-colors"
          >
            <ExternalLink className="size-3" />
            Ver reporte completo
          </a>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-50"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-50"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        )}
      </div>
    </div>

    {/* Event detail modal */}
    {selectedEvent && (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedEvent(null)} />
        <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
          <div className="mb-5 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-forest">
                {getEventIcon(selectedEvent.icon)}
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">{selectedEvent.title}</h2>
                <p className="text-xs text-muted-foreground">{selectedEvent.subtitle}</p>
              </div>
            </div>
            <button onClick={() => setSelectedEvent(null)}
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary">
              <X className="size-4" />
            </button>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-4 rounded-xl bg-secondary/50 p-4">
            <div>
              <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Fecha</p>
              <p className="text-sm font-medium text-foreground">{selectedEvent.date}</p>
            </div>
            <div>
              <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Hora</p>
              <p className="text-sm font-medium text-foreground">{selectedEvent.time}</p>
            </div>
            <div>
              <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Sede</p>
              <p className="text-sm font-medium text-foreground">{selectedEvent.venue}</p>
            </div>
            <div>
              <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Estatus</p>
              <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wide ${statusStyles[selectedEvent.status] ?? ""}`}>
                {statusLabels[selectedEvent.status]}
              </span>
            </div>
            {selectedEvent.sold !== undefined && (
              <div className="col-span-2">
                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Ocupación</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-forest"
                      style={{ width: `${selectedEvent.total ? Math.round((selectedEvent.sold / selectedEvent.total) * 100) : 0}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-foreground">
                    {selectedEvent.sold?.toLocaleString()} / {selectedEvent.total?.toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <a
              href="/admin/ventas"
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary"
            >
              <Eye className="size-4" />
              Ver ventas
            </a>
            <a
              href="/admin/reportes"
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-forest py-2.5 text-sm font-semibold text-white transition-colors hover:bg-forest-light"
            >
              <ExternalLink className="size-4" />
              Reporte completo
            </a>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
