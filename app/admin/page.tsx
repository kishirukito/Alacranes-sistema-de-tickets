"use client"

import { useEffect, useState } from "react"
import { StatsCard } from "@/components/admin/stats-card"
import { SalesChart } from "@/components/admin/sales-chart"
import { EventsTable } from "@/components/admin/events-table"
import { DollarSign, CreditCard, Ticket } from "lucide-react"

interface DashboardData {
  stats: {
    dailySales: { amount: number; currency: string; change: number }
    monthlyIncome: { amount: number; currency: string; change: number }
    ticketsSold: { amount: number; unit: string; change: number }
  }
  monthlySales: { month: string; amount: number }[]
  upcomingEvents: {
    id: string
    title: string
    subtitle: string
    date: string
    time: string
    venue: string
    status: "active" | "soldout" | "upcoming" | "cancelled"
    icon?: string
  }[]
  totalEvents: number
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const response = await fetch("/api/admin/dashboard")
        const result = await response.json()
        setData(result)
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-emerald border-t-transparent" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Error al cargar los datos</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
        <div className="mb-6 grid gap-6 md:grid-cols-3">
          <StatsCard
            icon={DollarSign}
            label="Total de ventas del día"
            value={`$${data.stats.dailySales.amount.toLocaleString()}`}
            unit={data.stats.dailySales.currency}
            change={data.stats.dailySales.change}
          />
          <StatsCard
            icon={CreditCard}
            label="Ingresos del mes"
            value={`$${data.stats.monthlyIncome.amount.toLocaleString()}`}
            unit={data.stats.monthlyIncome.currency}
            change={data.stats.monthlyIncome.change}
            highlighted
          />
          <StatsCard
            icon={Ticket}
            label="Total de boletos vendidos"
            value={data.stats.ticketsSold.amount.toLocaleString()}
            unit={data.stats.ticketsSold.unit}
            change={data.stats.ticketsSold.change}
          />
        </div>

        {/* Sales Chart */}
        <div className="mb-6">
          <SalesChart data={data.monthlySales} />
        </div>

        {/* Events Table */}
        <EventsTable events={data.upcomingEvents} total={data.totalEvents} />
    </div>
  )
}
