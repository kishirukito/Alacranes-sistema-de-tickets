"use client"

import { useState } from "react"
import { MapPin } from "lucide-react"
import { StadiumMap } from "@/components/stadium-map"
import { ZoneDetailPanel } from "@/components/admin/zone-detail-panel"

type ZoneId = "premium-norte" | "general-sur" | "lateral-este" | "lateral-oeste"

const zoneLabels: Record<ZoneId, string> = {
  "premium-norte": "Premium Norte",
  "lateral-oeste": "Lateral Oeste",
  "lateral-este": "Lateral Este",
  "general-sur": "General Sur",
}

export default function ZonasPage() {
  const [selectedZone, setSelectedZone] = useState<ZoneId>("lateral-oeste")

  return (
    <div className="flex flex-col gap-6">
      {/* Main two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Stadium map (2/3) */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-card p-6">
            {/* Card header */}
            <div className="mb-6 flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-md bg-forest/10">
                <MapPin className="size-3.5 text-forest" />
              </div>
              <h2 className="text-sm font-semibold text-foreground">
                Mapa del Estadio
              </h2>
            </div>

            {/* Stadium map — reuses the existing component */}
            <StadiumMap
              selectedZone={selectedZone}
              onSelectZone={setSelectedZone}
              availableSeats={1240}
            />

            {/* Caption */}
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Estadio Francisco Zarco — Vista Aérea
            </p>
          </div>
        </div>

        {/* Right: Zone detail panel (1/3) */}
        <div className="lg:col-span-1">
          <ZoneDetailPanel selectedZoneId={selectedZone} />
        </div>
      </div>
    </div>
  )
}
