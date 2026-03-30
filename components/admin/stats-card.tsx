import { LucideIcon } from "lucide-react"

interface StatsCardProps {
  icon: LucideIcon
  label: string
  value: string
  unit?: string
  change: number
  highlighted?: boolean
}

export function StatsCard({
  icon: Icon,
  label,
  value,
  unit,
  change,
  highlighted = false,
}: StatsCardProps) {
  const isPositive = change > 0

  return (
    <div
      className={`relative overflow-hidden rounded-xl border p-5 ${
        highlighted
          ? "border-forest bg-forest"
          : "border-border bg-card"
      }`}
    >
      <div className="flex items-start justify-between">
        {/* Icon */}
        <div
          className={`flex size-11 items-center justify-center rounded-xl ${
            highlighted
              ? "bg-forest-light/50 text-emerald"
              : "bg-secondary text-muted-foreground"
          }`}
        >
          <Icon className="size-5" />
        </div>

        {/* Change badge */}
        <span
          className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
            highlighted
              ? "bg-emerald/20 text-emerald"
              : isPositive
              ? "text-emerald"
              : "text-red-500"
          }`}
        >
          {isPositive ? "+" : ""}
          {change}%
        </span>
      </div>

      {/* Label */}
      <p
        className={`mt-4 text-sm ${
          highlighted ? "text-white/70" : "text-muted-foreground"
        }`}
      >
        {label}
      </p>

      {/* Value */}
      <div className="mt-1 flex items-baseline gap-2">
        <span
          className={`text-2xl font-bold tracking-tight ${
            highlighted ? "text-white" : "text-card-foreground"
          }`}
        >
          {value}
        </span>
        {unit && (
          <span
            className={`text-xs font-medium ${
              highlighted ? "text-white/50" : "text-muted-foreground"
            }`}
          >
            {unit}
          </span>
        )}
      </div>
    </div>
  )
}
