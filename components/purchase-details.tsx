"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Minus, Plus, ShoppingCart, CheckCircle, AlertCircle, Circle, Loader2 } from "lucide-react"
import type { ZoneData } from "@/app/asientos/page"

type ZoneId = "premium-norte" | "general-sur" | "lateral-este" | "lateral-oeste"

// Fallback data if DB doesn't return a specific zone
const fallbackZone: ZoneData = {
  id: "premium-norte",
  zoneId: "",
  inventoryId: "",
  name: "Zona Premium",
  description: "Ubicacion preferencial con la mejor vista al campo de juego.",
  price: 0,
  color: "#F5C518",
  availableSeats: 0,
  totalSeats: 0,
  gate: "A",
  status: "available",
}

interface PurchaseDetailsProps {
  selectedZone: ZoneId
  quantity: number
  onQuantityChange: (q: number) => void
  matchId: string
  zoneData: ZoneData | null
}

export function PurchaseDetails({
  selectedZone: _selectedZone,
  quantity,
  onQuantityChange,
  matchId,
  zoneData,
}: PurchaseDetailsProps) {
  const router = useRouter()
  const zone = zoneData ?? fallbackZone
  const total = zone.price * quantity

  const [addingToCart, setAddingToCart] = useState(false)
  const [cartStatus, setCartStatus] = useState<"idle" | "added" | "error">("idle")
  const [cartError, setCartError] = useState("")

  const handleAddToCart = async () => {
    if (!matchId || !zone.zoneId) {
      setCartError("Selecciona un partido y zona válidos.")
      setCartStatus("error")
      return
    }
    if (zone.status === "soldout") {
      setCartError("Esta zona está agotada.")
      setCartStatus("error")
      return
    }

    setAddingToCart(true)
    setCartStatus("idle")
    setCartError("")

    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          zoneId: zone.zoneId,
          quantity,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 401) {
          // Not logged in — redirect to login
          router.push("/login?redirect=/asientos%3Fmatch%3D" + matchId)
          return
        }
        setCartError(data.error || "Error al agregar al carrito")
        setCartStatus("error")
        setTimeout(() => setCartStatus("idle"), 3500)
        return
      }

      setCartStatus("added")
      // Redirect to cart after a short pause
      setTimeout(() => {
        router.push("/carrito")
      }, 1000)
    } catch {
      setCartError("Error de conexión. Intenta de nuevo.")
      setCartStatus("error")
      setTimeout(() => setCartStatus("idle"), 3500)
    } finally {
      setAddingToCart(false)
    }
  }

  return (
    <div className="flex flex-col">
      <h2 className="mb-5 text-xl font-bold text-card-foreground lg:text-2xl">
        Detalles de Compra
      </h2>

      {/* Selected badge */}
      <div className="mb-4 flex items-center">
        <span className="inline-flex items-center rounded-md bg-emerald/15 px-3 py-1 text-[11px] font-bold tracking-wider text-forest uppercase">
          Seleccionado
        </span>
      </div>

      {/* Zone name & description */}
      <h3 className="mb-1.5 text-lg font-bold text-card-foreground">{zone.name}</h3>
      <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
        {zone.description}
      </p>

      <div className="mb-5 h-px bg-border" />

      {/* Unit price — from DB */}
      <div className="mb-5 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Precio Unitario</span>
        <span className="text-2xl font-bold text-card-foreground">
          {zone.price > 0 ? `$${zone.price.toFixed(2)}` : "—"}
        </span>
      </div>

      {/* Availability badge */}
      {zone.status === "limited" && (
        <div className="mb-4 rounded-lg bg-amber-50/10 border border-amber-400/20 px-3 py-2 text-xs font-semibold text-amber-400">
          Últimos {zone.availableSeats} lugares disponibles
        </div>
      )}
      {zone.status === "soldout" && (
        <div className="mb-4 rounded-lg bg-red-50/10 border border-red-400/20 px-3 py-2 text-xs font-semibold text-red-400">
          Zona agotada
        </div>
      )}

      {/* Quantity selector */}
      <div className="mb-5">
        <span className="mb-3 block text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
          Cantidad de Asientos
        </span>
        <div className="flex items-center justify-between rounded-xl bg-secondary px-4 py-3">
          <button
            onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
            disabled={zone.status === "soldout"}
            className="flex size-10 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-forest hover:text-card-foreground disabled:opacity-40"
            aria-label="Reducir cantidad"
          >
            <Minus className="size-4" />
          </button>
          <span className="text-3xl font-bold tabular-nums text-card-foreground">
            {quantity}
          </span>
          <button
            onClick={() => onQuantityChange(Math.min(Math.min(10, zone.availableSeats), quantity + 1))}
            disabled={zone.status === "soldout" || quantity >= zone.availableSeats}
            className="flex size-10 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-forest hover:text-card-foreground disabled:opacity-40"
            aria-label="Aumentar cantidad"
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>

      {/* Availability legend */}
      <div className="mb-6 flex items-center justify-between rounded-lg bg-secondary px-4 py-3">
        <div className="flex items-center gap-2">
          <Circle className="size-2.5 fill-muted text-muted" />
          <span className="text-sm text-muted-foreground">Ocupado</span>
        </div>
        <div className="flex items-center gap-2">
          <Circle
            className="size-2.5"
            style={{ fill: zone.color, color: zone.color }}
          />
          <span className="text-sm text-muted-foreground">Disponible</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {zone.availableSeats} / {zone.totalSeats} libres
        </span>
      </div>

      {/* Total + CTA */}
      <div className="border-t border-border pt-5">
        <span className="mb-1 block text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
          Total a Pagar
        </span>
        <p className="mb-5 text-3xl font-extrabold text-forest lg:text-4xl">
          {zone.price > 0
            ? `$${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
            : "—"}
        </p>

        {/* Error message */}
        {cartStatus === "error" && cartError && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-50/10 border border-red-200/20 px-3 py-2">
            <AlertCircle className="size-3.5 shrink-0 text-red-400" />
            <p className="text-xs text-red-400">{cartError}</p>
          </div>
        )}

        <button
          onClick={handleAddToCart}
          disabled={addingToCart || cartStatus === "added" || zone.status === "soldout" || !matchId}
          className={`flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 text-sm font-bold tracking-wider text-white uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${cartStatus === "added"
              ? "bg-emerald"
              : cartStatus === "error"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-[#D32F2F] hover:bg-[#C62828]"
            }`}
        >
          {addingToCart ? (
            <Loader2 className="size-4 animate-spin" />
          ) : cartStatus === "added" ? (
            <CheckCircle className="size-4" />
          ) : (
            <ShoppingCart className="size-4" />
          )}
          {addingToCart
            ? "Agregando..."
            : cartStatus === "added"
              ? "¡Agregado! Redirigiendo..."
              : zone.status === "soldout"
                ? "Zona Agotada"
                : "Agregar al Carrito"}
        </button>
      </div>
    </div>
  )
}
