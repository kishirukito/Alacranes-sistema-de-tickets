"use client"

import { FileText, ExternalLink } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
} from "recharts"

interface SalesChartProps {
  data: { month: string; amount: number }[]
}

export function SalesChart({ data }: SalesChartProps) {
  const maxValue = Math.max(...data.map((d) => d.amount))

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-card-foreground">
            Rendimiento de Ventas Mensuales
          </h3>
          <p className="text-sm text-muted-foreground">
            Visualización de ingresos acumulados por mes (2024)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-card-foreground transition-colors hover:bg-secondary">
            <FileText className="size-4" />
            Exportar PDF
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-forest px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-forest-light">
            Ver Reporte Completo
            <ExternalLink className="size-4" />
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#888" }}
              dy={10}
            />
            <YAxis hide />
            <Bar dataKey="amount" radius={[6, 6, 0, 0]} maxBarSize={80}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    entry.amount === maxValue
                      ? "#00C853"
                      : entry.amount > maxValue * 0.7
                      ? "#004D40"
                      : entry.amount > maxValue * 0.4
                      ? "#00695C"
                      : "#E0E0E0"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
