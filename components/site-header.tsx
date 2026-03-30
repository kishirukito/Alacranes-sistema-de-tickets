"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Menu, User, Search, ShoppingBag, LogIn, Shield } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { supabase } from "@/lib/supabase"
import type { User as SupabaseUser } from "@supabase/supabase-js"

const allNavItems = [
  { label: "Inicio", href: "/" },
  { label: "Partidos", href: "/partidos" },
  { label: "Patrocinadores", href: "/#patrocinadores" },
  { label: "Tienda", href: "/tienda" },
]

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    // Obtener sesión inicial
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setAuthLoading(false)
      // Si hay sesión, consultar el rol
      if (data.user) {
        fetch("/api/profile")
          .then((r) => r.json())
          .then((profile) => {
            if (profile?.data?.role === "admin") setIsAdmin(true)
          })
          .catch(() => {})
      }
    })

    // Suscribirse a cambios de sesión (login / logout en tiempo real)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) {
        setIsAdmin(false)
      } else {
        fetch("/api/profile")
          .then((r) => r.json())
          .then((profile) => {
            setIsAdmin(profile?.data?.role === "admin")
          })
          .catch(() => {})
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const navItems = allNavItems

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-zinc-100/95 shadow-sm backdrop-blur-md" : "bg-transparent absolute"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2.5">
          <div className="relative flex size-10 items-center justify-center overflow-hidden rounded-full border-2 border-emerald bg-forest/60 backdrop-blur-sm">
            <Image
              src="/images/logoalacranes.png"
              alt="Logo Alacranes"
              fill
              className="object-cover"
            />
          </div>
          <div className="flex flex-col leading-none">
            <span className={`text-sm font-extrabold tracking-tight ${isScrolled ? "text-forest" : "text-card"}`}>
              ALACRANES
            </span>
            <span className="text-[10px] font-semibold tracking-wider text-emerald">
              PORTAL OFICIAL
            </span>
          </div>
        </a>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Navegacion principal">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={`group relative whitespace-nowrap px-4 py-2 text-sm font-medium transition-all duration-200 ${
                isScrolled ? "text-forest/80 hover:text-forest" : "text-card/80 hover:text-card"
              }`}
            >
              {item.label}
              <span className={`absolute bottom-0 left-4 right-4 h-0.5 origin-center scale-x-0 rounded-full transition-transform duration-200 ease-out group-hover:scale-x-100 ${
                isScrolled ? "bg-forest/80" : "bg-card/80"
              }`} />
            </a>
          ))}
        </nav>

        {/* Right Icons */}
        <div className="hidden items-center gap-1 md:flex">
          <button
            className={`flex size-9 items-center justify-center rounded-full transition-colors ${
              isScrolled ? "text-forest/80 hover:text-forest" : "text-card/80 hover:text-card"
            }`}
            aria-label="Buscar"
          >
            <Search className="size-4.5" />
          </button>

          {/* Login / Perfil dinámico */}
          {!authLoading && (
            user ? (
              // Usuario con sesión → ícono de perfil
              <>
                {isAdmin && (
                  <a
                    href="/admin"
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                      isScrolled
                        ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                        : "bg-amber-400/20 text-amber-300 hover:bg-amber-400/30"
                    }`}
                    aria-label="Panel de Administración"
                  >
                    <Shield className="size-3.5" />
                    Admin
                  </a>
                )}
                <a
                  href="/perfil"
                  className={`flex size-9 items-center justify-center rounded-full transition-colors ${
                    isScrolled ? "text-forest/80 hover:text-forest" : "text-card/80 hover:text-card"
                  }`}
                  aria-label="Mi Perfil"
                >
                  <User className="size-4.5" />
                </a>
              </>
            ) : (
              // Sin sesión → botón Log In
              <a
                href="/login"
                className={`flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-semibold transition-all duration-200 ${
                  isScrolled
                    ? "border-forest text-forest hover:bg-forest hover:text-white"
                    : "border-card/70 text-card hover:bg-card/10"
                }`}
                aria-label="Iniciar Sesion"
              >
                <LogIn className="size-3.5" />
                Log In
              </a>
            )
          )}

          <a
            href="/carrito"
            className={`relative flex size-9 items-center justify-center rounded-full transition-colors ${
              isScrolled ? "text-forest/80 hover:text-forest" : "text-card/80 hover:text-card"
            }`}
            aria-label="Carrito"
          >
            <ShoppingBag className="size-4.5" />
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-emerald text-[10px] font-bold text-card">
              3
            </span>
          </a>
        </div>

        {/* Mobile Menu */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              className={`inline-flex items-center justify-center rounded-md p-2 md:hidden ${
                isScrolled ? "text-forest" : "text-card"
              }`}
              aria-label="Abrir menu"
            >
              <Menu className="size-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 border-forest-light bg-forest p-0">
            <SheetTitle className="sr-only">Menu de navegacion</SheetTitle>
            <SheetDescription className="sr-only">Navegacion principal del sitio</SheetDescription>
            <div className="flex h-16 items-center gap-2.5 border-b border-forest-light px-4">
              <div className="relative flex size-9 items-center justify-center overflow-hidden rounded-full border-2 border-emerald bg-forest-light">
                <Image
                  src="/images/logoalacranes.png"
                  alt="Logo Alacranes"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-xs font-extrabold text-card">ALACRANES</span>
                <span className="text-[9px] font-semibold tracking-wider text-emerald">
                  PORTAL OFICIAL
                </span>
              </div>
            </div>
            <nav className="flex flex-col gap-1 p-4" aria-label="Menu movil">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-card/80 transition-colors hover:bg-forest-light hover:text-card"
                >
                  {item.label}
                </a>
              ))}

              {/* Login / Perfil en mobile */}
              {!authLoading && (
                user ? (
                  <>
                    {isAdmin && (
                      <a
                        href="/admin"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-bold text-amber-300 transition-colors hover:bg-forest-light hover:text-amber-200"
                      >
                        <Shield className="size-4" />
                        Panel de Administración
                      </a>
                    )}
                    <a
                      href="/perfil"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-card/80 transition-colors hover:bg-forest-light hover:text-card"
                    >
                      <User className="size-4" />
                      Mi Perfil
                    </a>
                  </>
                ) : (
                  <a
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-semibold text-emerald transition-colors hover:bg-forest-light hover:text-card"
                  >
                    <LogIn className="size-4" />
                    Iniciar Sesion
                  </a>
                )
              )}

              <div className="my-2 border-t border-forest-light" />
              <div className="flex items-center gap-3 px-3">
                <button className="text-card/80 hover:text-card" aria-label="Buscar">
                  <Search className="size-4" />
                </button>
                <a href="/carrito" onClick={() => setOpen(false)} className="text-card/80 hover:text-card" aria-label="Carrito">
                  <ShoppingBag className="size-4" />
                </a>
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
