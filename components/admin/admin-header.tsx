"use client"

import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { Bell, User } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { supabase } from "@/lib/supabase"

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/admin": {
    title: "Resumen General",
    subtitle: "Bienvenido al panel de administracion.",
  },
  "/admin/eventos": {
    title: "Gestion de Eventos",
    subtitle: "Administra el calendario de partidos y eventos especiales del club.",
  },
  "/admin/zonas": {
    title: "Gestion de Zonas",
    subtitle: "Administra los precios y disponibilidad de las areas del estadio Francisco Zarco.",
  },
  "/admin/ventas": {
    title: "Gestion de Ventas",
    subtitle: "Supervisa y filtra el historial de transacciones de boletos.",
  },
  "/admin/usuarios": {
    title: "Gestion de Usuarios",
    subtitle: "Administra los accesos y perfiles de los miembros del club.",
  },
  "/admin/reportes": {
    title: "Reportes y Estadisticas",
    subtitle: "Visualiza el rendimiento y metricas de ventas del club.",
  },
  "/admin/equipos": {
    title: "Gestión de Equipos",
    subtitle: "Administra el catálogo de equipos del circuito.",
  },
  "/admin/taquilla": {
    title: "Taquilla / Validación",
    subtitle: "Escanea y valida boletos en la entrada del estadio.",
  },
}

interface AdminUser {
  fullName: string
  email: string
  initials: string
}

export function AdminHeader() {
  const pathname = usePathname()
  const page = pageTitles[pathname] ?? { title: "Panel Administrativo", subtitle: "" }
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null)

  useEffect(() => {
    async function loadAdmin() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Obtener perfil desde la API para tener el nombre completo
      try {
        const res = await fetch("/api/profile")
        if (res.ok) {
          const { data } = await res.json()
          const fullName = data.fullName || `${data.name} ${data.lastName}`.trim() || "Administrador"
          const initials = fullName
            .split(" ")
            .slice(0, 2)
            .map((n: string) => n[0])
            .join("")
            .toUpperCase()
          setAdminUser({ fullName, email: data.email || user.email || "", initials })
        }
      } catch {
        // Fallback con datos del token
        const meta = user.user_metadata
        const fullName = meta?.full_name || user.email?.split("@")[0] || "Admin"
        const initials = fullName.split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase()
        setAdminUser({ fullName, email: user.email || "", initials })
      }
    }
    loadAdmin()
  }, [])

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-8">
      {/* Page title */}
      <div>
        <h1 className="text-xl font-bold leading-tight text-card-foreground">
          {page.title}
        </h1>
        {page.subtitle && (
          <p className="text-xs text-muted-foreground">{page.subtitle}</p>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">

        {/* Notifications */}
        <button className="relative flex size-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-secondary">
          <Bell className="size-5" />
        </button>

        {/* Divider */}
        <div className="h-8 w-px bg-border" />

        {/* Admin info */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-semibold text-card-foreground">
              {adminUser?.fullName || "Cargando..."}
            </p>
            <p className="text-[10px] font-medium tracking-wide text-emerald uppercase">
              Administrador
            </p>
          </div>
          <Avatar className="size-9 border-2 border-emerald/30">
            <AvatarImage src="" alt={adminUser?.fullName} />
            <AvatarFallback className="bg-forest text-sm font-bold text-white">
              {adminUser?.initials || <User className="size-4" />}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}
