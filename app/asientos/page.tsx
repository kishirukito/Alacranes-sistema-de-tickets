"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import { Loader2 } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { StadiumMap } from "@/components/stadium-map"
import { PurchaseDetails } from "@/components/purchase-details"
import { SiteFooter } from "@/components/site-footer"

export interface ZoneData {
  id: string          // zone_key from DB (e.g. "premium-norte")
  zoneId: string      // UUID in zones table
  inventoryId: string // UUID in match_zone_inventory
  name: string
  description: string
  price: number
  color: string
  availableSeats: number
  soldSeats?: number
  totalSeats: number
  gate: string
  status: "available" | "limited" | "soldout"
}

// The 4 hardcoded zone keys the StadiumMap SVG knows about
const VALID_ZONE_IDS = [
  "premium-norte",
  "general-sur",
  "lateral-este",
  "lateral-oeste",
] as const
type ZoneId = typeof VALID_ZONE_IDS[number]

/**
 * Map a DB zone_key to one of the 4 hardcoded SVG zone IDs by fuzzy matching:
 *   - Exact match wins
 *   - Contains "premium" → premium-norte
 *   - Contains "sur" / "general" → general-sur
 *   - Contains "este" / "east" → lateral-este
 *   - Otherwise → lateral-oeste
 */
function mapToZoneId(zoneKey: string): ZoneId {
  const k = zoneKey.toLowerCase()
  if (VALID_ZONE_IDS.includes(k as ZoneId)) return k as ZoneId
  if (k.includes("premium") || k.includes("norte")) return "premium-norte"
  if (k.includes("sur") || k.includes("general")) return "general-sur"
  if (k.includes("este") || k.includes("east")) return "lateral-este"
  return "lateral-oeste"
}

function AsientosContent() {
  const searchParams = useSearchParams()
  const matchId = searchParams.get("match") ?? ""

  const [selectedZone, setSelectedZone] = useState<ZoneId>("premium-norte")
  const [quantity, setQuantity] = useState(2)
  /** zones keyed by their mapped zone ID so we can look them up from the SVG clicks */
  const [zoneMap, setZoneMap] = useState<Map<ZoneId, ZoneData>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // ── Fetch zone availability & prices from the DB ──────────────────────────
  useEffect(() => {
    if (!matchId) {
      setLoading(false)
      setError("No se especificó un partido. Regresa al calendario y selecciona uno.")
      return
    }

    async function fetchZones() {
      setLoading(true)
      setError("")
      try {
        const res = await fetch(`/api/seats?matchId=${matchId}`)
        if (!res.ok) throw new Error("Error al cargar zonas")
        const data = await res.json()

        const fetchedZones: ZoneData[] = (data.zones || []).map((z: any) => ({
          id: z.id,                 // zone_key from DB
          zoneId: z.zoneId,
          inventoryId: z.inventoryId,
          name: z.name,
          description: z.description || `Zona ${z.name} — Puerta ${z.gate || "A"}`,
          price: z.price,
          color: z.color || "#D32F2F",
          availableSeats: z.availableSeats,
          soldSeats: z.soldSeats ?? 0,
          totalSeats: z.totalSeats,
          gate: z.gate || "A",
          status: z.status,
        }))

        // Build map: SVG zoneId → ZoneData (multiple DB zones may map to same SVG id;
        // prefer "available" over "soldout" if there's a collision)
        const map = new Map<ZoneId, ZoneData>()
        for (const zone of fetchedZones) {
          const svgId = mapToZoneId(zone.id)
          const existing = map.get(svgId)
          // Overwrite only if new zone is more available
          if (!existing || (existing.status === "soldout" && zone.status !== "soldout")) {
            map.set(svgId, { ...zone, id: svgId })
          }
        }

        setZoneMap(map)

        // Select first non-soldout zone
        const firstAvail = fetchedZones.find(z => z.status !== "soldout")
        if (firstAvail) {
          setSelectedZone(mapToZoneId(firstAvail.id))
        }
      } catch (err) {
        console.error(err)
        setError("No se pudo cargar la información de asientos. Intenta de nuevo.")
      } finally {
        setLoading(false)
      }
    }

    fetchZones()
  }, [matchId])

  const zones = Array.from(zoneMap.values())
  const totalAvailable = zones.reduce((sum, z) => sum + z.availableSeats, 0)
  const currentZone = zoneMap.get(selectedZone) ?? null

  return (
    <div className="min-h-screen bg-card">
      <SiteHeader />

      {/* Hero section */}
      <section className="relative h-[340px] overflow-hidden lg:h-[400px]">
        <Image
          src="/images/perf.avif"
          alt="Estadio"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-forest/90 via-forest/80 to-forest/40" />
        <div className="relative z-10 flex h-full flex-col items-center justify-end pb-10 pt-20">
          <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-emerald/30 bg-forest/60 px-4 py-1 text-[11px] font-semibold tracking-widest text-emerald uppercase backdrop-blur-sm">
            Estadio Francisco Zarco
          </span>
          <h1 className="text-center text-3xl font-extrabold tracking-tight text-white lg:text-4xl">
            Selecciona tu Zona
          </h1>
          <p className="mt-2 max-w-md text-center text-sm text-white/70">
            Elige tu ubicacion en el estadio y asegura los mejores asientos para el proximo partido
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="relative px-4 pb-10 pt-8 lg:px-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <Loader2 className="size-8 animate-spin text-emerald" />
            <p className="text-sm text-muted-foreground">Cargando disponibilidad...</p>
          </div>
        ) : error ? (
          <div className="mx-auto max-w-md rounded-xl border border-red-200 bg-red-50/10 p-8 text-center">
            <p className="text-sm font-medium text-red-400">{error}</p>
            <a
              href="/partidos"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald hover:underline"
            >
              ← Ver partidos disponibles
            </a>
          </div>
        ) : (
          <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row lg:gap-8">
            {/* Left: Stadium map */}
            <div className="flex-1">
              <StadiumMap
                selectedZone={selectedZone}
                onSelectZone={setSelectedZone}
                availableSeats={totalAvailable}
              />
            </div>

            {/* Right: Purchase details */}
            <div className="w-full lg:w-[380px]">
              <div className="sticky top-8 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                <div className="p-5 lg:p-6">
                  <PurchaseDetails
                    selectedZone={selectedZone}
                    quantity={quantity}
                    onQuantityChange={setQuantity}
                    matchId={matchId}
                    zoneData={currentZone}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  )
}

export default function AsientosPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-card">
        <Loader2 className="size-8 animate-spin text-emerald" />
      </div>
    }>
      <AsientosContent />
    </Suspense>
  )
}
