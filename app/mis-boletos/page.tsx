"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, ChevronRight, ArrowLeft, Download, Loader2, CheckCircle2, Clock } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { TicketCard } from "@/components/ticket-card"

interface Ticket {
  id: string
  orderId: string
  orderDate: string
  homeTeam: string
  awayTeam: string
  matchDate: string
  matchTime: string
  venue: string
  zone: string
  gate: string
  section: string
  seat: string
  price: number
  status: "activo" | "usado" | "expirado" | "cancelado"
  qrCode: string
  usedAt?: string | null
}

type FilterType = "todos" | "activo" | "usado"

const filterLabels: Record<FilterType, string> = {
  todos: "Todos",
  activo: "Activos",
  usado: "Usados",
}

export default function MisBoletosPage() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [allTickets, setAllTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>("todos")

  useEffect(() => {
    fetch("/api/tickets")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setAllTickets(data.data.tickets)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Resetear índice cuando cambia el filtro
  useEffect(() => {
    setCurrentIndex(0)
  }, [filter])

  const tickets = allTickets.filter((t) => {
    if (filter === "activo") return t.status === "activo"
    if (filter === "usado") return t.status === "usado" || t.status === "expirado"
    return true
  })

  const goToPrevious = () =>
    setCurrentIndex((prev) => (prev === 0 ? tickets.length - 1 : prev - 1))

  const goToNext = () =>
    setCurrentIndex((prev) => (prev === tickets.length - 1 ? 0 : prev + 1))

  const currentTicket = tickets[currentIndex]

  const handleDownload = () => {
    if (!currentTicket) return
    window.open(`/api/tickets/${currentTicket.id}/download`, "_blank")
  }

  // Contadores para badges de filtro
  const countActivos = allTickets.filter((t) => t.status === "activo").length
  const countUsados = allTickets.filter((t) => t.status === "usado" || t.status === "expirado").length

  return (
    <div className="min-h-screen bg-card">
      <SiteHeader />

      <section className="relative h-64 w-full">
        <Image
          src="/images/23.avif"
          alt="Estadio Francisco Zarco"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-forest/70 via-forest/50 to-card" />
      </section>

      <div className="mx-auto w-full max-w-7xl px-4 pt-6 lg:px-8">
        <Link
          href="/perfil"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
        >
          <ArrowLeft className="size-4" />
          Volver al perfil
        </Link>
      </div>

      <main className="mx-auto max-w-2xl px-4 pb-16 pt-6">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-forest">Mis Boletos</h2>
          {!loading && (
            <p className="mt-1 text-sm text-muted-foreground">
              Tienes{" "}
              <span className="font-semibold text-foreground">{allTickets.length}</span>{" "}
              {allTickets.length === 1 ? "boleto" : "boletos"} en total
            </p>
          )}
        </div>

        {/* ── Filtros ── */}
        {!loading && allTickets.length > 0 && (
          <div className="mb-6 flex items-center justify-center gap-2">
            {(["todos", "activo", "usado"] as FilterType[]).map((f) => {
              const count =
                f === "activo" ? countActivos
                : f === "usado" ? countUsados
                : allTickets.length

              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                    filter === f
                      ? f === "usado"
                        ? "bg-muted text-muted-foreground shadow-sm"
                        : "bg-forest text-card shadow-sm"
                      : "border border-border text-muted-foreground hover:border-forest/40 hover:text-foreground"
                  }`}
                >
                  {f === "activo" && <CheckCircle2 className="size-3" />}
                  {f === "usado" && <Clock className="size-3" />}
                  {filterLabels[f]}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      filter === f ? "bg-white/20" : "bg-secondary"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
            <Loader2 className="size-8 animate-spin text-emerald" />
            <p className="text-sm">Cargando tus boletos...</p>
          </div>
        ) : allTickets.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card py-20 text-center">
            <p className="text-lg font-semibold text-foreground">No tienes boletos aún</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Compra boletos para los próximos partidos
            </p>
            <Link
              href="/partidos"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald px-6 py-2.5 text-sm font-semibold text-card hover:bg-emerald-dark"
            >
              Ver partidos
            </Link>
          </div>
        ) : tickets.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card py-16 text-center">
            <p className="text-base font-semibold text-foreground">
              No hay boletos {filter === "activo" ? "activos" : "usados"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {filter === "activo"
                ? "Todos tus boletos ya fueron utilizados."
                : "Ningún boleto ha sido escaneado aún."}
            </p>
            <button
              onClick={() => setFilter("todos")}
              className="mt-4 text-sm font-semibold text-emerald hover:underline"
            >
              Ver todos los boletos
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-center gap-3">
              <button
                onClick={goToPrevious}
                className="flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-emerald hover:text-emerald"
                aria-label="Boleto anterior"
              >
                <ChevronLeft className="size-4" />
              </button>
              <div className="flex items-center gap-2">
                {tickets.map((_, index: number) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`h-2 rounded-full transition-all ${
                      index === currentIndex
                        ? "w-6 bg-emerald"
                        : "w-2 bg-border hover:bg-muted-foreground"
                    }`}
                    aria-label={`Ir al boleto ${index + 1}`}
                  />
                ))}
              </div>
              <button
                onClick={goToNext}
                className="flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-emerald hover:text-emerald"
                aria-label="Siguiente boleto"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            <p className="mb-6 text-center text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Boleto {currentIndex + 1} de {tickets.length}
            </p>

            <TicketCard ticket={currentTicket} />

            {/* Botón de descarga solo en activos */}
            {currentTicket?.status === "activo" && (
              <button
                onClick={handleDownload}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald/30 bg-emerald/10 py-3 text-sm font-semibold text-emerald transition-colors hover:bg-emerald/20"
              >
                <Download className="size-4" />
                Descargar / Imprimir Boleto
              </button>
            )}

            {/* Mensaje si el boleto fue usado */}
            {currentTicket?.status === "usado" && (
              <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/50 py-3 text-sm text-muted-foreground">
                <Clock className="size-4" />
                Este boleto ya fue utilizado en el evento
              </div>
            )}
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
