"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Calendar,
  Map,
  ShoppingCart,
  Users,
  BarChart3,
  LogOut,
  AlertTriangle,
  X,
  QrCode,
  Shield,
  Star,
  Banknote,
} from "lucide-react"

const navItems = [
  {
    label: "Resumen General",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    label: "Gestión de Eventos",
    href: "/admin/eventos",
    icon: Calendar,
  },
  {
    label: "Gestión de Zonas",
    href: "/admin/zonas",
    icon: Map,
  },
  {
    label: "Gestión de Ventas",
    href: "/admin/ventas",
    icon: ShoppingCart,
  },
  {
    label: "Venta por Efectivo",
    href: "/admin/venta-directa",
    icon: Banknote,
  },
  {
    label: "Gestión de Usuarios",
    href: "/admin/usuarios",
    icon: Users,
  },
  {
    label: "Reportes y Estadísticas",
    href: "/admin/reportes",
    icon: BarChart3,
  },
  {
    label: "Validación de Boletos",
    href: "/admin/taquilla",
    icon: QrCode,
  },
  {
    label: "Gestión de Equipos",
    href: "/admin/equipos",
    icon: Shield,
  },
  {
    label: "Patrocinadores",
    href: "/admin/sponsors",
    icon: Star,
  },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-border px-5 py-5">
        <div className="relative flex size-10 items-center justify-center overflow-hidden rounded-xl bg-forest">
          <Image
            src="/images/logoalacranes.png"
            alt="Logo Alacranes"
            fill
            className="object-cover"
          />
        </div>
        <div>
          <span className="text-[15px] font-extrabold tracking-widest text-forest">
            ALACRANES
          </span>
          <span className="block text-[9px] font-semibold tracking-[0.2em] text-muted-foreground">
            ADMIN PANEL
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-3 py-5">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href))
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all ${isActive
                ? "bg-emerald/10 text-forest"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
            >
              {/* Active right border accent */}
              {isActive && (
                <div className="absolute right-0 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-l-full bg-forest" />
              )}
              <Icon
                className={`size-[18px] flex-shrink-0 ${isActive ? "text-forest" : "text-muted-foreground"
                  }`}
              />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-border px-3 py-4">
        <button
          onClick={() => setShowLogoutModal(true)}
          className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-[#D32F2F] transition-colors hover:bg-red-50"
        >
          <LogOut className="size-[18px]" />
          Cerrar Sesión
        </button>
      </div>

      {/* Logout confirmation modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowLogoutModal(false)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
            {/* Header */}
            <div className="mb-5 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-red-50">
                  <AlertTriangle className="size-5 text-red-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">Cerrar Sesión</h2>
                  <p className="text-xs text-muted-foreground">Esta accion cerrara tu sesion actual.</p>
                </div>
              </div>
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="mb-6 text-sm text-muted-foreground">
              Estas seguro que deseas cerrar sesion? Tendras que volver a iniciar sesion para acceder al panel administrativo.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={() => { setShowLogoutModal(false); window.location.href = "/" }}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700"
              >
                <LogOut className="size-4" />
                Cerrar Sesion
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
