"use client"

import { useEffect, useState, useCallback } from "react"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts"
import {
  TrendingUp, TrendingDown, FileSpreadsheet, Banknote,
  Ticket, CalendarDays, Filter, X, ChevronDown,
} from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReportStats {
  totalRevenue: number
  totalTickets: number
  totalOrders: number
  avgOrderValue: number
  newUsers: number
}

interface SaleByEvent {
  label: string
  value: number
  matchDate: string
}

interface SaleByZone {
  name: string
  zoneKey: string
  tickets: number
  pct: number
}

interface ReportData {
  stats: ReportStats
  salesByEvent: SaleByEvent[]
  salesByZone: SaleByZone[]
}

interface MatchOption { id: string; label: string; date: string }
interface AdminOption { id: string; name: string }

type Period = "week" | "month" | "quarter" | "year" | "custom"

const periodLabels: Record<Period, string> = {
  week:    "Semana",
  month:   "Mes",
  quarter: "Trimestre",
  year:    "Año",
  custom:  "Personalizado",
}

// ── Custom tooltip ─────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: {value: number}[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md">
      <p className="text-xs font-semibold text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground">{payload[0].value.toLocaleString()} boletos</p>
    </div>
  )
}

// ── Stat card ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, change, positive, icon: Icon }: {
  label: string; value: string; change?: number | null; positive?: boolean; icon: React.ElementType
}) {
  const hasChange = change !== null && change !== undefined
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-4 flex items-start justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
        <div className="flex size-9 items-center justify-center rounded-xl bg-forest/10">
          <Icon className="size-4 text-forest" />
        </div>
      </div>
      <p className="text-3xl font-bold text-foreground">{value}</p>
      {hasChange && (
        <div className="mt-2 flex items-center gap-1.5">
          {positive ? <TrendingUp className="size-3.5 text-emerald-600" /> : <TrendingDown className="size-3.5 text-red-500" />}
          <span className={`text-xs font-medium ${positive ? "text-emerald-600" : "text-red-500"}`}>
            {change! >= 0 ? "+" : ""}{change?.toFixed(1)}%
          </span>
          <span className="text-xs text-muted-foreground">vs periodo anterior</span>
        </div>
      )}
    </div>
  )
}

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-secondary/70 ${className}`} />
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ReportesPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<Period>("month")
  const [showFilters, setShowFilters] = useState(false)

  // Advanced filters
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [selectedEventId, setSelectedEventId] = useState("")
  const [selectedAdminId, setSelectedAdminId] = useState("")
  const [hasCommission, setHasCommission] = useState<"all" | "yes" | "no">("all")

  const [matches, setMatches] = useState<MatchOption[]>([])
  const [admins, setAdmins] = useState<AdminOption[]>([])
  const [loadingOptions, setLoadingOptions] = useState(false)

  // Load filter options when panel opens
  const loadOptions = useCallback(async () => {
    if (matches.length > 0) return
    setLoadingOptions(true)
    try {
      const [matchRes, adminRes] = await Promise.all([
        fetch("/api/admin/eventos?limit=100"),
        fetch("/api/admin/usuarios"),
      ])
      const matchData = await matchRes.json()
      const adminData = await adminRes.json()
      setMatches((matchData.data || []).map((m: { id: string; name?: string; homeCode?: string; awayCode?: string; date?: string }) => ({
        id: m.id,
        label: m.name || `${m.homeCode || ""} vs ${m.awayCode || ""}`,
        date: m.date || "",
      })))
      setAdmins((adminData.data || [])
        .filter((u: { roleKey?: string; role?: string }) => u.roleKey === "admin" || u.role === "Administrador")
        .map((u: { id: string; name: string }) => ({ id: u.id, name: u.name })))
    } catch { /* ignore */ } finally {
      setLoadingOptions(false)
    }
  }, [matches.length])

  const buildParams = useCallback(() => {
    const p = new URLSearchParams()
    if (period !== "custom") p.set("period", period)
    if (startDate) p.set("startDate", startDate)
    if (endDate) p.set("endDate", endDate)
    if (selectedEventId) p.set("matchId", selectedEventId)
    if (selectedAdminId) p.set("adminId", selectedAdminId)
    if (hasCommission !== "all") p.set("commission", hasCommission)
    return p
  }, [period, startDate, endDate, selectedEventId, selectedAdminId, hasCommission])

  const fetchReport = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = buildParams()
      const res = await fetch(`/api/admin/reportes?${params}`)
      if (!res.ok) throw new Error("Error al obtener reportes")
      const json = await res.json()
      setReportData({
        stats: json.stats,
        salesByEvent: json.salesByEvent || [],
        salesByZone: json.salesByZone || [],
      })
    } catch (err) {
      console.error(err)
      setError("No se pudieron cargar los reportes.")
    } finally {
      setLoading(false)
    }
  }, [buildParams])

  useEffect(() => { fetchReport() }, [fetchReport])

  const handleDownloadCSV = () => {
    const params = buildParams()
    params.set("format", "csv")
    window.location.href = `/api/admin/reportes?${params}`
  }

  const clearFilters = () => {
    setStartDate("")
    setEndDate("")
    setSelectedEventId("")
    setSelectedAdminId("")
    setHasCommission("all")
  }

  const hasActiveFilters = startDate || endDate || selectedEventId || selectedAdminId || hasCommission !== "all"

  const stats = reportData?.stats
  const salesByEvent = reportData?.salesByEvent ?? []
  const salesByZone = reportData?.salesByZone ?? []
  const topEventLabel = salesByEvent[0]?.label ?? null
  const top5 = salesByEvent.slice(0, 5)
  const formatCurrency = (n: number) => `$${n.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  const avgPerEvent = stats && stats.totalOrders > 0 ? stats.totalRevenue / Math.max(salesByEvent.length, 1) : 0

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Period selector */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
          {(Object.keys(periodLabels) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              disabled={loading}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                period === p ? "bg-forest text-white" : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          {/* Advanced filters button */}
          <button
            onClick={() => { setShowFilters((v) => !v); if (!showFilters) loadOptions() }}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors ${
              hasActiveFilters
                ? "border-forest bg-forest/10 text-forest"
                : "border-border bg-card text-foreground hover:bg-secondary"
            }`}
          >
            <Filter className="size-4" />
            Filtros avanzados
            {hasActiveFilters && (
              <span className="ml-1 flex size-4 items-center justify-center rounded-full bg-forest text-[9px] font-bold text-white">✓</span>
            )}
            <ChevronDown className={`size-3.5 transition-transform ${showFilters ? "rotate-180" : ""}`} />
          </button>

          {/* Download Excel */}
          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-2 rounded-lg bg-forest px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-forest-light"
          >
            <FileSpreadsheet className="size-4" />
            Descargar Excel
          </button>
        </div>
      </div>

      {/* ── Advanced Filters Panel ── */}
      {showFilters && (
        <div className="rounded-xl border border-forest/20 bg-forest/5 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Filtros Avanzados</h3>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  <X className="size-3" /> Limpiar filtros
                </button>
              )}
              <button onClick={() => setShowFilters(false)} className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary">
                <X className="size-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Date range */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Fecha inicio</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-forest focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Fecha fin</label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-forest focus:outline-none"
              />
            </div>

            {/* Specific event */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Evento específico</label>
              {loadingOptions ? (
                <div className="h-9 animate-pulse rounded-lg bg-secondary/70" />
              ) : (
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-forest focus:outline-none"
                >
                  <option value="">Todos los eventos</option>
                  {matches.map((m) => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Admin who requested */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Administrador</label>
              {loadingOptions ? (
                <div className="h-9 animate-pulse rounded-lg bg-secondary/70" />
              ) : (
                <select
                  value={selectedAdminId}
                  onChange={(e) => setSelectedAdminId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-forest focus:outline-none"
                >
                  <option value="">Todos los admins</option>
                  {admins.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Commission */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Comisión cobrada</label>
              <div className="flex gap-2">
                {(["all", "yes", "no"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setHasCommission(v)}
                    className={`flex-1 rounded-lg border py-2 text-xs font-semibold transition-colors ${
                      hasCommission === v
                        ? "border-forest bg-forest/10 text-forest"
                        : "border-border text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    {v === "all" ? "Todas" : v === "yes" ? "Sí" : "No"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={fetchReport}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-forest px-5 py-2.5 text-sm font-semibold text-white hover:bg-forest-light disabled:opacity-50"
            >
              <Filter className="size-4" />
              Aplicar y generar reporte
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50/10 p-6 text-center">
          <p className="text-sm text-red-500">{error}</p>
          <button onClick={fetchReport} className="mt-2 text-xs text-forest underline underline-offset-2">Reintentar</button>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {loading ? (
          <><Skeleton className="h-36 rounded-xl" /><Skeleton className="h-36 rounded-xl" /><Skeleton className="h-36 rounded-xl" /></>
        ) : stats ? (
          <>
            <StatCard label="Ingresos Totales" value={formatCurrency(stats.totalRevenue)} icon={Banknote} />
            <StatCard label="Boletos Vendidos" value={stats.totalTickets.toLocaleString()} icon={Ticket} />
            <StatCard label="Promedio por Evento" value={formatCurrency(avgPerEvent)} icon={CalendarDays} />
          </>
        ) : null}
      </div>

      {/* Bar chart */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Ventas de Boletos por Evento</h2>
            <p className="text-xs text-muted-foreground">Boletos vendidos agrupados por partido</p>
          </div>
          <span className="rounded-lg border border-border px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-foreground">
            {periodLabels[period]}
          </span>
        </div>
        {loading ? (
          <Skeleton className="h-60 w-full rounded-lg" />
        ) : salesByEvent.length === 0 ? (
          <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">Sin datos de ventas en este período</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={salesByEvent} barSize={40} barCategoryGap="30%">
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "transparent" }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {salesByEvent.map((entry) => (
                  <Cell key={entry.label} fill={entry.label === topEventLabel ? "var(--color-forest)" : "#9ab8a8"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        {/* Top 5 */}
        <div className="rounded-xl border border-border bg-card p-6 lg:col-span-3">
          <h2 className="mb-5 text-base font-semibold text-foreground">Top Eventos más Vendidos</h2>
          {loading ? (
            <div className="space-y-2">{[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
          ) : top5.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Sin datos para este período</p>
          ) : (
            <div className="space-y-2">
              {top5.map((item, idx) => {
                const pos = idx + 1
                return (
                  <div key={item.label + pos}
                    className={`flex items-center gap-4 rounded-lg px-4 py-3 ${pos === 1 ? "bg-forest/10" : "hover:bg-secondary/50"} transition-colors`}
                  >
                    <span className={`w-5 text-sm font-bold ${pos === 1 ? "text-forest" : "text-muted-foreground"}`}>{pos}</span>
                    <span className={`flex-1 text-sm ${pos === 1 ? "font-semibold text-foreground" : "text-foreground"}`}>{item.label}</span>
                    <span className={`text-sm font-semibold ${pos === 1 ? "text-forest" : "text-muted-foreground"}`}>{item.value.toLocaleString()} boletos</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Zones */}
        <div className="rounded-xl border border-border bg-card p-6 lg:col-span-2">
          <h2 className="mb-5 text-base font-semibold text-foreground">Zonas más Vendidas</h2>
          {loading ? (
            <div className="space-y-5">{[1,2,3].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
          ) : salesByZone.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Sin datos de zonas</p>
          ) : (
            <div className="space-y-5">
              {salesByZone.map((zone) => (
                <div key={zone.zoneKey}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{zone.name}</span>
                    <span className="text-sm font-semibold text-foreground">
                      {zone.pct}%&nbsp;<span className="text-xs font-normal text-muted-foreground">({zone.tickets.toLocaleString()})</span>
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-forest transition-all duration-500" style={{ width: `${zone.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
