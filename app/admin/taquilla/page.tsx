"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import {
  QrCode,
  Camera,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Keyboard,
  X,
  Clock,
  MapPin,
  User,
  Ticket,
} from "lucide-react"

// ─── Tipos ─────────────────────────────────────────────────────────────────

type ScanResult = {
  valid: boolean
  reason: string
  message: string
  usedAt?: string
  ticket?: {
    id: string
    status: string
    price: number
    matchTitle: string
    matchDate: string
    matchTime: string
    venue: string
    zone: string
    gate: string
    ownerName: string
  }
}

type ScanState = "idle" | "scanning" | "loading" | "result"

// ─── Componente de resultado ────────────────────────────────────────────────

function ResultCard({
  result,
  onReset,
}: {
  result: ScanResult
  onReset: () => void
}) {
  const isValid = result.valid

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border-2 p-6 shadow-lg transition-all ${
        isValid
          ? "border-emerald-500 bg-emerald-50"
          : "border-red-400 bg-red-50"
      }`}
    >
      {/* Indicador principal */}
      <div className="mb-5 flex items-center gap-4">
        <div
          className={`flex size-16 items-center justify-center rounded-full ${
            isValid ? "bg-emerald-500" : "bg-red-500"
          }`}
        >
          {isValid ? (
            <CheckCircle2 className="size-9 text-white" />
          ) : (
            <XCircle className="size-9 text-white" />
          )}
        </div>
        <div>
          <h2
            className={`text-xl font-extrabold ${
              isValid ? "text-emerald-700" : "text-red-700"
            }`}
          >
            {isValid ? "ACCESO PERMITIDO" : "ACCESO DENEGADO"}
          </h2>
          <p className={`text-sm font-medium ${
            isValid ? "text-emerald-600" : "text-red-600"
          }`}>
            {result.message}
          </p>
        </div>
      </div>

      {/* Info del boleto */}
      {result.ticket && (
        <div className="mb-5 space-y-3 rounded-xl border border-white/50 bg-white/70 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Ticket className="size-4 text-[#004D40]" />
            <span>{result.ticket.matchTitle}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-1.5 text-gray-600">
              <Clock className="size-3.5 text-gray-400" />
              <span>
                {new Date(result.ticket.matchDate + "T00:00:00").toLocaleDateString("es-MX", {
                  day: "numeric",
                  month: "short",
                })} · {result.ticket.matchTime} hrs
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-600">
              <MapPin className="size-3.5 text-gray-400" />
              <span>{result.ticket.venue}</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-600">
              <QrCode className="size-3.5 text-gray-400" />
              <span>Zona: {result.ticket.zone} · Puerta {result.ticket.gate}</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-600">
              <User className="size-3.5 text-gray-400" />
              <span>{result.ticket.ownerName}</span>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-gray-200 pt-2">
            <span className="text-xs text-gray-400">ID Boleto</span>
            <span className="font-mono text-xs font-bold text-[#004D40]">
              #{result.ticket.id.slice(0, 8).toUpperCase()}
            </span>
          </div>

          {result.usedAt && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Escaneado</span>
              <span className="text-xs font-medium text-gray-600">
                {new Date(result.usedAt).toLocaleTimeString("es-MX", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
            </div>
          )}
        </div>
      )}

      <button
        onClick={onReset}
        className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-colors ${
          isValid
            ? "bg-emerald-600 hover:bg-emerald-700"
            : "bg-red-600 hover:bg-red-700"
        }`}
      >
        <RefreshCw className="size-4" />
        Escanear Siguiente
      </button>
    </div>
  )
}

// ─── Componente principal ───────────────────────────────────────────────────

export default function TaquillaPage() {
  const [scanState, setScanState] = useState<ScanState>("idle")
  const [result, setResult] = useState<ScanResult | null>(null)
  const [manualInput, setManualInput] = useState("")
  const [showManual, setShowManual] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [scannedCount, setScannedCount] = useState(0)
  const [validCount, setValidCount] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [cameraError, setCameraError] = useState("")

  // Limpiar cámara al desmontar
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }

  // Llama al API con el QR payload
  const validateQR = useCallback(async (qrPayload: string) => {
    if (!qrPayload.trim()) return

    setScanState("loading")
    stopCamera()

    try {
      const res = await fetch("/api/admin/tickets/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrPayload: qrPayload.trim() }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Error del servidor")
      }

      setResult(data)
      setScannedCount((c) => c + 1)
      if (data.valid) setValidCount((c) => c + 1)
      setScanState("result")
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error al validar")
      setScanState("idle")
    }
  }, [])

  // Iniciar cámara y escaneo
  const startCamera = async () => {
    setCameraError("")
    setScanState("scanning")

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      // Importar jsQR dinámicamente para leer frames del video
      const jsQR = (await import("jsqr")).default

      scanIntervalRef.current = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return

        const canvas = document.createElement("canvas")
        canvas.width = videoRef.current.videoWidth
        canvas.height = videoRef.current.videoHeight
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        ctx.drawImage(videoRef.current, 0, 0)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(imageData.data, imageData.width, imageData.height)

        if (code?.data) {
          await validateQR(code.data)
        }
      }, 400)
    } catch {
      setCameraError("No se pudo acceder a la cámara. Usa el modo manual.")
      setScanState("idle")
    }
  }

  const handleReset = () => {
    setResult(null)
    setErrorMsg("")
    setManualInput("")
    setScanState("idle")
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    validateQR(manualInput)
  }

  return (
    <div className="mx-auto max-w-xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-[#004D40]">
            <QrCode className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              Taquilla / Validación
            </h1>
            <p className="text-sm text-muted-foreground">
              Escanea el QR del boleto para validar el acceso
            </p>
          </div>
        </div>

        {/* Contadores de sesión */}
        {scannedCount > 0 && (
          <div className="mt-4 flex gap-3">
            <div className="flex-1 rounded-xl border border-border bg-card p-3 text-center">
              <p className="text-2xl font-extrabold text-foreground">{scannedCount}</p>
              <p className="text-xs text-muted-foreground">Escaneados</p>
            </div>
            <div className="flex-1 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center">
              <p className="text-2xl font-extrabold text-emerald-600">{validCount}</p>
              <p className="text-xs text-emerald-600">Válidos</p>
            </div>
            <div className="flex-1 rounded-xl border border-red-200 bg-red-50 p-3 text-center">
              <p className="text-2xl font-extrabold text-red-600">{scannedCount - validCount}</p>
              <p className="text-xs text-red-600">Rechazados</p>
            </div>
          </div>
        )}
      </div>

      {/* Estado: resultado */}
      {scanState === "result" && result && (
        <ResultCard result={result} onReset={handleReset} />
      )}

      {/* Estado: cargando */}
      {scanState === "loading" && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-card p-12">
          <div className="size-12 animate-spin rounded-full border-4 border-[#004D40] border-t-transparent" />
          <p className="text-sm font-medium text-muted-foreground">Validando boleto...</p>
        </div>
      )}

      {/* Estado: escaneando con cámara */}
      {scanState === "scanning" && (
        <div className="overflow-hidden rounded-2xl border border-border bg-black shadow-lg">
          <div className="relative aspect-square w-full">
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              playsInline
              muted
            />
            {/* Overlay con esquinas */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative size-56">
                {/* Esquinas del visor */}
                <div className="absolute left-0 top-0 h-8 w-8 rounded-tl-lg border-l-4 border-t-4 border-white" />
                <div className="absolute right-0 top-0 h-8 w-8 rounded-tr-lg border-r-4 border-t-4 border-white" />
                <div className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-lg border-b-4 border-l-4 border-white" />
                <div className="absolute bottom-0 right-0 h-8 w-8 rounded-br-lg border-b-4 border-r-4 border-white" />
                {/* Línea de escaneo animada */}
                <div className="absolute inset-x-2 animate-[scan_2s_ease-in-out_infinite] border-t-2 border-[#00BFA5]" />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between bg-black/80 px-4 py-3">
            <p className="text-sm text-white/80">Apunta al código QR del boleto</p>
            <button
              onClick={() => { stopCamera(); setScanState("idle") }}
              className="flex size-8 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* Estado: idle — botones de inicio */}
      {scanState === "idle" && (
        <div className="space-y-4">
          {/* Error */}
          {(errorMsg || cameraError) && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <p className="text-sm text-amber-700">{errorMsg || cameraError}</p>
            </div>
          )}

          {/* Botón cámara */}
          <button
            onClick={startCamera}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#004D40] py-5 text-base font-bold text-white shadow-lg transition-all hover:bg-[#00695C] active:scale-[0.98]"
          >
            <Camera className="size-6" />
            Abrir Cámara y Escanear QR
          </button>

          {/* Separador */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">o ingresa manualmente</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Modo manual */}
          <button
            onClick={() => setShowManual(!showManual)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary"
          >
            <Keyboard className="size-4" />
            Ingresar código QR manualmente
          </button>

          {showManual && (
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Payload del QR
                </label>
                <textarea
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="TKT:uuid|MTH:matchId|ZN:zoneId|USR:userId"
                  rows={3}
                  className="w-full rounded-xl border border-border bg-card px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#004D40]"
                />
              </div>
              <button
                type="submit"
                disabled={!manualInput.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#004D40] py-3 text-sm font-bold text-white disabled:opacity-40"
              >
                <CheckCircle2 className="size-4" />
                Validar Boleto
              </button>
            </form>
          )}

          {/* Instrucciones */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">¿Cómo usar?</h3>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#004D40] text-[10px] font-bold text-white">1</span>
                Presiona <strong className="text-foreground">Abrir Cámara</strong> para activar el escáner.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#004D40] text-[10px] font-bold text-white">2</span>
                Apunta la cámara al QR del boleto del cliente.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#004D40] text-[10px] font-bold text-white">3</span>
                Espera la respuesta: <span className="font-semibold text-emerald-600">Verde = acceso</span> / <span className="font-semibold text-red-600">Rojo = rechazado</span>.
              </li>
            </ol>
          </div>
        </div>
      )}

      {/* Animación de línea de escaneo en CSS */}
      <style>{`
        @keyframes scan {
          0%, 100% { top: 10%; }
          50% { top: 85%; }
        }
      `}</style>
    </div>
  )
}
