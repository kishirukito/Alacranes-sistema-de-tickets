"use client"

import { useState } from "react"
import { ArrowRight, Shield, Loader2, AlertCircle } from "lucide-react"

interface OrderSummaryProps {
  subtotal: number
  serviceFee: number
  itemCount: number
  onApplyDiscount: (code: string) => Promise<{ success: boolean; discountAmount?: number; error?: string }>
  disabled?: boolean
}

export function OrderSummary({ subtotal, serviceFee, itemCount, onApplyDiscount, disabled }: OrderSummaryProps) {
  const [discountCode, setDiscountCode] = useState("")
  const [discountAmount, setDiscountAmount] = useState(0)
  const [discountError, setDiscountError] = useState("")
  const [appliedCode, setAppliedCode] = useState("")
  const [isApplying, setIsApplying] = useState(false)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [checkoutError, setCheckoutError] = useState("")

  const total = subtotal + serviceFee - discountAmount

  const handleCheckout = async () => {
    setIsCheckingOut(true)
    setCheckoutError("")
    try {
      const idempotencyKey = crypto.randomUUID()
      const res = await fetch("/api/paypal/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) {
        setCheckoutError(data.error || "Error al iniciar el pago")
        return
      }
      if (data.approveUrl && data.orderId) {
        // Guardar orderId interno para recuperarlo al regresar de PayPal
        sessionStorage.setItem("alacranes_order_id", data.orderId)
        // Redirigir al sandbox de PayPal
        window.location.href = data.approveUrl
      } else {
        setCheckoutError("No se recibió la URL de pago de PayPal")
      }
    } catch {
      setCheckoutError("Error de conexión. Intenta de nuevo.")
    } finally {
      setIsCheckingOut(false)
    }
  }

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) return

    setIsApplying(true)
    setDiscountError("")

    try {
      const result = await onApplyDiscount(discountCode)
      if (result.success && result.discountAmount) {
        setDiscountAmount(result.discountAmount)
        setAppliedCode(discountCode.toUpperCase())
        setDiscountCode("")
      } else {
        setDiscountError(result.error || "Codigo invalido")
      }
    } catch {
      setDiscountError("Error al aplicar el codigo")
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="p-5 lg:p-6">
        <h2 className="mb-5 text-xl font-bold text-card-foreground">
          Resumen del pedido
        </h2>

        {/* Subtotal & fees */}
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              Subtotal ({itemCount} boletos)
            </span>
            <span className="font-semibold text-card-foreground">
              ${subtotal.toFixed(1)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Cargos por servicio</span>
            <span className="font-semibold text-card-foreground">
              ${serviceFee.toFixed(2)}
            </span>
          </div>
          {discountAmount > 0 && (
            <div className="flex items-center justify-between text-emerald">
              <span>Descuento ({appliedCode})</span>
              <span className="font-semibold">-${discountAmount.toFixed(2)}</span>
            </div>
          )}
        </div>

        <div className="my-5 h-px bg-border" />

        {/* Discount code input */}
        <div className="mb-5">
          <label className="mb-2 block text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
            Codigo de Descuento
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
              placeholder="ALACRAN24"
              className="flex-1 rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-card-foreground placeholder:text-muted-foreground focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest"
            />
            <button
              onClick={handleApplyDiscount}
              disabled={isApplying || !discountCode.trim()}
              className="rounded-lg bg-card-foreground px-4 py-2.5 text-xs font-bold text-card transition-colors hover:bg-card-foreground/90 disabled:opacity-50"
            >
              {isApplying ? "..." : "APLICAR"}
            </button>
          </div>
          {discountError && (
            <p className="mt-2 text-xs text-[#D32F2F]">{discountError}</p>
          )}
        </div>

        {/* Total */}
        <div className="mb-5">
          <span className="mb-1 block text-xs text-muted-foreground uppercase">
            Total
          </span>
          <p className="text-3xl font-extrabold text-emerald lg:text-4xl">
            ${total.toFixed(2)}
          </p>
          <span className="text-[10px] tracking-wider text-muted-foreground uppercase">
            Pesos Mexicanos
          </span>
        </div>

        {/* Error de checkout */}
        {checkoutError && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5 text-xs text-red-400">
            <AlertCircle className="size-3.5 shrink-0" />
            {checkoutError}
          </div>
        )}

        {/* CTA Button */}
        <button
          onClick={handleCheckout}
          disabled={isCheckingOut || disabled || itemCount === 0}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald px-6 py-4 text-sm font-bold tracking-wider text-card uppercase transition-colors hover:bg-emerald-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isCheckingOut ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Redirigiendo a PayPal...
            </>
          ) : (
            <>
              Continuar al Pago
              <ArrowRight className="size-4" />
            </>
          )}
        </button>

        {/* Payment methods */}
        <div className="mt-5 text-center">
          <span className="mb-2 block text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
            Metodo de Pago Aceptado
          </span>
          <div className="flex items-center justify-center">
            <div className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#003087] px-5">
              <span className="text-sm font-black text-white tracking-tight">Pay</span>
              <span className="text-sm font-black text-[#009cde] tracking-tight">Pal</span>
            </div>
          </div>
        </div>

        {/* Security badge */}
        <div className="mt-4 flex items-center justify-center gap-1.5 text-muted-foreground">
          <Shield className="size-3.5" />
          <span className="text-[10px] tracking-wide uppercase">
            Transaccion Protegida por SSL de 256 bits
          </span>
        </div>
      </div>
    </div>
  )
}
