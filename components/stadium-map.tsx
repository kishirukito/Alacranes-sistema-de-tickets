"use client"

type ZoneId = "premium-norte" | "general-sur" | "lateral-este" | "lateral-oeste"

interface StadiumMapProps {
  selectedZone: ZoneId
  onSelectZone: (zone: ZoneId) => void
  availableSeats: number
}

const zoneColors: Record<ZoneId, { fill: string; hover: string; label: string }> = {
  "premium-norte": { fill: "#F5C518", hover: "#FFD740", label: "PREMIUM NORTE" },
  "general-sur": { fill: "#D32F2F", hover: "#E53935", label: "GENERAL SUR" },
  "lateral-este": { fill: "#D32F2F", hover: "#E53935", label: "LATERAL ESTE" },
  "lateral-oeste": { fill: "#D32F2F", hover: "#E53935", label: "LATERAL OESTE" },
}

export function StadiumMap({ selectedZone, onSelectZone, availableSeats }: StadiumMapProps) {
  return (
    <div className="relative flex flex-col">
      {/* Legend */}
      <div className="mb-5 flex flex-wrap items-center gap-5">
        <div className="flex items-center gap-2">
          <div className="size-3.5 rounded-sm bg-[#F5C518]" />
          <span className="text-xs font-semibold tracking-wide text-card-foreground">
            PREMIUM NORTE
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-3.5 rounded-sm bg-[#D32F2F]" />
          <span className="text-xs font-medium tracking-wide text-muted-foreground">
            GENERAL / LATERALES
          </span>
        </div>
      </div>

      {/* Stadium SVG -- dark background kept inside the SVG itself */}
      <div className="flex items-center justify-center overflow-hidden rounded-2xl bg-[#002920] p-5 shadow-md lg:p-8">
        <svg
          viewBox="0 0 600 420"
          className="w-full max-w-[640px]"
          aria-label="Mapa del estadio con zonas seleccionables"
        >
          {/* Stadium outer shape */}
          <path
            d="M80,20 L520,20 L580,80 L580,340 L520,400 L80,400 L20,340 L20,80 Z"
            fill="#00352B"
            stroke="#00695C"
            strokeWidth="2.5"
          />

          {/* Premium Norte - top yellow zone */}
          <path
            d="M90,30 L510,30 L560,70 L560,120 L40,120 L40,70 Z"
            fill={zoneColors["premium-norte"].fill}
            className="cursor-pointer transition-all duration-200 hover:brightness-110"
            opacity={selectedZone === "premium-norte" ? 1 : 0.75}
            stroke={selectedZone === "premium-norte" ? "#FFFFFF" : "transparent"}
            strokeWidth={selectedZone === "premium-norte" ? 2.5 : 0}
            onClick={() => onSelectZone("premium-norte")}
            role="button"
            aria-label="Seleccionar zona Premium Norte"
            tabIndex={0}
          />
          <text
            x="300" y="82"
            textAnchor="middle"
            className="pointer-events-none select-none fill-[#212121] text-[13px] font-bold"
          >
            PREMIUM NORTE
          </text>

          {/* Lateral Oeste - left red zone */}
          <path
            d="M40,130 L130,130 L130,290 L40,290 L30,260 L30,160 Z"
            fill={zoneColors["lateral-oeste"].fill}
            className="cursor-pointer transition-all duration-200 hover:brightness-110"
            opacity={selectedZone === "lateral-oeste" ? 1 : 0.75}
            stroke={selectedZone === "lateral-oeste" ? "#FFFFFF" : "transparent"}
            strokeWidth={selectedZone === "lateral-oeste" ? 2.5 : 0}
            onClick={() => onSelectZone("lateral-oeste")}
            role="button"
            aria-label="Seleccionar zona Lateral Oeste"
            tabIndex={0}
          />

          {/* Lateral Este - right red zone */}
          <path
            d="M470,130 L560,130 L570,160 L570,260 L560,290 L470,290 Z"
            fill={zoneColors["lateral-este"].fill}
            className="cursor-pointer transition-all duration-200 hover:brightness-110"
            opacity={selectedZone === "lateral-este" ? 1 : 0.75}
            stroke={selectedZone === "lateral-este" ? "#FFFFFF" : "transparent"}
            strokeWidth={selectedZone === "lateral-este" ? 2.5 : 0}
            onClick={() => onSelectZone("lateral-este")}
            role="button"
            aria-label="Seleccionar zona Lateral Este"
            tabIndex={0}
          />

          {/* General Sur - bottom red zone */}
          <path
            d="M40,300 L560,300 L560,350 L510,390 L90,390 L40,350 Z"
            fill={zoneColors["general-sur"].fill}
            className="cursor-pointer transition-all duration-200 hover:brightness-110"
            opacity={selectedZone === "general-sur" ? 1 : 0.75}
            stroke={selectedZone === "general-sur" ? "#FFFFFF" : "transparent"}
            strokeWidth={selectedZone === "general-sur" ? 2.5 : 0}
            onClick={() => onSelectZone("general-sur")}
            role="button"
            aria-label="Seleccionar zona General Sur"
            tabIndex={0}
          />
          <text
            x="300" y="352"
            textAnchor="middle"
            className="pointer-events-none select-none fill-[#FFFFFF] text-[13px] font-bold"
          >
            GENERAL SUR
          </text>

          {/* Football pitch (green field) */}
          <rect x="140" y="130" width="320" height="160" rx="3" fill="#2E7D32" />

          {/* Field markings */}
          <rect x="155" y="142" width="290" height="136" rx="2" fill="none" stroke="#FFFFFF50" strokeWidth="1.5" />
          <line x1="300" y1="142" x2="300" y2="278" stroke="#FFFFFF50" strokeWidth="1.5" />
          <circle cx="300" cy="210" r="30" fill="none" stroke="#FFFFFF50" strokeWidth="1.5" />
          <circle cx="300" cy="210" r="2" fill="#FFFFFF50" />
          <rect x="155" y="175" width="45" height="70" fill="none" stroke="#FFFFFF50" strokeWidth="1.5" />
          <rect x="155" y="190" width="20" height="40" fill="none" stroke="#FFFFFF50" strokeWidth="1.5" />
          <rect x="400" y="175" width="45" height="70" fill="none" stroke="#FFFFFF50" strokeWidth="1.5" />
          <rect x="425" y="190" width="20" height="40" fill="none" stroke="#FFFFFF50" strokeWidth="1.5" />

          {/* Section divider lines */}
          <line x1="180" y1="30" x2="180" y2="120" stroke="#B8860B30" strokeWidth="1" />
          <line x1="300" y1="30" x2="300" y2="120" stroke="#B8860B30" strokeWidth="1" />
          <line x1="420" y1="30" x2="420" y2="120" stroke="#B8860B30" strokeWidth="1" />
          <line x1="140" y1="165" x2="130" y2="165" stroke="#FFFFFF20" strokeWidth="1" />
          <line x1="140" y1="210" x2="130" y2="210" stroke="#FFFFFF20" strokeWidth="1" />
          <line x1="140" y1="255" x2="130" y2="255" stroke="#FFFFFF20" strokeWidth="1" />
          <line x1="460" y1="165" x2="470" y2="165" stroke="#FFFFFF20" strokeWidth="1" />
          <line x1="460" y1="210" x2="470" y2="210" stroke="#FFFFFF20" strokeWidth="1" />
          <line x1="460" y1="255" x2="470" y2="255" stroke="#FFFFFF20" strokeWidth="1" />
        </svg>
      </div>
    </div>
  )
}
