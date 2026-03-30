"use client"

import { useEffect, useState, useCallback } from "react"
import { Calendar, Filter, ChevronLeft, ChevronRight, Eye, X, Ticket, CreditCard, Banknote, Receipt } from "lucide-react"

interface Sale {
  id: string
  orderId: string
  event: string
  venue: string
  date: string
  tickets: number
  total: number
  status: string
  customer: string
  paymentMethod: string
  paidAt: string | null
}

interface MatchOption {
  id: string
  label: string
}

const statusStyles: Record<string, string> = {
  Completada: "bg-emerald/10 text-emerald border border-emerald/20",
  Pendiente: "bg-transparent text-[#F59E0B] border border-[#F59E0B]",
  Cancelada: "bg-red-50 text-[#D32F2F] border border-[#D32F2F]/20",
  Reembolsada: "bg-purple-50 text-purple-600 border border-purple-200",
}

const paymentLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  paypal: { label: "PayPal", icon: <CreditCard className="size-3.5" /> },
  cash:   { label: "Efectivo", icon: <Banknote className="size-3.5" /> },
  card:   { label: "Tarjeta", icon: <CreditCard className="size-3.5" /> },
}

function generateMonthOptions(): { value: string; label: string }[] {
  const months = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]
  const today = new Date()
  const options: { value: string; label: string }[] = [{ value: "all", label: "Todos los períodos" }]
  for (let i = 0; i < 12; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const year = d.getFullYear()
    const month = d.getMonth()
    options.push({ value: `${year}-${String(month + 1).padStart(2, "0")}`, label: `${months[month]} ${year}` })
  }
  return options
}

function getPaginationPages(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | "...")[] = [1]
  const delta = 2
  const rangeStart = Math.max(2, current - delta)
  const rangeEnd = Math.min(total - 1, current + delta)
  if (rangeStart > 2) pages.push("...")
  for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i)
  if (rangeEnd < total - 1) pages.push("...")
  pages.push(total)
  return pages
}

const monthOptions = generateMonthOptions()

export default function VentasPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [limit] = useState(20)

  const [period, setPeriod] = useState("all")
  const [event, setEvent] = useState("all")
  const [events, setEvents] = useState<MatchOption[]>([])

  const [appliedPeriod, setAppliedPeriod] = useState("all")
  const [appliedEvent, setAppliedEvent] = useState("all")

  // Detail modal
  const [detailSale, setDetailSale] = useState<Sale | null>(null)

  useEffect(() => {
    fetch("/api/admin/eventos")
      .then((r) => r.json())
      .then((d) => {
        const opts: MatchOption[] = (d.data || []).map((m: { id: string; name?: string; homeCode?: string; awayCode?: string; date?: string }) => ({
          id: m.id,
          label: m.name || `${m.homeCode || ""} vs ${m.awayCode || ""}${m.date ? ` · ${m.date}` : ""}`,
        }))
        setEvents(opts)
      })
      .catch(() => setEvents([]))
  }, [])

  const fetchSales = useCallback(async (page: number, per: string, evt: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ period: per, event: evt, page: String(page), limit: String(limit) })
      const response = await fetch(`/api/admin/ventas?${params}`)
      const data = await response.json()
      setSales(data.data || [])
      setTotalPages(data.pagination?.totalPages ?? 1)
      setTotal(data.pagination?.total ?? 0)
    } catch {
      setSales([])
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    fetchSales(currentPage, appliedPeriod, appliedEvent)
  }, [currentPage, appliedPeriod, appliedEvent, fetchSales])

  const handleApplyFilters = () => {
    setCurrentPage(1)
    setAppliedPeriod(period)
    setAppliedEvent(event)
  }

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * limit + 1
  const rangeEnd = Math.min(currentPage * limit, total)
  const pages = getPaginationPages(currentPage, totalPages)

  return (
    <>
      <div className="rounded-xl border border-border bg-card">
        {/* Filters row */}
        <div className="flex flex-wrap items-end gap-4 border-b border-border p-5">
          {/* Period filter */}
          <div className="min-w-[200px]">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Periodo</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full appearance-none rounded-lg border border-border bg-card py-2.5 pl-10 pr-10 text-sm focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
              >
                {monthOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Event filter */}
          <div className="min-w-[260px]">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Evento</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <select
                value={event}
                onChange={(e) => setEvent(e.target.value)}
                className="w-full appearance-none rounded-lg border border-border bg-card py-2.5 pl-10 pr-10 text-sm focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
              >
                <option value="all">Todos los eventos</option>
                {events.map((evt) => (
                  <option key={evt.id} value={evt.id}>{evt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleApplyFilters}
            className="flex items-center gap-2 rounded-lg bg-forest px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-forest-light"
          >
            <Filter className="size-4" />
            Aplicar Filtros
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["ID de Venta","Cliente","Evento","Fecha","Boletos","Método de Pago","Total Pagado","Estado",""].map((h) => (
                  <th key={h} className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-widest text-emerald whitespace-nowrap last:text-center">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="size-6 animate-spin rounded-full border-4 border-emerald border-t-transparent" />
                      <span className="text-sm text-muted-foreground">Cargando transacciones...</span>
                    </div>
                  </td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-sm text-muted-foreground">
                    No hay transacciones para mostrar
                  </td>
                </tr>
              ) : (
                sales.map((sale) => {
                  const pm = paymentLabels[sale.paymentMethod?.toLowerCase()] ?? { label: sale.paymentMethod || "—", icon: <Receipt className="size-3.5" /> }
                  return (
                    <tr
                      key={sale.id}
                      className="border-b border-border/50 last:border-0 transition-colors hover:bg-secondary/30"
                    >
                      <td className="px-4 py-4 text-sm font-bold text-foreground">#{sale.id}</td>
                      <td className="px-4 py-4 text-sm text-foreground">{sale.customer || "—"}</td>
                      <td className="px-4 py-4">
                        <p className="text-sm font-semibold text-foreground">{sale.event}</p>
                        <p className="text-xs text-muted-foreground">{sale.venue}</p>
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground whitespace-nowrap">{sale.date}</td>
                      <td className="px-4 py-4 text-center text-sm text-foreground">{sale.tickets}</td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-foreground">
                          {pm.icon}
                          {pm.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-bold text-foreground">{formatCurrency(sale.total)}</td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusStyles[sale.status] || "bg-secondary text-muted-foreground"}`}>
                          {sale.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button
                          onClick={() => setDetailSale(sale)}
                          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                          title="Ver detalles"
                        >
                          <Eye className="size-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-4">
          <p className="text-sm text-muted-foreground">
            {total === 0 ? "Sin transacciones" : `Mostrando ${rangeStart}–${rangeEnd} de ${total.toLocaleString()} transacciones`}
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
                className="flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-40">
                <ChevronLeft className="size-4" />
              </button>
              {pages.map((p, idx) =>
                p === "..." ? (
                  <span key={`e-${idx}`} className="flex size-8 items-center justify-center text-xs text-muted-foreground">…</span>
                ) : (
                  <button key={p} onClick={() => setCurrentPage(p as number)}
                    className={`flex size-8 items-center justify-center rounded-lg text-sm font-medium transition-colors ${currentPage === p ? "bg-forest text-white" : "text-muted-foreground hover:bg-secondary"}`}>
                    {p}
                  </button>
                )
              )}
              <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                className="flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-40">
                <ChevronRight className="size-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Detail Modal ── */}
      {detailSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDetailSale(null)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-forest/10">
                  <Receipt className="size-4 text-forest" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">Detalles de la Venta</h2>
                  <p className="text-xs text-muted-foreground">Orden #{detailSale.id}</p>
                </div>
              </div>
              <button onClick={() => setDetailSale(null)} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary">
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3">
              <Row label="Cliente" value={detailSale.customer || "—"} />
              <Row label="Evento" value={detailSale.event} sub={detailSale.venue} />
              <Row label="Fecha de compra" value={detailSale.date} />
              <Row label="Método de pago" value={
                paymentLabels[detailSale.paymentMethod?.toLowerCase()]?.label || detailSale.paymentMethod || "—"
              } />
              <Row label="Boletos" value={String(detailSale.tickets)} />
              <div className="mt-2 flex items-center justify-between rounded-xl bg-secondary/50 px-4 py-3">
                <span className="text-sm font-semibold text-muted-foreground">Total pagado</span>
                <span className="text-xl font-black text-forest">${detailSale.total.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-secondary/50 px-4 py-3">
                <span className="text-sm font-semibold text-muted-foreground">Estado</span>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusStyles[detailSale.status] || "bg-secondary text-muted-foreground"}`}>
                  {detailSale.status}
                </span>
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button onClick={() => setDetailSale(null)}
                className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary">
                Cerrar
              </button>
              <a href={`/admin/taquilla`}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-forest px-4 py-2.5 text-sm font-semibold text-white hover:bg-forest-light">
                <Ticket className="size-4" />
                Validar en taquilla
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/50 pb-3 last:border-0">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="text-right">
        <span className="text-sm font-medium text-foreground">{value}</span>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  )
}
