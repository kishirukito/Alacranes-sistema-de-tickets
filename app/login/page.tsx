import Image from "next/image"
import Link from "next/link"
import { Suspense } from "react"
import { LoginForm } from "@/components/login-form"

export const metadata = {
  title: "Iniciar Sesion - Alacranes de Durango",
  description: "Inicia sesion en tu cuenta de Alacranes de Durango",
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Background image with overlay */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/Per.avif"
          alt="Fondo estadio"
          fill
          className="object-cover"
          priority
        />
        {/* Dark green gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-forest/90 via-forest/80 to-forest/70" />
      </div>

      {/* Header - Logo only */}
      <header className="relative z-10 px-6 py-5">
        <Link href="/" className="flex items-center gap-3">
          <div className="relative flex size-12 items-center justify-center overflow-hidden rounded-lg border border-card/20 bg-card/10 backdrop-blur-sm">
            <Image
              src="/images/logoalacranes.png"
              alt="Logo Alacranes"
              fill
              className="object-cover"
            />
          </div>
          <div>
            <span className="block text-lg font-bold tracking-wide text-card">
              ALACRANES
            </span>
            <span className="block text-[10px] font-medium tracking-widest text-emerald uppercase">
              Portal Oficial
            </span>
          </div>
        </Link>
      </header>

      {/* Main content - centered form */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-10">
        <Suspense fallback={
          <div className="w-full max-w-md rounded-2xl bg-card p-8 shadow-xl flex items-center justify-center min-h-[300px]">
            <div className="animate-spin rounded-full size-8 border-2 border-emerald border-t-transparent" />
          </div>
        }>
          <LoginForm />
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-5 text-center">
        <p className="text-xs text-card/60">
          {"© 2024 Alacranes de Durango. Todos los derechos reservados."}
        </p>
      </footer>
    </div>
  )
}

