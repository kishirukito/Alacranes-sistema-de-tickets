"use client"

import { useState, useEffect } from "react"
import { Save, CheckCircle, AlertCircle } from "lucide-react"

type ZoneId = "premium-norte" | "general-sur" | "lateral-este" | "lateral-oeste"

interface Zone {
  id: ZoneId          // zone_key (ej: "lateral-oeste")
  zoneId: string      // UUID real de la tabla zones
  inventoryId?: string // UUID de match_zone_inventory si aplica
  name: string
  price: number
  status: string
  capacity: number
  sold: number
}

interface ZoneDetailPanelProps {
  selectedZoneId: ZoneId | null
}

const statusOptions = ["Disponible", "Limitado", "Agotado", "Inactivo"]

export function ZoneDetailPanel({ selectedZoneId }: ZoneDetailPanelProps) {
  const [zones, setZones] = useState<Zone[]>([])
  const [zone, setZone] = useState<Zone | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle")

  useEffect(() => {
    fetch("/api/admin/zonas")
      .then((r) => r.json())
      .then((d) => {
        // Normalizar respuesta: pueden venir con zone_key o con id
        const normalized = (d.data || []).map((z: any) => ({
          id: z.zone_key ?? z.id,
          zoneId: z.id,             // UUID real
          inventoryId: z.inventoryId ?? undefined,
          name: z.name,
          price: z.price ?? 0,
          status: z.status ?? "Disponible",
          capacity: z.total_seats ?? z.capacity ?? 0,
          sold: z.sold ?? 0,
        }))
        setZones(normalized)
      })
      .catch(console.error)
  }, [])

  useEffect(() => {
    if (!selectedZoneId || zones.length === 0) return
    const found = zones.find((z) => z.id === selectedZoneId)
    if (found) setZone({ ...found })
  }, [selectedZoneId, zones])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    if (!zone) return
    const { name, value } = e.target
    const numFields = ["price", "capacity"]
    setZone({ ...zone, [name]: numFields.includes(name) ? parseFloat(value) || 0 : value })
  }

  const handleSave = async () => {
    if (!zone) return
    setSaving(true)
    setSaveStatus("idle")
    try {
      const payload: Record<string, unknown> = {
        zoneId: zone.zoneId,   // UUID real
        name: zone.name,
        price: zone.price,
        totalSeats: zone.capacity,
      }
      if (zone.inventoryId) {
        payload.inventoryId = zone.inventoryId
      }

      const res = await fetch("/api/admin/zonas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error("Error al guardar")

      // Refrescar lista para que el estado quede sincronizado
      const freshRes = await fetch("/api/admin/zonas")
      const fresh = await freshRes.json()
      const normalized = (fresh.data || []).map((z: any) => ({
        id: z.zone_key ?? z.id,
        zoneId: z.id,
        inventoryId: z.inventoryId ?? undefined,
        name: z.name,
        price: z.price ?? 0,
        status: z.status ?? "Disponible",
        capacity: z.total_seats ?? z.capacity ?? 0,
        sold: z.sold ?? 0,
      }))
      setZones(normalized)
      // Update current zone view with refreshed data
      const updated = normalized.find((z: Zone) => z.zoneId === zone.zoneId)
      if (updated) setZone({ ...updated })

      setSaveStatus("saved")
      setTimeout(() => setSaveStatus("idle"), 3000)
    } catch {
      setSaveStatus("error")
      setTimeout(() => setSaveStatus("idle"), 3000)
    } finally {
      setSaving(false)
    }
  }

  if (!zone) {
    return (
      <div className="flex h-full flex-col rounded-xl border border-border bg-card p-6">
        <h3 className="mb-1 text-base font-semibold text-foreground">
          Detalles de la Zona
        </h3>
        <p className="text-xs text-muted-foreground">
          Selecciona una zona del mapa para editar sus detalles.
        </p>
      </div>
    )
  }

  const soldPct = Math.round((zone.sold / zone.capacity) * 100)

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card p-6">
      <h3 className="mb-1 text-base font-semibold text-foreground">
        Detalles de la Zona
      </h3>
      <p className="mb-6 text-xs text-muted-foreground">
        Edita el nombre, precio, capacidad y disponibilidad.
      </p>

      <div className="flex flex-1 flex-col gap-5">
        {/* Zone name */}
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Nombre de la Zona
          </label>
          <input
            type="text"
            name="name"
            value={zone.name}
            onChange={handleChange}
            className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
          />
        </div>

        {/* Price */}
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Precio por Asiento
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
              $
            </span>
            <input
              type="number"
              name="price"
              value={zone.price}
              onChange={handleChange}
              step="0.01"
              className="w-full rounded-lg border border-border bg-secondary py-2.5 pl-7 pr-3 text-sm focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
            />
          </div>
        </div>

        {/* Sale status */}
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Estado de Venta
          </label>
          <select
            name="status"
            value={zone.status}
            onChange={handleChange}
            className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Capacity — editable */}
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Capacidad Total
          </label>
          <input
            type="number"
            name="capacity"
            value={zone.capacity}
            onChange={handleChange}
            min={0}
            className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
          />
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className={`mt-auto flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white transition-colors disabled:opacity-60 ${
            saveStatus === "error"
              ? "bg-red-600 hover:bg-red-700"
              : "bg-emerald hover:bg-emerald-dark"
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
          {saving ? "Guardando..." : saveStatus === "saved" ? "Guardado ✓" : saveStatus === "error" ? "Error al guardar" : "Guardar Cambios"}
        </button>
      </div>
    </div>
  )
}
