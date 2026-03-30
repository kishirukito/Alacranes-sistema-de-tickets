"use client"

import Image from "next/image"
import { useEffect, useRef, useCallback } from "react"
import { Share2, Printer, MapPin, CheckCircle2 } from "lucide-react"
import QRCode from "qrcode"

interface TicketCardProps {
  ticket: {
    id: string
    orderId: string
    orderDate: string
    homeTeam: string
    awayTeam: string
    matchDate: string
    matchTime: string
    venue: string
    zone: string
    gate: string
    section: string
    seat: string
    price: number
    status: "activo" | "usado" | "expirado" | "cancelado"
    qrCode?: string
    usedAt?: string | null
  }
}

function QRCanvas({ payload }: { payload?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current || !payload) return
    QRCode.toCanvas(canvasRef.current, payload, {
      errorCorrectionLevel: "H",
      margin: 2,
      width: 128,
      color: {
        dark: "#004D40",
        light: "#FFFFFF",
      },
    }).catch(console.error)
  }, [payload])

  if (!payload) {
    return (
      <svg viewBox="0 0 100 100" className="size-full">
        <rect width="100" height="100" fill="white" />
        <g fill="#004D40">
          <rect x="5" y="5" width="20" height="20" />
          <rect x="8" y="8" width="14" height="14" fill="white" />
          <rect x="11" y="11" width="8" height="8" />
          <rect x="75" y="5" width="20" height="20" />
          <rect x="78" y="8" width="14" height="14" fill="white" />
          <rect x="81" y="11" width="8" height="8" />
          <rect x="5" y="75" width="20" height="20" />
          <rect x="8" y="78" width="14" height="14" fill="white" />
          <rect x="11" y="81" width="8" height="8" />
        </g>
      </svg>
    )
  }

  return <canvas ref={canvasRef} className="size-full rounded" />
}

export function TicketCard({ ticket }: TicketCardProps) {
  const statusLabels: Record<string, string> = {
    activo: "ACTIVO",
    usado: "USADO",
    expirado: "EXPIRADO",
    cancelado: "CANCELADO",
  }

  const statusColors: Record<string, string> = {
    activo: "bg-emerald/10 text-emerald border-emerald/20",
    usado: "bg-muted text-muted-foreground border-border",
    expirado: "bg-destructive/10 text-destructive border-destructive/20",
    cancelado: "bg-destructive/10 text-destructive border-destructive/20",
  }

  const handlePrint = useCallback(() => {
    window.open(`/api/tickets/${ticket.id}/download`, "_blank")
  }, [ticket.id])

  return (
    <div className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
      {/* Header with team name and actions */}
      <div className="flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-2">
          {ticket.homeTeam === "Alacranes de Durango" ? (
            <div className="relative size-6">
               <Image src="/images/logoalacranes.png" alt="Logo" fill className="object-contain" />
            </div>
          ) : (
            <div className="flex size-6 items-center justify-center rounded bg-emerald">
              <span className="text-[10px] font-bold text-card">{ticket.homeTeam.charAt(0)}</span>
            </div>
          )}
          <span className="text-sm font-semibold text-foreground">
            {ticket.homeTeam}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Compartir"
          >
            <Share2 className="size-4" />
          </button>
          <button
            onClick={handlePrint}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Imprimir boleto"
            title="Descargar / Imprimir boleto"
          >
            <Printer className="size-4" />
          </button>
        </div>
      </div>

      {/* Match image header */}
      <div className="relative h-28 w-full">
        <Image
          src="/images/stadium-bg.jpg"
          alt="Estadio"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-forest/90 via-forest/50 to-transparent" />
        <div className="absolute bottom-3 left-4">
          <h3 className="text-base font-bold text-card">{ticket.homeTeam}</h3>
          <p className="text-xs text-card/80">vs {ticket.awayTeam}</p>
        </div>
      </div>

      {/* Status badge */}
      <div className="flex justify-center pt-4 relative z-10 bg-card">
        <span
          className={`rounded-full border px-4 py-1 text-[10px] font-bold tracking-wider ${statusColors[ticket.status] ?? statusColors.activo}`}
        >
          {statusLabels[ticket.status] ?? ticket.status.toUpperCase()}
        </span>
      </div>

      {/* QR Code section */}
      <div className="px-5 py-4">
        <p className="mb-3 text-center text-xs text-muted-foreground">
          {ticket.status === "usado" ? "Boleto ya utilizado" : "Escanee este codigo en la entrada"}
        </p>
        <div className="relative mx-auto flex size-32 items-center justify-center rounded-lg border border-border bg-white p-1">
          {/* QR — se difumina si el boleto está usado */}
          <div className={ticket.status === "usado" ? "opacity-30 blur-sm" : ""}>
            <QRCanvas payload={ticket.qrCode} />
          </div>

          {/* Overlay USADO */}
          {ticket.status === "usado" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-white/80">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <CheckCircle2 className="size-7 text-muted-foreground" />
              </div>
              <span className="mt-1 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">Usado</span>
            </div>
          )}
        </div>

        {/* Timestamp si fue usado */}
        {ticket.status === "usado" && ticket.usedAt && (
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            Escaneado el{" "}
            {new Date(ticket.usedAt).toLocaleDateString("es-MX", {
              day: "numeric", month: "long", year: "numeric"
            })}{" "}
            a las{" "}
            {new Date(ticket.usedAt).toLocaleTimeString("es-MX", {
              hour: "2-digit", minute: "2-digit"
            })}
          </p>
        )}

        {/* Ticket ID */}
        <div className="mt-4 text-center">
          <span className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
            ID del Boleto
          </span>
          <p className="text-xl font-bold text-forest">#{ticket.id.slice(0, 8).toUpperCase()}</p>
        </div>
      </div>

      {/* Dashed divider */}
      <div className="mx-5 border-t border-dashed border-border" />

      {/* Date and time */}
      <div className="grid grid-cols-2 gap-4 px-5 py-4">
        <div>
          <span className="text-[10px] font-semibold tracking-widest text-emerald uppercase">
            Fecha del Evento
          </span>
          <p className="text-sm font-semibold text-foreground">{ticket.matchDate}</p>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-semibold tracking-widest text-emerald uppercase">
            Hora Local
          </span>
          <p className="text-sm font-semibold text-foreground">{ticket.matchTime}</p>
        </div>
      </div>

      {/* Zone info */}
      <div className="grid grid-cols-4 gap-2 px-5 pb-4">
        <div className="text-center">
          <span className="text-[9px] font-medium tracking-wider text-muted-foreground uppercase">
            Zona
          </span>
          <p className="text-xs font-bold text-emerald">{ticket.zone}</p>
        </div>
        <div className="text-center">
          <span className="text-[9px] font-medium tracking-wider text-muted-foreground uppercase">
            Puerta
          </span>
          <p className="text-xs font-bold text-foreground">{ticket.gate}</p>
        </div>
        <div className="text-center">
          <span className="text-[9px] font-medium tracking-wider text-muted-foreground uppercase">
            Secc
          </span>
          <p className="text-xs font-bold text-emerald">{ticket.section}</p>
        </div>
        <div className="text-center">
          <span className="text-[9px] font-medium tracking-wider text-emerald uppercase">
            Asiento
          </span>
          <p className="text-xs font-bold text-emerald">{ticket.seat}</p>
        </div>
      </div>

      {/* Location */}
      <div className="px-5 pb-4">
        <span className="text-[9px] font-medium tracking-wider text-muted-foreground uppercase">
          Ubicacion
        </span>
        <p className="flex items-center gap-1.5 text-sm font-medium text-emerald">
          <MapPin className="size-3.5" />
          {ticket.venue}
        </p>
      </div>

      {/* Order info */}
      <div className="flex items-center justify-between border-t border-border px-5 py-3">
        <div>
          <span className="text-[9px] font-medium tracking-wider text-muted-foreground uppercase">
            Orden #{ticket.orderId.slice(0, 8).toUpperCase()}
          </span>
          <p className="text-xs text-emerald">Compra {ticket.orderDate}</p>
        </div>
        <CheckCircle2 className="size-5 text-emerald" />
      </div>
    </div>
  )
}
