"use client"

import { MapPin, Ticket } from "lucide-react"

interface Team {
  name: string
  shortName: string
  logo?: string
}

interface MatchCardProps {
  id: string
  date: string
  time: string
  dayOfWeek: string
  homeTeam: Team
  awayTeam: Team
  venue: string
  isHome: boolean
  ticketsAvailable: boolean
}

export function MatchCard({
  id,
  date,
  time,
  dayOfWeek,
  homeTeam,
  awayTeam,
  venue,
  isHome,
  ticketsAvailable,
}: MatchCardProps) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-xl bg-[#0a1f1a] transition-all hover:ring-1 hover:ring-emerald/30 sm:flex-row sm:items-center">

      {/* Left — day + time */}
      <div className="flex min-w-[140px] flex-col justify-center border-b border-white/5 px-6 py-5 sm:border-b-0 sm:border-r sm:py-6">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
          {dayOfWeek}, {date}
        </span>
        <span className="mt-0.5 text-3xl font-black leading-none text-white">
          {time}
        </span>
      </div>

      {/* Center — teams */}
      <div className="flex flex-1 items-center justify-center gap-5 px-6 py-5">
        {/* Home */}
        <div className="flex flex-col items-center gap-1.5">
          <div className={`flex size-12 items-center justify-center overflow-hidden rounded-xl text-sm font-black ${
            homeTeam.shortName === "DGO"
              ? "bg-emerald text-[#0a1f1a]"
              : "bg-white/10 text-white"
          }`}>
            {homeTeam.logo ? (
              <img
                src={homeTeam.logo}
                alt={homeTeam.shortName}
                className="size-full object-contain p-1"
              />
            ) : (
              homeTeam.shortName
            )}
          </div>
          <span className={`text-xs font-semibold ${homeTeam.shortName === "DGO" ? "text-white/80" : "text-white/60"}`}>
            {homeTeam.name}
          </span>
        </div>

        {/* vs */}
        <span className="text-sm font-bold text-white/25">vs</span>

        {/* Away */}
        <div className="flex flex-col items-center gap-1.5">
          <div className={`flex size-12 items-center justify-center overflow-hidden rounded-xl text-sm font-black ${
            awayTeam.shortName === "DGO"
              ? "bg-emerald text-[#0a1f1a]"
              : "bg-white/10 text-white"
          }`}>
            {awayTeam.logo ? (
              <img
                src={awayTeam.logo}
                alt={awayTeam.shortName}
                className="size-full object-contain p-1"
              />
            ) : (
              awayTeam.shortName
            )}
          </div>
          <span className={`text-xs font-semibold ${awayTeam.shortName === "DGO" ? "text-white/80" : "text-white/60"}`}>
            {awayTeam.name}
          </span>
        </div>
      </div>

      {/* Venue */}
      <div className="hidden flex-col justify-center border-l border-white/5 px-6 py-6 lg:flex lg:min-w-[180px]">
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
          Sede
        </span>
        <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-white/70">
          <MapPin className="size-3.5 shrink-0 text-emerald" />
          {venue}
        </div>
      </div>

      {/* CTA */}
      <div className="flex items-center border-t border-white/5 px-5 py-4 sm:border-l sm:border-t-0 sm:px-6 sm:py-6">
        {ticketsAvailable ? (
          <a
            href={`/asientos?match=${id}`}
            className="flex items-center gap-2 rounded-full bg-emerald px-5 py-2.5 text-sm font-bold text-[#0a1f1a] transition-all hover:bg-emerald/85 whitespace-nowrap"
          >
            <Ticket className="size-4" />
            Comprar boletos
          </a>
        ) : (
          <span className="whitespace-nowrap rounded-full bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/30">
            Agotado
          </span>
        )}
      </div>
    </div>
  )
}
