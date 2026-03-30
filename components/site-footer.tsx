import Link from "next/link"
import Image from "next/image"
import { MapPin, Phone, Mail } from "lucide-react"

const quickLinks = [
  { label: "Inicio", href: "/" },
  { label: "Partidos", href: "/partidos" },
  { label: "Patrocinadores", href: "/#patrocinadores" },
  { label: "Tienda", href: "/tienda" },
]

export function SiteFooter() {
  return (
    <footer className="bg-[#0a1f1a] py-12 lg:py-16">
      <div className="mx-auto max-w-6xl px-4 lg:px-6">
        <div className="grid gap-10 md:grid-cols-3">
          {/* Brand */}
          <div>
            <div className="mb-4 flex items-center gap-2.5">
              <div className="relative flex size-10 items-center justify-center overflow-hidden rounded-lg border-2 border-emerald bg-forest">
                <Image
                  src="/images/logoalacranes.png"
                  alt="Logo Alacranes"
                  fill
                  className="object-cover"
                />
              </div>
              <span className="text-base font-extrabold tracking-tight text-card">
                ALACRANES
              </span>
            </div>
            <p className="max-w-[240px] text-sm leading-relaxed text-card/60">
              Mas que un equipo, somos una familia. Unete a la pasion del futbol duranguense y vive cada partido como si fuera el ultimo.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-4 text-sm font-bold text-card">Enlaces Rapidos</h3>
            <ul className="flex flex-col gap-2.5">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-card/60 transition-colors hover:text-emerald"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="mb-4 text-sm font-bold text-card">Contacto</h3>
            <ul className="flex flex-col gap-3">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-emerald" />
                <span className="text-sm text-card/60">
                  Estadio Francisco Zarco, Durango, Mexico
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="size-4 shrink-0 text-emerald" />
                <span className="text-sm text-card/60">+52 618 130 15 83</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="size-4 shrink-0 text-emerald" />
                <span className="text-sm text-card/60">clubalacranesdedgo@gmail.com</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-10 border-t border-card/10 pt-6">
          <p className="text-center text-xs text-card/40">
            {"© 2025 Alacranes de Durango. Todos los derechos reservados."}
          </p>
        </div>
      </div>
    </footer>
  )
}
