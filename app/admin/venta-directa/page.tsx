"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Banknote, Calendar, MapPin, Gift,
  ChevronRight, CheckCircle2, RotateCcw, Loader2,
  Minus, Plus, AlertCircle, Receipt, Ticket,
} from "lucide-react"
import { StadiumMap } from "@/components/stadium-map"

// ─── Types ───────────────────────────────────────────────────────────────────

type ZoneId = "premium-norte" | "general-sur" | "lateral-este" | "lateral-oeste"
const VALID_ZONE_IDS = ["premium-norte", "general-sur", "lateral-este", "lateral-oeste"] as const

function mapToZoneId(zoneKey: string): ZoneId {
  const k = zoneKey.toLowerCase()
  if (VALID_ZONE_IDS.includes(k as ZoneId)) return k as ZoneId
  if (k.includes("premium") || k.includes("norte")) return "premium-norte"
  if (k.includes("sur") || k.includes("general")) return "general-sur"
  if (k.includes("este") || k.includes("east")) return "lateral-este"
  return "lateral-oeste"
}

interface Match {
  id: string
  date: string
  dayOfWeek: string
  time: string
  homeTeam: { id: string; name: string; shortName: string; logo?: string | null }
  awayTeam: { id: string; name: string; shortName: string; logo?: string | null }
  venue: string
}

interface Zone {
  id: ZoneId
  zoneId: string
  inventoryId: string
  name: string
  price: number
  available: number
  capacity: number
  color: string
  gate: string
}

type Step = 1 | 2 | 3

// ─── Step indicator ──────────────────────────────────────────────────────────

function StepDot({ n, current, label }: { n: number; current: Step; label: string }) {
  const done = n < current
  const active = n === current
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={`flex size-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
        done ? "bg-emerald text-white" : active ? "bg-forest text-white" : "bg-secondary text-muted-foreground"
      }`}>
        {done ? <CheckCircle2 className="size-4" /> : n}
      </div>
      <span className={`text-[10px] font-semibold tracking-wide ${active ? "text-forest" : "text-muted-foreground"}`}>
        {label}
      </span>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function VentaDirectaPage() {
  const [step, setStep] = useState<Step>(1)

  // Step 1
  const [matches, setMatches] = useState<Match[]>([])
  const [loadingMatches, setLoadingMatches] = useState(true)
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)

  // Step 2 — zona + mapa
  const [zoneMap, setZoneMap] = useState<Map<ZoneId, Zone>>(new Map())
  const [loadingZones, setLoadingZones] = useState(false)
  const [selectedZoneId, setSelectedZoneId] = useState<ZoneId>("premium-norte")
  const [quantity, setQuantity] = useState(1)

  // Step 3 — resultado
  const [processing, setProcessing] = useState(false)
  const [saleResult, setSaleResult] = useState<{
    success: boolean
    orderId?: string
    tickets?: { id: string; qrCode: string }[]
    total?: number
    isCourtesy?: boolean
    error?: string
  } | null>(null)

  // Cortesía mode
  const [isCourtesy, setIsCourtesy] = useState(false)

  // ── Fetch matches ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/matches?upcoming=true&limit=20")
      .then((r) => r.json())
      .then((d) => setMatches(d.data || []))
      .catch(() => {})
      .finally(() => setLoadingMatches(false))
  }, [])

  // ── Fetch zones when match selected ───────────────────────────────────────
  useEffect(() => {
    if (!selectedMatch) return
    setLoadingZones(true)
    setZoneMap(new Map())
    fetch(`/api/admin/zonas?matchId=${selectedMatch.id}`)
      .then((r) => r.json())
      .then((d) => {
        const raw: Zone[] = (d.data || []).map((z: {
          id: string; zoneId: string; inventoryId: string; name: string;
          price: number; available: number; capacity: number; color: string; gate: string
        }) => ({
          id: mapToZoneId(z.id),
          zoneId: z.zoneId,
          inventoryId: z.inventoryId,
          name: z.name,
          price: z.price,
          available: z.available,
          capacity: z.capacity,
          color: z.color,
          gate: z.gate,
        }))
        const map = new Map<ZoneId, Zone>()
        for (const zone of raw) {
          if (!map.has(zone.id) || map.get(zone.id)!.available === 0) {
            map.set(zone.id, zone)
          }
        }
        setZoneMap(map)
        // Pre-select first available
        const first = raw.find((z) => z.available > 0)
        if (first) setSelectedZoneId(first.id)
      })
      .catch(() => {})
      .finally(() => setLoadingZones(false))
  }, [selectedMatch])

  const currentZone = zoneMap.get(selectedZoneId) ?? null
  const totalAvailable = Array.from(zoneMap.values()).reduce((s, z) => s + z.available, 0)

  // ── Process sale ───────────────────────────────────────────────────────────
  const handleConfirmSale = useCallback(async () => {
    if (!selectedMatch || !currentZone) return
    setProcessing(true)
    setSaleResult(null)

    try {
      const res = await fetch("/api/admin/venta-directa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: selectedMatch.id,
          zoneId: currentZone.zoneId,
          inventoryId: currentZone.inventoryId,
          quantity,
          pricePer: isCourtesy ? 0 : currentZone.price,
          isCourtesy,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSaleResult({ success: false, error: data.error || "Error al procesar la venta" })
      } else {
        setSaleResult({
          success: true,
          orderId: data.data.orderId,
          tickets: data.data.tickets,
          total: data.data.total,
          isCourtesy,
        })
        // Abrir descarga de cada boleto automáticamente
        setTimeout(() => {
          (data.data.tickets as { id: string }[]).forEach((t, i) => {
            setTimeout(() => {
              window.open(`/api/admin/tickets/${t.id}/download`, "_blank")
            }, i * 600) // pequeño delay entre ventanas para no bloquear popup
          })
        }, 500)
        // Update local availability
        setZoneMap((prev) => {
          const next = new Map(prev)
          const z = next.get(selectedZoneId)
          if (z) next.set(selectedZoneId, { ...z, available: z.available - quantity })
          return next
        })
      }
      setStep(3)
    } catch {
      setSaleResult({ success: false, error: "Error de conexión. Intenta de nuevo." })
      setStep(3)
    } finally {
      setProcessing(false)
    }
  }, [selectedMatch, currentZone, quantity, selectedZoneId, isCourtesy])

  const handleReset = () => {
    setStep(1)
    setSelectedMatch(null)
    setZoneMap(new Map())
    setSelectedZoneId("premium-norte")
    setQuantity(1)
    setSaleResult(null)
    setIsCourtesy(false)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
            <Banknote className="size-6 text-emerald" />
            Venta Directa en Efectivo
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Registra boletos vendidos en caja — sin cuenta de usuario requerida
          </p>
        </div>
        {step > 1 && step < 3 && (
          <button
            onClick={handleReset}
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-secondary"
          >
            <RotateCcw className="size-4" />
            Reiniciar
          </button>
        )}
      </div>

      {/* Step indicator */}
      <div className="rounded-xl border border-border bg-card px-6 py-4">
        <div className="flex items-center">
          {[
            { n: 1, label: "Partido" },
            { n: 2, label: "Zona y cantidad" },
            { n: 3, label: "Resultado" },
          ].map((s, i) => (
            <div key={s.n} className="flex flex-1 items-center">
              <div className="flex flex-1 flex-col items-center">
                <StepDot n={s.n} current={step} label={s.label} />
              </div>
              {i < 2 && (
                <div className={`h-px w-full max-w-[80px] transition-colors ${step > s.n ? "bg-emerald" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── STEP 1: Seleccionar partido ── */}
      {step === 1 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border px-5 py-3 flex items-center gap-2">
            <Calendar className="size-4 text-forest" />
            <h2 className="text-sm font-semibold text-foreground">Selecciona el partido</h2>
          </div>

          {loadingMatches ? (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              <span className="text-sm">Cargando partidos...</span>
            </div>
          ) : matches.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No hay partidos próximos disponibles
            </div>
          ) : (
            <div className="divide-y divide-border">
              {matches.map((match) => (
                <button
                  key={match.id}
                  onClick={() => { setSelectedMatch(match); setStep(2) }}
                  className="group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-secondary/50"
                >
                  <div className="flex min-w-[100px] flex-col">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{match.dayOfWeek}</span>
                    <span className="text-base font-black text-foreground">{match.date}</span>
                    <span className="text-xs text-muted-foreground">{match.time}</span>
                  </div>

                  <div className="flex flex-1 items-center gap-3">
                    <div className="flex size-9 items-center justify-center overflow-hidden rounded-lg bg-emerald text-xs font-black text-white">
                      {match.homeTeam.logo ? <img src={match.homeTeam.logo} alt="" className="size-full object-contain p-0.5" /> : match.homeTeam.shortName}
                    </div>
                    <span className="text-xs font-bold text-muted-foreground">vs</span>
                    <div className="flex size-9 items-center justify-center overflow-hidden rounded-lg bg-secondary text-xs font-black text-foreground">
                      {match.awayTeam.logo ? <img src={match.awayTeam.logo} alt="" className="size-full object-contain p-0.5" /> : match.awayTeam.shortName}
                    </div>
                    <div className="ml-2">
                      <p className="text-sm font-semibold text-foreground">{match.homeTeam.name} vs {match.awayTeam.name}</p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3" />{match.venue}</p>
                    </div>
                  </div>

                  <ChevronRight className="size-4 text-muted-foreground transition-colors group-hover:text-foreground" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── STEP 2: Zona + mapa + cantidad ── */}
      {step === 2 && selectedMatch && (
        <div className="space-y-4">
          {/* Match summary */}
          <div className="flex items-center gap-3 rounded-xl border border-emerald/20 bg-emerald/5 px-5 py-3">
            <CheckCircle2 className="size-4 shrink-0 text-emerald" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Partido seleccionado</p>
              <p className="text-sm font-semibold text-foreground">
                {selectedMatch.homeTeam.name} vs {selectedMatch.awayTeam.name} · {selectedMatch.date}
              </p>
            </div>
            <button onClick={() => { setStep(1) }} className="text-xs text-emerald hover:underline">Cambiar</button>
          </div>

          {loadingZones ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-16 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              <span className="text-sm">Cargando zonas...</span>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
              {/* Stadium map */}
              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <MapPin className="size-4 text-forest" />
                  Mapa del estadio — haz clic para seleccionar zona
                </h2>
                <StadiumMap
                  selectedZone={selectedZoneId}
                  onSelectZone={(z) => {
                    setSelectedZoneId(z)
                    setQuantity(1)
                  }}
                  availableSeats={totalAvailable}
                />

                {/* Zone info pills */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {Array.from(zoneMap.values()).map((z) => (
                    <button
                      key={z.id}
                      onClick={() => { setSelectedZoneId(z.id); setQuantity(1) }}
                      disabled={z.available === 0}
                      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-40 ${
                        selectedZoneId === z.id
                          ? "border-forest bg-forest/10 text-forest"
                          : "border-border text-muted-foreground hover:border-forest/40"
                      }`}
                    >
                      <div className="size-2 rounded-full" style={{ backgroundColor: z.color }} />
                      {z.name}
                      <span className="font-normal">· ${z.price}</span>
                      <span className={z.available === 0 ? "text-red-400" : "text-emerald"}>
                        ({z.available === 0 ? "Agotado" : `${z.available} disp.`})
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Right panel: zone detail + quantity + confirm */}
              <div className="space-y-4">
                {currentZone ? (
                  <>
                    {/* Zone card */}
                    <div className="rounded-xl border border-border bg-card p-5">
                      <div className="mb-3 flex items-center gap-2">
                        <div className="size-3 rounded-full" style={{ backgroundColor: currentZone.color }} />
                        <h3 className="text-sm font-bold text-foreground">{currentZone.name}</h3>
                      </div>
                      <p className="text-3xl font-black text-forest">${currentZone.price.toFixed(0)}<span className="text-sm font-normal text-muted-foreground"> /boleto</span></p>
                      <p className="mt-1 text-xs text-muted-foreground">Puerta {currentZone.gate} · {currentZone.available} lugares disponibles</p>

                      {/* Capacity bar */}
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.round((currentZone.available / currentZone.capacity) * 100)}%`,
                            backgroundColor: currentZone.color,
                          }}
                        />
                      </div>
                    </div>

                    {/* Cortesía toggle */}
                    <div className={`flex items-center justify-between rounded-xl border p-4 transition-colors ${
                      isCourtesy ? "border-amber-400/40 bg-amber-400/5" : "border-border bg-card"
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`flex size-8 items-center justify-center rounded-lg ${isCourtesy ? "bg-amber-400/10" : "bg-secondary"}`}>
                          <Gift className={`size-4 ${isCourtesy ? "text-amber-400" : "text-muted-foreground"}`} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">Cortesía</p>
                          <p className="text-xs text-muted-foreground">Boleto gratuito, sin cobro</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsCourtesy((v) => !v)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          isCourtesy ? "bg-amber-400" : "bg-secondary"
                        }`}
                      >
                        <span className={`inline-block size-4 rounded-full bg-white shadow-sm transition-transform ${
                          isCourtesy ? "translate-x-6" : "translate-x-1"
                        }`} />
                      </button>
                    </div>

                    {/* Quantity */}
                    <div className="rounded-xl border border-border bg-card p-5">
                      <p className="mb-3 text-sm font-semibold text-foreground">Cantidad de boletos</p>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-2 py-1">
                          <button
                            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                            disabled={quantity <= 1}
                            className="flex size-8 items-center justify-center rounded-md hover:bg-card disabled:opacity-30"
                          >
                            <Minus className="size-4" />
                          </button>
                          <span className="w-8 text-center text-lg font-black text-foreground">{quantity}</span>
                          <button
                            onClick={() => setQuantity((q) => Math.min(currentZone.available, 10, q + 1))}
                            disabled={quantity >= Math.min(currentZone.available, 10)}
                            className="flex size-8 items-center justify-center rounded-md hover:bg-card disabled:opacity-30"
                          >
                            <Plus className="size-4" />
                          </button>
                        </div>
                        <div>
                          {isCourtesy ? (
                            <>
                              <p className="text-2xl font-black text-amber-400">CORTESÍA</p>
                              <p className="text-xs text-muted-foreground">{quantity} boleto(s) gratuito(s)</p>
                            </>
                          ) : (
                            <>
                              <p className="text-2xl font-black text-forest">${(currentZone.price * quantity).toFixed(2)}</p>
                              <p className="text-xs text-muted-foreground">{quantity} × ${currentZone.price.toFixed(2)}</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Notice */}
                    <div className={`flex items-start gap-3 rounded-xl border p-4 ${
                      isCourtesy
                        ? "border-amber-400/30 bg-amber-400/5"
                        : "border-amber-200/30 bg-amber-400/5"
                    }`}>
                      {isCourtesy ? (
                        <Gift className="mt-0.5 size-4 shrink-0 text-amber-400" />
                      ) : (
                        <Banknote className="mt-0.5 size-4 shrink-0 text-amber-400" />
                      )}
                      <p className="text-xs text-amber-300">
                        {isCourtesy
                          ? <>Estos boletos se generarán como <strong>cortesía</strong> — sin cobro. Solo el administrador puede emitirlos.</>
                          : <>Estos boletos se registrarán como <strong>venta directa en efectivo</strong>, sin asociarse a una cuenta de usuario.</>
                        }
                      </p>
                    </div>

                    {/* Confirm */}
                    <button
                      onClick={handleConfirmSale}
                      disabled={processing || currentZone.available === 0}
                      className={`flex w-full items-center justify-center gap-2 rounded-xl py-4 text-sm font-bold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                        isCourtesy
                          ? "bg-amber-500 hover:bg-amber-400"
                          : "bg-forest hover:bg-forest-light"
                      }`}
                    >
                      {processing ? (
                        <><Loader2 className="size-4 animate-spin" /> Procesando...</>
                      ) : isCourtesy ? (
                        <><Gift className="size-4" /> Generar cortesía · {quantity} boleto(s)</>
                      ) : (
                        <><Banknote className="size-4" /> Confirmar venta · ${(currentZone.price * quantity).toFixed(2)}</>
                      )}
                    </button>
                  </>
                ) : (
                  <div className="rounded-xl border border-border bg-card py-12 text-center text-sm text-muted-foreground">
                    Selecciona una zona en el mapa
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 3: Resultado ── */}
      {step === 3 && saleResult && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {saleResult.success ? (
            <div className="p-8 text-center">
              <div className="mx-auto mb-5 flex size-20 items-center justify-center rounded-full bg-emerald/10">
                <CheckCircle2 className="size-10 text-emerald" />
              </div>
              <h2 className="text-xl font-extrabold text-foreground">
                {saleResult.isCourtesy ? "¡Cortesía generada!" : "¡Venta registrada!"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {saleResult.isCourtesy
                  ? "Los boletos de cortesía han sido generados correctamente"
                  : "Los boletos han sido generados correctamente"}
              </p>

              <div className="mx-auto mt-6 max-w-sm space-y-3 rounded-xl border border-border bg-secondary/40 p-5 text-left">
                <div className="flex items-center gap-2 text-sm">
                  <Receipt className="size-4 shrink-0 text-forest" />
                  <span className="text-muted-foreground">Orden:</span>
                  <span className="font-mono font-bold text-foreground">#{saleResult.orderId?.slice(0, 8).toUpperCase()}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Ticket className="size-4 shrink-0 text-forest" />
                  <span className="text-muted-foreground">Boletos generados:</span>
                  <span className="font-semibold text-foreground">{saleResult.tickets?.length}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {saleResult.isCourtesy ? (
                    <Gift className="size-4 shrink-0 text-amber-400" />
                  ) : (
                    <Banknote className="size-4 shrink-0 text-forest" />
                  )}
                  <span className="text-muted-foreground">
                    {saleResult.isCourtesy ? "Tipo:" : "Total cobrado:"}
                  </span>
                  {saleResult.isCourtesy ? (
                    <span className="text-xl font-black text-amber-400">CORTESÍA</span>
                  ) : (
                    <span className="text-xl font-black text-forest">${saleResult.total?.toFixed(2)}</span>
                  )}
                </div>

                {/* Botones de descarga individual */}
                {saleResult.tickets && saleResult.tickets.length > 0 && (
                  <div className="border-t border-border pt-3 mt-1">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Descargar boletos</p>
                    <div className="flex flex-wrap gap-2">
                      {saleResult.tickets.map((t, i) => (
                        <a
                          key={t.id}
                          href={`/api/admin/tickets/${t.id}/download`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 rounded-lg border border-forest/30 bg-forest/5 px-3 py-1.5 text-xs font-semibold text-forest hover:bg-forest/10 transition-colors"
                        >
                          <Ticket className="size-3" />
                          Boleto #{String(i + 1).padStart(2, "0")}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <button
                  onClick={handleReset}
                  className="flex items-center justify-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-semibold text-muted-foreground hover:bg-secondary"
                >
                  <RotateCcw className="size-4" />
                  Nueva venta
                </button>
                <a
                  href="/admin/ventas"
                  className="flex items-center justify-center gap-2 rounded-xl bg-forest px-6 py-3 text-sm font-semibold text-white hover:bg-forest-light"
                >
                  <Receipt className="size-4" />
                  Ver en Gestión de Ventas
                </a>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="mx-auto mb-5 flex size-20 items-center justify-center rounded-full bg-red-50">
                <AlertCircle className="size-10 text-red-500" />
              </div>
              <h2 className="text-xl font-extrabold text-foreground">Error en la venta</h2>
              <p className="mt-2 text-sm text-red-500">{saleResult.error}</p>
              <button
                onClick={() => { setSaleResult(null); setStep(2) }}
                className="mx-auto mt-6 flex items-center justify-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-semibold hover:bg-secondary"
              >
                <RotateCcw className="size-4" />
                Intentar de nuevo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
