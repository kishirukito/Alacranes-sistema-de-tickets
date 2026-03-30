"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { ArrowRight, Calendar, Mouse, Loader2 } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { MatchCard } from "@/components/match-card"
import { SponsorsSection } from "@/components/sponsors-section"
import { SiteFooter } from "@/components/site-footer"

interface UpcomingMatch {
  id: string
  date: string
  time: string
  dayOfWeek: string
  homeTeam: { name: string; shortName: string; logo?: string | null }
  awayTeam: { name: string; shortName: string; logo?: string | null }
  venue: string
  isHome: boolean
  ticketsAvailable: boolean
}

export default function HomePage() {
  const [upcomingMatches, setUpcomingMatches] = useState<UpcomingMatch[]>([])
  const [loadingMatches, setLoadingMatches] = useState(true)

  useEffect(() => {
    async function fetchUpcoming() {
      try {
        const res = await fetch("/api/matches?upcoming=true&limit=3")
        if (res.ok) {
          const data = await res.json()
          setUpcomingMatches(data.data || [])
        }
      } catch (err) {
        console.error("Error cargando partidos:", err)
      } finally {
        setLoadingMatches(false)
      }
    }
    fetchUpcoming()
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <SiteHeader />

      {/* Hero Section */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
        {/* Background Image */}
        <Image
          src="/images/Per.avif"
          alt="Alacranes de Durango"
          fill
          className="object-cover object-center"
          priority
        />
        {/* Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-forest/95 via-forest/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-forest/60 via-transparent to-forest/40" />

        {/* Hero Content */}
        <div className="relative z-10 mx-auto max-w-6xl px-4 text-center lg:px-6 lg:text-left">
          <div className="max-w-xl">
            <h1 className="mb-4 text-balance text-4xl font-black leading-none tracking-tight text-card md:text-5xl lg:text-6xl">
              Alacranes de{" "}
              <span className="text-emerald">Durango</span>
            </h1>
            <p className="mb-8 text-pretty text-lg text-card/80 md:text-xl">
              Pasion, orgullo y tradicion en cada jugada
            </p>
            <a
              href="/partidos"
              className="inline-flex items-center gap-2 rounded-full bg-emerald px-7 py-3.5 text-sm font-semibold text-card transition-colors hover:bg-emerald-dark"
            >
              Ver proximos partidos
              <ArrowRight className="size-4" />
            </a>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <div className="flex flex-col items-center gap-2 text-card/60">
            <Mouse className="size-6 animate-bounce" />
          </div>
        </div>
      </section>

      {/* Upcoming Matches Section */}
      <section id="proximos-partidos" className="bg-background py-16 lg:py-20">
        <div className="mx-auto max-w-4xl px-4 lg:px-6">
          {/* Section Header */}
          <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-card-foreground">
                Proximos Partidos
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Sigue el camino de los Alacranes esta temporada
              </p>
            </div>
            <a
              href="/partidos"
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald/30 bg-emerald/10 px-4 py-2 text-xs font-semibold text-emerald transition-colors hover:bg-emerald/20"
            >
              <Calendar className="size-3.5" />
              Calendario
            </a>
          </div>

          {/* Match Cards */}
          <div className="flex flex-col gap-4">
            {loadingMatches ? (
              <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
                <span className="text-sm">Cargando partidos...</span>
              </div>
            ) : upcomingMatches.length === 0 ? (
              <div className="rounded-xl bg-[#0a1f1a] px-6 py-10 text-center">
                <p className="text-sm text-white/50">
                  No hay partidos próximos en este momento.
                </p>
                <a
                  href="/partidos"
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald hover:underline"
                >
                  <Calendar className="size-3.5" />
                  Ver calendario completo
                </a>
              </div>
            ) : (
              upcomingMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  {...match}
                  homeTeam={{ ...match.homeTeam, logo: match.homeTeam.logo ?? undefined }}
                  awayTeam={{ ...match.awayTeam, logo: match.awayTeam.logo ?? undefined }}
                />
              ))
            )}
          </div>
        </div>
      </section>

      {/* Sponsors Section */}
      <SponsorsSection />

      {/* Footer */}
      <SiteFooter />
    </div>
  )
}
