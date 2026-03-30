"use client"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"

interface Sponsor {
  id: string
  name: string
  logo?: string | null
  tier: "platinum" | "gold" | "silver" | "bronze"
  websiteUrl?: string | null
}

export function SponsorsSection() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSponsors() {
      try {
        const res = await fetch("/api/sponsors")
        if (res.ok) {
          const data = await res.json()
          setSponsors(data.data || [])
        }
      } catch (err) {
        console.error("Error cargando patrocinadores:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchSponsors()
  }, [])

  // Colores de borde por tier
  const tierBorder: Record<string, string> = {
    platinum: "border-gray-300",
    gold: "border-yellow-400",
    silver: "border-gray-400",
    bronze: "border-amber-600",
  }

  return (
    <section id="patrocinadores" className="bg-card py-16 lg:py-20">
      <div className="mx-auto max-w-6xl px-4 lg:px-6">
        {/* Title */}
        <div className="mb-12 text-center">
          <span className="mb-2 inline-block text-xs font-semibold tracking-widest text-emerald uppercase">
            Orgullosos de contar con
          </span>
          <h2 className="text-2xl font-black tracking-tight text-forest uppercase lg:text-3xl">
            Nuestros Patrocinadores
          </h2>
          <div className="mx-auto mt-3 h-1 w-16 rounded-full bg-gradient-to-r from-emerald to-forest" />
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="size-6 animate-spin text-emerald" />
          </div>
        )}

        {/* Empty state */}
        {!loading && sponsors.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            Próximamente información de patrocinadores.
          </p>
        )}

        {/* Sponsors Grid */}
        {!loading && sponsors.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {sponsors.map((sponsor) => (
              <a
                key={sponsor.id}
                href={sponsor.websiteUrl || "#"}
                target={sponsor.websiteUrl ? "_blank" : undefined}
                rel="noopener noreferrer"
                className={`group relative flex min-h-[72px] items-center justify-center overflow-hidden rounded-xl border bg-card px-4 py-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald/10 ${tierBorder[sponsor.tier] || "border-border"}`}
              >
                {/* Hover accent */}
                <div className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-gradient-to-r from-emerald to-forest transition-transform duration-300 group-hover:scale-x-100" />

                {sponsor.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={sponsor.logo}
                    alt={sponsor.name}
                    className="max-h-10 max-w-full object-contain transition-opacity group-hover:opacity-90"
                  />
                ) : (
                  <span className="text-center text-xs font-bold tracking-tight text-foreground transition-colors duration-300 group-hover:text-forest">
                    {sponsor.name}
                  </span>
                )}
              </a>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            ¿Quieres ser parte de nuestra familia de patrocinadores? Contactanos en{" "}
            <span className="font-semibold text-forest">patrocinios@alacranes.mx</span>
          </p>
        </div>
      </div>
    </section>
  )
}
