"use client"

import { useState, useEffect } from "react"
import { Save, CheckCircle, AlertCircle, Eye, EyeOff, Calendar, Users } from "lucide-react"

export interface EventItem {
  id: string
  name: string
  date: string
  time: string
  status: string
  isPublished?: boolean
  homeTeamId?: string
  awayTeamId?: string
  venueId?: string
  season?: string
  competition?: string
  dayOfWeek?: string
  totalAvailability?: number
  participants?: string
  availability?: { sold: number; total: number }
  homeCode?: string
  awayCode?: string
  venue?: string
  inventory?: InventoryZone[]
}

export interface InventoryZone {
  inventoryId: string
  zoneId: string
  zoneName: string
  zoneKey: string
  availableSeats: number
  soldSeats: number
  totalSeats: number
  priceOverride: number | null
  basePrice: number
}

interface EventDetailPanelProps {
  event: EventItem | null
  onSave: (updatedEvent: EventItem) => void
  onPricingClick?: () => void
}

const statusOptions = ["Próximo", "Activo", "Agotado", "Cancelado"]

const inputClass =
  "w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"

export function EventDetailPanel({
  event,
  onSave,
  onPricingClick: _onPricingClick,
}: EventDetailPanelProps) {
  const [formData, setFormData] = useState<EventItem>(
    event ?? { id: "", name: "", date: "", time: "", status: "Próximo" }
  )
  // Per-zone availability edits: inventoryId → availableSeats
  const [availEdits, setAvailEdits] = useState<Record<string, number | "">>({})
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle")
  const [saveError, setSaveError] = useState<string | null>(null)

  // Sync when a different event is selected
  useEffect(() => {
    if (event) {
      setFormData({ ...event })
      // Pre-fill availability edits from inventory
      const edits: Record<string, number | ""> = {}
      event.inventory?.forEach(z => {
        edits[z.inventoryId] = z.availableSeats
      })
      setAvailEdits(edits)
      setSaveStatus("idle")
      setSaveError(null)
    }
  }, [event?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!event) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card px-6 py-10 text-center">
        <Calendar className="mx-auto mb-3 size-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">
          Selecciona un evento de la lista para editar sus detalles
        </p>
      </div>
    )
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveStatus("idle")
    setSaveError(null)
    try {
      // 1. Save event fields
      await onSave({ ...formData })

      // 2. Save zone availability edits
      const inventory = formData.inventory ?? []
      if (inventory.length > 0) {
        await Promise.all(
          inventory.map(async (zone) => {
            const newAvail = availEdits[zone.inventoryId]
            if (newAvail === "" || newAvail === undefined) return
            return fetch("/api/admin/zonas", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                inventoryId: zone.inventoryId,
                availableSeats: Number(newAvail),
              }),
            })
          })
        )
      }

      setSaveStatus("saved")
      setTimeout(() => setSaveStatus("idle"), 3000)
    } catch (err: any) {
      setSaveStatus("error")
      setSaveError(err?.message || "Error al guardar")
      setTimeout(() => setSaveStatus("idle"), 4000)
    } finally {
      setSaving(false)
    }
  }

  const isPublished = formData.isPublished ?? formData.status === "Activo"
  const inventory = formData.inventory ?? []

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-forest/10">
            <Save className="size-3.5 text-forest" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Detalle del Evento</h3>
            <p className="text-xs text-muted-foreground">{formData.name}</p>
          </div>
        </div>
        {/* Publish toggle */}
        <button
          onClick={() => setFormData((p) => ({ ...p, isPublished: !p.isPublished }))}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
            isPublished
              ? "border-forest/30 bg-forest/10 text-forest"
              : "border-border bg-secondary text-muted-foreground"
          }`}
        >
          {isPublished ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
          {isPublished ? "Publicado" : "No publicado"}
        </button>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Nombre — full row */}
        <div className="sm:col-span-2 xl:col-span-4">
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Nombre del Evento
          </label>
          <input
            type="text"
            name="name"
            value={formData.name || ""}
            onChange={handleChange}
            placeholder="Ej. Alacranes vs Raya2"
            className={inputClass}
          />
        </div>

        {/* Fecha */}
        <div className="xl:col-span-2">
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Fecha
          </label>
          <input
            type="date"
            name="date"
            value={formData.date || ""}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        {/* Hora */}
        <div className="xl:col-span-2">
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Hora
          </label>
          <input
            type="time"
            name="time"
            value={formData.time || ""}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        {/* Competición */}
        <div className="xl:col-span-2">
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Competición
          </label>
          <input
            type="text"
            name="competition"
            value={formData.competition || ""}
            onChange={handleChange}
            placeholder="Liga TDP"
            className={inputClass}
          />
        </div>

        {/* Temporada */}
        <div className="xl:col-span-2">
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Temporada
          </label>
          <input
            type="text"
            name="season"
            value={formData.season || ""}
            onChange={handleChange}
            placeholder="2026"
            className={inputClass}
          />
        </div>

        {/* Estatus */}
        <div className="sm:col-span-2 xl:col-span-4">
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Estatus
          </label>
          <select
            name="status"
            value={formData.status || ""}
            onChange={handleChange}
            className={inputClass}
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* ── Disponibilidad por zona — editable ── */}
        {inventory.length > 0 && (
          <div className="sm:col-span-2 xl:col-span-4">
            <label className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              <Users className="size-3" />
              Disponibilidad por Zona
            </label>
            <div className="space-y-2">
              {inventory.map((zone) => {
                const current = availEdits[zone.inventoryId] ?? zone.availableSeats
                // soldSeats viene del API (tickets reales); fallback al cálculo anterior
                const sold = zone.soldSeats ?? (zone.totalSeats - zone.availableSeats)
                const pct = zone.totalSeats > 0
                  ? Math.round(((typeof current === "number" ? current : zone.availableSeats) / zone.totalSeats) * 100)
                  : 0
                return (
                  <div
                    key={zone.inventoryId}
                    className="flex items-center gap-3 rounded-lg border border-border bg-secondary/40 px-3 py-2.5"
                  >
                    {/* Zone name + sold info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">{zone.zoneName}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {sold} vendidos · {zone.totalSeats} capacidad total
                      </p>
                      {/* Mini progress bar */}
                      <div className="mt-1.5 h-1 w-full rounded-full bg-border overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    {/* Editable available seats */}
                    <div className="w-24 flex-shrink-0">
                      <p className="mb-0.5 text-center text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Disponibles
                      </p>
                      <input
                        type="number"
                        min={0}
                        max={zone.totalSeats}
                        step={1}
                        value={current}
                        onChange={(e) =>
                          setAvailEdits(prev => ({
                            ...prev,
                            [zone.inventoryId]: e.target.value === "" ? "" : parseInt(e.target.value, 10),
                          }))
                        }
                        className="w-full rounded-lg border border-border bg-card py-1.5 text-center text-sm font-bold focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Error */}
        {saveStatus === "error" && saveError && (
          <div className="sm:col-span-2 xl:col-span-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50/10 px-3 py-2.5">
            <AlertCircle className="size-4 shrink-0 text-red-500" />
            <p className="text-xs text-red-500">{saveError}</p>
          </div>
        )}

        {/* Buttons */}
        <div className="sm:col-span-2 xl:col-span-4 flex flex-col gap-2.5 pt-2 sm:flex-row">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60 ${
              saveStatus === "error"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-forest hover:bg-forest-light"
            }`}
          >
            {saving ? (
              <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : saveStatus === "saved" ? (
              <CheckCircle className="size-4" />
            ) : saveStatus === "error" ? (
              <AlertCircle className="size-4" />
            ) : (
              <Save className="size-4" />
            )}
            {saving ? "Guardando..." : saveStatus === "saved" ? "Guardado ✓" : "Guardar Cambios"}
          </button>
        </div>
      </div>
    </div>
  )
}
