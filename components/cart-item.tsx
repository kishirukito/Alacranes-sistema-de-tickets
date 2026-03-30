"use client"

import { Minus, Plus, Trash2, Calendar, MapPin, Grid3X3 } from "lucide-react"

export interface CartItemData {
  id: string
  matchTitle: string
  matchDate: string
  venue: string
  section: string
  zone: string
  zoneColor: string
  type: "adult" | "child"
  typeLabel: string
  price: number
  quantity: number
}

interface CartItemProps {
  item: CartItemData
  onUpdateQuantity: (id: string, quantity: number) => void
  onRemove: (id: string) => void
}

export function CartItem({ item, onUpdateQuantity, onRemove }: CartItemProps) {
  const isChild = item.type === "child"

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {/* Card content */}
      <div className="p-4 lg:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            {/* Left: Match info */}
            <div className="flex-1">
              <div className="mb-3 flex items-center gap-3">
                {/* Team logos placeholder */}
                <div className="flex items-center gap-2">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-forest text-xs font-bold text-card">
                    ALA
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">vs</span>
                  <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-xs font-bold text-muted-foreground">
                    MOR
                  </div>
                </div>

                {/* Child badge */}
                {isChild && (
                  <span className="rounded-md bg-emerald/15 px-2.5 py-1 text-[10px] font-bold tracking-wider text-forest uppercase">
                    Precio Infantil
                  </span>
                )}
              </div>

              {/* Title */}
              <h3 className="mb-2 text-base font-bold text-card-foreground lg:text-lg">
                {isChild ? item.typeLabel : item.matchTitle}
              </h3>

              {/* Details */}
              <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                {!isChild && (
                  <div className="flex items-center gap-2">
                    <Calendar className="size-3.5" />
                    <span>{item.matchDate}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <MapPin className="size-3.5" />
                  <span>{item.venue}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Grid3X3 className="size-3.5" />
                  <span>
                    Seccion: <strong className="text-card-foreground">{item.section}</strong>
                  </span>
                </div>
                {isChild && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Misma seccion que el boleto de adulto seleccionado.
                  </p>
                )}
              </div>
            </div>

            {/* Right: Price and quantity */}
            <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:gap-3">
              {/* Price */}
              <div className="text-right">
                <span className="text-xl font-bold text-card-foreground lg:text-2xl">
                  ${item.price.toFixed(2)}
                </span>
                <span className="ml-1 text-xs text-muted-foreground">MXN</span>
              </div>

              {/* Quantity controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                  className="flex size-8 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground transition-colors hover:border-forest hover:bg-muted hover:text-card-foreground"
                  aria-label="Reducir cantidad"
                >
                  <Minus className="size-3.5" />
                </button>
                <span className="w-8 text-center text-lg font-bold tabular-nums text-card-foreground">
                  {item.quantity}
                </span>
                <button
                  onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                  className="flex size-8 items-center justify-center rounded-lg border border-emerald bg-emerald text-card transition-colors hover:bg-emerald-dark"
                  aria-label="Aumentar cantidad"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>

              {/* Remove button */}
              <button
                onClick={() => onRemove(item.id)}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#D32F2F] transition-colors hover:text-[#B71C1C]"
              >
                <Trash2 className="size-3.5" />
                ELIMINAR
              </button>
          </div>
        </div>
      </div>
    </div>
  )
}
