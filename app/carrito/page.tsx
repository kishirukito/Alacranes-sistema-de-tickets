"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { CartItem, CartItemData } from "@/components/cart-item"
import { OrderSummary } from "@/components/order-summary"
import { SiteFooter } from "@/components/site-footer"

export default function CarritoPage() {
  const [items, setItems] = useState<CartItemData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [paypalStatus, setPaypalStatus] = useState<"idle" | "capturing" | "success" | "cancel" | "error">("idle")
  const [paypalMessage, setPaypalMessage] = useState("")
  const searchParams = useSearchParams()
  const router = useRouter()

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const serviceFee = Math.round(subtotal * 0.05) // 5% service fee
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  // Fetch cart from API
  useEffect(() => {
    const fetchCart = async () => {
      setIsLoading(true)
      try {
        const res = await fetch("/api/cart")
        if (res.ok) {
          const data = await res.json()
          if (data.items) setItems(data.items)
        }
      } catch (error) {
        console.error("Error loading cart:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchCart()
  }, [])

  // Manejar retorno desde PayPal
  useEffect(() => {
    const paypal = searchParams.get("paypal")
    const token = searchParams.get("token")       // paypalOrderId
    const payerId = searchParams.get("PayerID")
    const orderId = searchParams.get("orderId") ?? searchParams.get("order_id")

    if (paypal === "cancel") {
      setPaypalStatus("cancel")
      setPaypalMessage("Cancelaste el pago. Tu carrito sigue intacto.")
      // Limpiar params de la URL
      router.replace("/carrito")
      return
    }

    if (paypal === "success" && token && payerId) {
      // Necesitamos el orderId interno — lo guardamos en sessionStorage al crear la orden
      const savedOrderId = orderId || sessionStorage.getItem("alacranes_order_id")
      if (!savedOrderId) {
        setPaypalStatus("error")
        setPaypalMessage("No se encontró la orden. Contacta soporte.")
        router.replace("/carrito")
        return
      }

      setPaypalStatus("capturing")
        ; (async () => {
          try {
            const res = await fetch("/api/paypal/capture-order", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Idempotency-Key": crypto.randomUUID(),
              },
              body: JSON.stringify({ paypalOrderId: token, orderId: savedOrderId }),
            })
            const data = await res.json()
            if (res.ok && data.success) {
              setPaypalStatus("success")
              setPaypalMessage(
                `¡Pago exitoso! Se generaron ${data.ticketsGenerated} boleto(s). Revisalos en Mis Boletos.`
              )
              sessionStorage.removeItem("alacranes_order_id")
              setItems([]) // Carrito vaciado
            } else {
              setPaypalStatus("error")
              setPaypalMessage(data.error || "Error al capturar el pago.")
            }
          } catch {
            setPaypalStatus("error")
            setPaypalMessage("Error de red al capturar el pago.")
          } finally {
            router.replace("/carrito")
          }
        })()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleUpdateQuantity = useCallback(async (id: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((item) => item.id !== id))
    } else {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, quantity } : item))
      )
    }

    // Sync with API
    try {
      await fetch("/api/cart", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, quantity }),
      })
    } catch (error) {
      console.log("[v0] Error updating cart", error)
    }
  }, [])

  const handleRemove = useCallback(async (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))

    // Sync with API
    try {
      await fetch(`/api/cart?id=${id}`, { method: "DELETE" })
    } catch (error) {
      console.log("[v0] Error removing item", error)
    }
  }, [])

  const handleApplyDiscount = useCallback(async (code: string) => {
    try {
      const res = await fetch("/api/cart/discount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, subtotal }),
      })
      const data = await res.json()
      if (!res.ok) {
        return { success: false, error: data.error }
      }
      return { success: true, discountAmount: data.discountAmount }
    } catch {
      return { success: false, error: "Error de conexion" }
    }
  }, [subtotal])

  return (
    <div className="min-h-screen bg-card">
      {/* Transparent header */}
      <SiteHeader />

      {/* Hero section with stadium bg */}
      <section className="relative h-[280px] overflow-hidden lg:h-[320px]">
        <Image
          src="/images/car.avif"
          alt="Estadio"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-forest/90 via-forest/80 to-forest/40" />

        {/* Title */}
        <div className="relative z-10 flex h-full flex-col items-center justify-end pb-10 pt-20">
          <h1 className="mb-2 text-center text-3xl font-black italic text-white lg:text-4xl">
            Resumen de tu Carrito
          </h1>
          <p className="max-w-md text-center text-sm text-white/70">
            Finaliza tu compra para asegurar tu lugar en el partido y apoyar a los Alacranes
          </p>
        </div>
      </section>

      {/* Cart content */}
      <main className="relative z-20 mx-auto max-w-6xl px-4 pb-10 lg:px-6">

        {/* Banner de estado PayPal */}
        {paypalStatus === "capturing" && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald/30 bg-emerald/10 px-5 py-4 text-sm text-emerald">
            <Loader2 className="size-5 animate-spin shrink-0" />
            <span className="font-semibold">Procesando tu pago con PayPal, por favor espera...</span>
          </div>
        )}
        {paypalStatus === "success" && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald/30 bg-emerald/10 px-5 py-4 text-sm text-emerald">
            <CheckCircle2 className="size-5 shrink-0" />
            <div>
              <p className="font-bold">¡Pago completado!</p>
              <p className="text-xs opacity-80">{paypalMessage}</p>
            </div>
            <Link href="/mis-boletos" className="ml-auto shrink-0 rounded-lg bg-emerald px-3 py-1.5 text-xs font-bold text-card hover:bg-emerald-dark transition-colors">
              Ver Boletos
            </Link>
          </div>
        )}
        {(paypalStatus === "cancel" || paypalStatus === "error") && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-400">
            <XCircle className="size-5 shrink-0" />
            <span>{paypalMessage}</span>
          </div>
        )}

        {/* Pull content up to overlap hero */}
        <div className="-mt-6 flex flex-col gap-6 lg:flex-row lg:gap-8">
          {/* Left: Cart items */}
          <div className="flex-1 space-y-4">
            {isLoading ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <p className="text-muted-foreground">Cargando carrito...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <p className="mb-4 text-muted-foreground">Tu carrito esta vacio</p>
                <Link
                  href="/asientos"
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald px-4 py-2 text-sm font-semibold text-card transition-colors hover:bg-emerald-dark"
                >
                  Agregar Boletos
                </Link>
              </div>
            ) : (
              items.map((item) => (
                <CartItem
                  key={item.id}
                  item={item}
                  onUpdateQuantity={handleUpdateQuantity}
                  onRemove={handleRemove}
                />
              ))
            )}
          </div>

          {/* Right: Order summary */}
          <div className="w-full lg:w-[360px]">
            <div className="sticky top-8">
              <OrderSummary
                subtotal={subtotal}
                serviceFee={serviceFee}
                itemCount={itemCount}
                onApplyDiscount={handleApplyDiscount}
                disabled={paypalStatus === "capturing" || paypalStatus === "success"}
              />

              {/* Continue shopping link */}
              <Link
                href="/asientos"
                className="mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-emerald transition-colors hover:text-forest"
              >
                <ArrowLeft className="size-4" />
                Seguir comprando
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <SiteFooter />
    </div>
  )
}
