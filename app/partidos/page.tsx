"use client"

import Image from "next/image"
import { Calendar, MapPin, Ticket, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { useState, useEffect } from "react"

interface Match {
  id: string
  date: string          // "19 DIC"
  dayOfWeek: string
  time: string
  homeTeam: { id: string; name: string; shortName: string; logo?: string | null }
  awayTeam: { id: string; name: string; shortName: string; logo?: string | null }
  venue: string
  status?: "upcoming" | "soldout" | "finished"
  competition?: string
  ticketsAvailable: boolean
}

const filters = ["Todos", "Agotados"]

export default function PartidosPage() {
  const [activeFilter, setActiveFilter] = useState("Todos")
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  // Determine season year from data, fallback to current year
  const seasonYear = matches.length > 0
    ? (matches[0] as any).season || new Date().getFullYear()
    : new Date().getFullYear()

  useEffect(() => {
    async function fetchMatches() {
      setLoading(true)
      try {
        const res = await fetch("/api/matches?limit=50&upcoming=true")
        if (res.ok) {
          const data = await res.json()
          setMatches(data.data || [])
        }
      } catch (err) {
        console.error("Error cargando partidos:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchMatches()
  }, [])

  const filtered = matches.filter((m) => {
    if (activeFilter === "Agotados") return m.status === "soldout"
    return true // "Todos" = todos los proximos (ya vienen filtrados del API)
  })

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Page hero */}
      <section className="relative pt-24 pb-12 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/images/rix.avif"
            alt="Estadio"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-forest/90 via-forest/80 to-forest/40" />
        </div>

        <div className="relative z-10 mx-auto max-w-5xl px-4 lg:px-6">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="size-5 text-emerald" />
            <span className="text-xs font-semibold uppercase tracking-widest text-emerald">
              Temporada {seasonYear}
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-card md:text-4xl">
            Calendario de Partidos
          </h1>
          <p className="mt-2 text-sm text-card/60">
            Sigue a los Alacranes en cada jornada de la Liga de Expansion MX.
          </p>
        </div>
      </section>

      {/* Filter bar */}
      <div className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3 lg:px-6">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                activeFilter === f
                  ? "bg-forest text-card"
                  : "border border-border text-muted-foreground hover:border-forest/40 hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Matches list */}
      <section className="py-10">
        <div className="mx-auto max-w-5xl px-4 lg:px-6">

          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center gap-3 py-20">
              <Loader2 className="size-8 animate-spin text-emerald" />
              <p className="text-sm text-muted-foreground">Cargando partidos...</p>
            </div>
          )}

          {/* Empty state */}
          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <Calendar className="size-10 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">
                No hay partidos disponibles en este momento
              </p>
            </div>
          )}

          {/* Match cards */}
          {!loading && filtered.length > 0 && (
            <div className="flex flex-col gap-3">
              {filtered.map((match) => (
                <div
                  key={match.id}
                  className="group flex flex-col overflow-hidden rounded-xl bg-[#0a1f1a] transition-all hover:ring-1 hover:ring-emerald/30 sm:flex-row sm:items-center"
                >
                  {/* Left — day + time */}
                  <div className="flex min-w-[140px] flex-col justify-center border-b border-white/5 px-6 py-5 sm:border-b-0 sm:border-r sm:py-6">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
                      {match.dayOfWeek}, {match.date}
                    </span>
                    <span className="mt-0.5 text-3xl font-black leading-none text-white">
                      {match.time}
                    </span>
                  </div>

                  {/* Center — teams */}
                  <div className="flex flex-1 items-center justify-center gap-5 px-6 py-5">
                    {/* Home */}
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="flex size-12 items-center justify-center overflow-hidden rounded-xl bg-emerald text-sm font-black text-[#0a1f1a]">
                        {match.homeTeam.logo ? (
                          <Image
                            src={match.homeTeam.logo}
                            alt={match.homeTeam.shortName}
                            width={48}
                            height={48}
                            className="size-full object-contain p-1"
                            unoptimized
                          />
                        ) : (
                          match.homeTeam.shortName
                        )}
                      </div>
                      <span className="text-xs font-semibold text-white/80">{match.homeTeam.name}</span>
                    </div>

                    {/* vs */}
                    <span className="text-sm font-bold text-white/25">vs</span>

                    {/* Away */}
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="flex size-12 items-center justify-center overflow-hidden rounded-xl bg-white/10 text-sm font-black text-white">
                        {match.awayTeam.logo ? (
                          <Image
                            src={match.awayTeam.logo}
                            alt={match.awayTeam.shortName}
                            width={48}
                            height={48}
                            className="size-full object-contain p-1"
                            unoptimized
                          />
                        ) : (
                          match.awayTeam.shortName
                        )}
                      </div>
                      <span className="text-xs font-semibold text-white/60">{match.awayTeam.name}</span>
                    </div>
                  </div>

                  {/* Venue */}
                  <div className="hidden flex-col justify-center border-l border-white/5 px-6 py-6 lg:flex lg:min-w-[180px]">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                      Sede
                    </span>
                    <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-white/70">
                      <MapPin className="size-3.5 shrink-0 text-emerald" />
                      {match.venue}
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="flex items-center border-t border-white/5 px-5 py-4 sm:border-l sm:border-t-0 sm:px-6 sm:py-6">
                    {!match.ticketsAvailable ? (
                      <span className="flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm font-bold text-white/40 whitespace-nowrap">
                        Agotado
                      </span>
                    ) : (
                      <a
                        href={`/asientos?match=${match.id}`}
                        className="flex items-center gap-2 rounded-full bg-emerald px-5 py-2.5 text-sm font-bold text-[#0a1f1a] transition-all hover:bg-emerald/85 whitespace-nowrap"
                      >
                        <Ticket className="size-4" />
                        Comprar boletos
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination — solo si hay partidos */}
          {!loading && filtered.length > 0 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-secondary">
                <ChevronLeft className="size-4" />
              </button>
              <button className="flex size-9 items-center justify-center rounded-lg bg-forest text-sm font-semibold text-card">1</button>
              <button className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-secondary">
                <ChevronRight className="size-4" />
              </button>
            </div>
          )}
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
