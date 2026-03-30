"use client"

import { useState } from "react"
import { Calendar, X } from "lucide-react"

const filterTabs = ["Todos", "Activos", "Agotados", "Próximos", "Completados", "Cancelados"]

interface EventsFilterProps {
  onStatusChange: (status: string) => void
  onDateRangeChange: (startDate: string, endDate: string) => void
}

export function EventsFilter({ onStatusChange, onDateRangeChange }: EventsFilterProps) {
  const [activeTab, setActiveTab] = useState("Todos")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [hasRange, setHasRange] = useState(false)

  const handleApplyRange = () => {
    if (startDate && endDate) {
      setHasRange(true)
      onDateRangeChange(startDate, endDate)
    }
  }

  const handleClearRange = () => {
    setStartDate("")
    setEndDate("")
    setHasRange(false)
    onDateRangeChange("", "")
  }

  const handleStartChange = (v: string) => {
    setStartDate(v)
    // Si ya hay fecha fin, aplicar automáticamente
    if (v && endDate) {
      setHasRange(true)
      onDateRangeChange(v, endDate)
    }
  }

  const handleEndChange = (v: string) => {
    setEndDate(v)
    if (startDate && v) {
      setHasRange(true)
      onDateRangeChange(startDate, v)
    }
  }

  return (
    <div className="space-y-3">
      {/* Status tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {filterTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab)
              onStatusChange(tab)
            }}
            className={`px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab
                ? "border-b-2 border-forest text-forest"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Date range */}
      <div className="flex flex-wrap items-center gap-2">
        <Calendar className="size-4 shrink-0 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Rango de fechas:</span>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => handleStartChange(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
          />
          <span className="text-muted-foreground text-xs">hasta</span>
          <input
            type="date"
            value={endDate}
            min={startDate}
            onChange={(e) => handleEndChange(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
          />
        </div>

        {hasRange && (
          <button
            onClick={handleClearRange}
            className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary"
          >
            <X className="size-3" />
            Limpiar
          </button>
        )}

        {startDate && endDate && !hasRange && (
          <button
            onClick={handleApplyRange}
            className="rounded-lg bg-forest px-3 py-1.5 text-xs font-semibold text-white hover:bg-forest-light"
          >
            Aplicar
          </button>
        )}

        {hasRange && (
          <span className="rounded-full border border-forest/30 bg-forest/5 px-2.5 py-0.5 text-xs font-medium text-forest">
            Filtrando: {startDate} → {endDate}
          </span>
        )}
      </div>
    </div>
  )
}
