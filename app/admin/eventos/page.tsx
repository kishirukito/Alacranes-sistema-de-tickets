"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Plus, X, Calendar, Clock, Globe,
  CheckCircle, AlertCircle, RefreshCw, DollarSign, Save,
} from "lucide-react"
import { EventsFilter } from "@/components/admin/events-filter"
import { EventsList } from "@/components/admin/events-list"
import { EventDetailPanel, EventItem } from "@/components/admin/event-detail-panel"

// ── Extra types ───────────────────────────────────────────────────────────────

interface TeamOption  { id: string; name: string; shortName: string }
interface VenueOption { id: string; name: string; city: string }
interface ZoneOption  { id: string; zoneKey: string; name: string; price: number; totalSeats: number }

// ── Component ─────────────────────────────────────────────────────────────────

export default function EventosPage() {
  // Events state
  const [events, setEvents] = useState<EventItem[]>([])
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null)
  const [loadingEvents, setLoadingEvents] = useState(true)

  // Create event modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createStatus, setCreateStatus] = useState<"idle" | "ok" | "error">("idle")
  const [createError, setCreateError] = useState("")

  // Pricing/availability modal
  const [showPricingModal, setShowPricingModal] = useState(false)
  const [pricingZones, setPricingZones] = useState<EventItem["inventory"]>([])
  const [pricingEdits, setPricingEdits] = useState<Record<string, number | "">>({})
  const [availEdits, setAvailEdits] = useState<Record<string, number | "">>({})
  const [savingPrices, setSavingPrices] = useState(false)
  const [pricingSaveStatus, setPricingSaveStatus] = useState<"idle" | "saved" | "error">("idle")

  // Catalogs for selects
  const [teams, setTeams] = useState<TeamOption[]>([])
  const [venues, setVenues] = useState<VenueOption[]>([])
  const [zones, setZones] = useState<ZoneOption[]>([])

  const [createForm, setCreateForm] = useState({
    homeTeamId: "",
    awayTeamId: "",
    venueId: "",
    matchDate: "",
    matchTime: "20:00",
    season: new Date().getFullYear().toString(),
    competition: "Liga TDP",
    isPublished: false,
  })

  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: "", end: "" })
  const [appliedDateRange, setAppliedDateRange] = useState<{ start: string; end: string }>({ start: "", end: "" })

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchEvents = useCallback(async (status?: string, dateStart?: string, dateEnd?: string) => {
    setLoadingEvents(true)
    try {
      const params = new URLSearchParams()
      if (status && status !== "Todos") params.set("status", status)
      if (dateStart) params.set("startDate", dateStart)
      if (dateEnd) params.set("endDate", dateEnd)
      const url = params.toString() ? `/api/admin/eventos?${params}` : "/api/admin/eventos"
      const res = await fetch(url)
      const data = await res.json()
      setEvents(data.data || [])
    } catch { /* ignore */ } finally {
      setLoadingEvents(false)
    }
  }, [])

  const fetchCatalogs = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/catalogs")
      const data = await res.json()
      if (data.success) {
        setTeams(data.teams || [])
        setVenues(data.venues || [])
        setZones(data.zones || [])
        if (data.venues?.length) {
          setCreateForm(f => ({ ...f, venueId: data.venues[0].id }))
        }
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    fetchEvents()
    fetchCatalogs()
  }, [fetchEvents, fetchCatalogs])

  // ── Event handlers ─────────────────────────────────────────────────────────

  const [currentStatus, setCurrentStatus] = useState("Todos")

  const handleStatusChange = (status: string) => {
    setCurrentStatus(status)
    fetchEvents(status, appliedDateRange.start, appliedDateRange.end)
  }

  const handleDateRangeChange = (start: string, end: string) => {
    setDateRange({ start, end })
    // Solo re-fetch si hay rango completo o reset
    if ((start && end) || (!start && !end)) {
      setAppliedDateRange({ start, end })
      fetchEvents(currentStatus, start, end)
    }
  }

  const handleSelectEvent = (event: EventItem) => {
    fetch(`/api/admin/eventos/${event.id}`)
      .then(r => r.json())
      .then(d => setSelectedEvent(d.data ?? null))
      .catch(console.error)
  }

  const handleSaveEvent = async (updatedEvent: EventItem) => {
    const res = await fetch(`/api/admin/eventos/${updatedEvent.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matchDate: updatedEvent.date,
        matchTime: updatedEvent.time,
        competition: updatedEvent.competition,
        season: updatedEvent.season,
        isPublished: updatedEvent.isPublished ?? updatedEvent.status === "Activo",
      }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || "Error al guardar")
    }
    fetchEvents()
  }

  const handleDeleteEvent = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este evento?")) return
    const response = await fetch(`/api/admin/eventos/${id}`, { method: "DELETE" })
    if (response.ok) {
      setEvents(prev => prev.filter(e => e.id !== id))
      setSelectedEvent(null)
    }
  }

  // ── Zone pricing ───────────────────────────────────────────────────────────

  const openPricingModal = () => {
    if (!selectedEvent?.inventory?.length) return
    const inv = selectedEvent.inventory
    setPricingZones(inv)
    const edits: Record<string, number | ""> = {}
    const avail: Record<string, number | ""> = {}
    inv.forEach(z => {
      edits[z.inventoryId] = z.priceOverride !== null ? z.priceOverride : ""
      avail[z.inventoryId] = z.availableSeats
    })
    setPricingEdits(edits)
    setAvailEdits(avail)
    setPricingSaveStatus("idle")
    setShowPricingModal(true)
  }

  const handleSavePrices = async () => {
    if (!pricingZones?.length) return
    setSavingPrices(true)
    setPricingSaveStatus("idle")
    try {
      await Promise.all(
        pricingZones.map(async (zone) => {
          const priceOverride = pricingEdits[zone.inventoryId]
          const availableSeats = availEdits[zone.inventoryId]
          return fetch("/api/admin/zonas", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              inventoryId: zone.inventoryId,
              priceOverride: priceOverride === "" ? null : Number(priceOverride),
              availableSeats: availableSeats === "" ? undefined : Number(availableSeats),
            }),
          })
        })
      )
      setPricingSaveStatus("saved")
      // Refresh selected event to show updated prices
      if (selectedEvent) {
        fetch(`/api/admin/eventos/${selectedEvent.id}`)
          .then(r => r.json())
          .then(d => setSelectedEvent(d.data ?? null))
          .catch(console.error)
      }
      setTimeout(() => {
        setShowPricingModal(false)
        setPricingSaveStatus("idle")
      }, 1000)
    } catch {
      setPricingSaveStatus("error")
      setTimeout(() => setPricingSaveStatus("idle"), 3000)
    } finally {
      setSavingPrices(false)
    }
  }

  // ── Create event ───────────────────────────────────────────────────────────

  const handleCreateEvent = async () => {
    if (!createForm.homeTeamId || !createForm.awayTeamId || !createForm.matchDate || !createForm.venueId) {
      setCreateError("Completa todos los campos requeridos.")
      return
    }
    if (createForm.homeTeamId === createForm.awayTeamId) {
      setCreateError("El equipo local y visitante no pueden ser el mismo.")
      return
    }
    setCreating(true)
    setCreateError("")
    setCreateStatus("idle")
    try {
      // Build zonesInventory: use total_seats from DB as initial availability
      const zonesInventory = zones.map(z => ({
        zoneId: z.id,
        availableSeats: z.totalSeats, // auto from BD
      }))

      const res = await fetch("/api/admin/eventos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...createForm, zonesInventory }),
      })
      const data = await res.json()
      if (!res.ok) {
        setCreateError(data.error || "Error al crear el evento.")
        setCreateStatus("error")
        return
      }
      setCreateStatus("ok")
      fetchEvents()
      setTimeout(() => {
        setShowCreateModal(false)
        setCreateStatus("idle")
        setCreateForm(f => ({ ...f, homeTeamId: "", awayTeamId: "", matchDate: "", matchTime: "20:00" }))
      }, 1200)
    } catch {
      setCreateError("Error de red. Intenta de nuevo.")
      setCreateStatus("error")
    } finally {
      setCreating(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Create button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-lg bg-forest px-5 py-2.5 text-sm font-semibold text-white hover:bg-forest-light transition-colors"
        >
          <Plus className="size-4" />
          Crear nuevo evento
        </button>
      </div>

      {/* Events list */}
      <div className="space-y-4">
        <EventsFilter onStatusChange={handleStatusChange} onDateRangeChange={handleDateRangeChange} />
        {loadingEvents ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            <div className="size-6 animate-spin rounded-full border-4 border-emerald border-t-transparent mr-3" />
            Cargando eventos...
          </div>
        ) : events.length > 0 ? (
          <EventsList
            events={events}
            onSelectEvent={handleSelectEvent}
            onDeleteEvent={handleDeleteEvent}
          />
        ) : (
          <div className="rounded-lg border border-border bg-card py-12 text-center text-muted-foreground">
            No hay eventos para mostrar
          </div>
        )}
      </div>

      {/* Detail panel */}
      <EventDetailPanel
        event={selectedEvent}
        onSave={handleSaveEvent}
        onPricingClick={openPricingModal}
      />

      {/* ── Modal: Precios por zona ── */}
      {showPricingModal && pricingZones && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => { if (!savingPrices) setShowPricingModal(false) }}
          />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-forest/10">
                  <DollarSign className="size-4 text-forest" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">Disponibilidad por Zona</h2>
                  <p className="text-xs text-muted-foreground">
                    Ajusta precio y boletos disponibles por zona
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPricingModal(false)}
                disabled={savingPrices}
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary disabled:opacity-50"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Zone rows */}
            <div className="space-y-3">
              {pricingZones.map((zone) => (
                <div
                  key={zone.inventoryId}
                  className="rounded-lg border border-border bg-secondary/40 px-4 py-3"
                >
                  <div className="mb-2">
                    <p className="text-sm font-semibold text-foreground">{zone.zoneName}</p>
                    <p className="text-xs text-muted-foreground">
                      Precio base: ${zone.basePrice} · {zone.availableSeats}/{zone.totalSeats} disponibles
                      {zone.soldSeats !== undefined && ` · ${zone.soldSeats} vendidos`}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    {/* Price override */}
                    <div className="flex-1">
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Precio</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          placeholder={String(zone.basePrice)}
                          value={pricingEdits[zone.inventoryId] ?? ""}
                          onChange={(e) =>
                            setPricingEdits(prev => ({
                              ...prev,
                              [zone.inventoryId]: e.target.value === "" ? "" : parseFloat(e.target.value),
                            }))
                          }
                          className="w-full rounded-lg border border-border bg-card py-2 pl-7 pr-3 text-sm focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
                        />
                      </div>
                    </div>
                    {/* Available seats */}
                    <div className="flex-1">
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Disponibles</label>
                      <input
                        type="number"
                        min={0}
                        max={zone.totalSeats}
                        step={1}
                        placeholder={String(zone.availableSeats)}
                        value={availEdits[zone.inventoryId] ?? ""}
                        onChange={(e) =>
                          setAvailEdits(prev => ({
                            ...prev,
                            [zone.inventoryId]: e.target.value === "" ? "" : parseInt(e.target.value, 10),
                          }))
                        }
                        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowPricingModal(false)}
                disabled={savingPrices}
                className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSavePrices}
                disabled={savingPrices || pricingSaveStatus === "saved"}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60 ${
                  pricingSaveStatus === "error" ? "bg-red-600" : "bg-forest hover:bg-forest-light"
                }`}
              >
                {savingPrices ? (
                  <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : pricingSaveStatus === "saved" ? (
                  <CheckCircle className="size-4" />
                ) : (
                  <Save className="size-4" />
                )}
                {savingPrices ? "Guardando..." : pricingSaveStatus === "saved" ? "Guardado ✓" : "Guardar Precios"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Crear Evento ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => { if (!creating) { setShowCreateModal(false); setCreateError(""); setCreateStatus("idle") } }}
          />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-forest/10">
                  <Calendar className="size-4 text-forest" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">Crear nuevo evento</h2>
                  <p className="text-xs text-muted-foreground">Completa los datos del partido.</p>
                </div>
              </div>
              <button
                onClick={() => { setShowCreateModal(false); setCreateError(""); setCreateStatus("idle") }}
                disabled={creating}
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary disabled:opacity-50"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Form */}
            <div className="space-y-4">
              {/* Equipo Local */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Equipo Local <span className="text-red-500">*</span>
                </label>
                <select
                  value={createForm.homeTeamId}
                  onChange={e => setCreateForm(f => ({ ...f, homeTeamId: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
                >
                  <option value="">— Seleccionar equipo local —</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {/* Equipo Visitante */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Equipo Visitante <span className="text-red-500">*</span>
                </label>
                <select
                  value={createForm.awayTeamId}
                  onChange={e => setCreateForm(f => ({ ...f, awayTeamId: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
                >
                  <option value="">— Seleccionar equipo visitante —</option>
                  {teams.filter(t => t.id !== createForm.homeTeamId).map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {/* Sede */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Sede <span className="text-red-500">*</span>
                </label>
                <select
                  value={createForm.venueId}
                  onChange={e => setCreateForm(f => ({ ...f, venueId: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
                >
                  <option value="">— Seleccionar sede —</option>
                  {venues.map(v => (
                    <option key={v.id} value={v.id}>{v.name} — {v.city}</option>
                  ))}
                </select>
              </div>

              {/* Fecha + Hora */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Fecha <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="date"
                      value={createForm.matchDate}
                      onChange={e => setCreateForm(f => ({ ...f, matchDate: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-secondary py-2.5 pl-10 pr-3 text-sm focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Hora</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="time"
                      value={createForm.matchTime}
                      onChange={e => setCreateForm(f => ({ ...f, matchTime: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-secondary py-2.5 pl-10 pr-3 text-sm focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
                    />
                  </div>
                </div>
              </div>

              {/* Competición + Temporada */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Competición</label>
                  <input
                    type="text"
                    value={createForm.competition}
                    onChange={e => setCreateForm(f => ({ ...f, competition: e.target.value }))}
                    placeholder="Liga TDP"
                    className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Temporada</label>
                  <input
                    type="text"
                    value={createForm.season}
                    onChange={e => setCreateForm(f => ({ ...f, season: e.target.value }))}
                    placeholder="2026"
                    className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
                  />
                </div>
              </div>

              {/* Publicar inmediatamente */}
              <label className="flex cursor-pointer items-center gap-3">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={createForm.isPublished}
                    onChange={e => setCreateForm(f => ({ ...f, isPublished: e.target.checked }))}
                    className="sr-only"
                  />
                  <div className={`h-5 w-9 rounded-full transition-colors ${createForm.isPublished ? "bg-forest" : "bg-secondary border border-border"}`}>
                    <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${createForm.isPublished ? "translate-x-4" : "translate-x-0.5"}`} />
                  </div>
                </div>
                <span className="text-sm text-muted-foreground">Publicar inmediatamente</span>
              </label>

              {/* Zones preview — read only, availability auto from BD */}
              {zones.length > 0 && (
                <div className="rounded-lg border border-border bg-secondary/30 p-3">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Zonas que se crearán automáticamente
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {zones.map(z => (
                      <span key={z.id} className="rounded-md border border-border bg-card px-2 py-0.5 text-xs text-foreground">
                        {z.name} — ${z.price} · {z.totalSeats} asientos
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    La disponibilidad inicial será igual a la capacidad total de cada zona.
                  </p>
                </div>
              )}

              {/* Error */}
              {createError && (
                <p className="flex items-center gap-2 rounded-lg bg-red-50/20 px-3 py-2 text-xs text-red-400">
                  <AlertCircle className="size-3.5 shrink-0" />
                  {createError}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => { setShowCreateModal(false); setCreateError(""); setCreateStatus("idle") }}
                disabled={creating}
                className="rounded-lg px-5 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateEvent}
                disabled={creating || !createForm.homeTeamId || !createForm.awayTeamId || !createForm.matchDate || !createForm.venueId || createStatus === "ok"}
                className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  createStatus === "ok" ? "bg-emerald" : "bg-forest hover:bg-forest-light"
                }`}
              >
                {creating ? (
                  <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : createStatus === "ok" ? (
                  <CheckCircle className="size-4" />
                ) : (
                  <Plus className="size-4" />
                )}
                {creating ? "Guardando..." : createStatus === "ok" ? "Creado ✓" : "Crear Evento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
