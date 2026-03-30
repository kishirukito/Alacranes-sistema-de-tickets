"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Mail, ArrowRight, Loader2, ArrowLeft, CheckCircle } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Error al procesar la solicitud")
        return
      }

      setIsSuccess(true)
    } catch {
      setError("Error de conexion. Intenta de nuevo.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Background image with overlay */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/hero-player.jpg"
          alt="Fondo estadio"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-br from-forest/90 via-forest/80 to-forest/70" />
      </div>

      {/* Header - Logo only */}
      <header className="relative z-10 px-6 py-5">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg border border-card/20 bg-card/10 backdrop-blur-sm">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="size-6 text-card"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
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
        <div className="w-full max-w-md rounded-2xl bg-card p-8 shadow-xl">
          {isSuccess ? (
            /* Success state */
            <div className="text-center">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-emerald/10">
                <CheckCircle className="size-8 text-emerald" />
              </div>
              <h1 className="mb-2 text-2xl font-bold text-card-foreground">
                Revisa tu correo
              </h1>
              <p className="mb-6 text-sm text-muted-foreground">
                Si el email existe en nuestro sistema, recibiras instrucciones para restablecer tu contraseña.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald hover:text-emerald-dark"
              >
                <ArrowLeft className="size-4" />
                Volver a iniciar sesion
              </Link>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="mb-6 text-center">
                <h1 className="text-2xl font-bold text-card-foreground">
                  Recuperar contraseña
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Ingresa tu email y te enviaremos instrucciones
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                {/* Email field */}
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-xs font-semibold tracking-wider text-card-foreground uppercase"
                  >
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@correo.com"
                      className="w-full rounded-lg border border-border bg-card py-3 pr-4 pl-11 text-sm text-card-foreground placeholder:text-muted-foreground focus:border-emerald focus:ring-2 focus:ring-emerald/20 focus:outline-none"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald px-6 py-3 text-sm font-semibold text-card transition-colors hover:bg-emerald-dark disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      Enviar instrucciones
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Back to login */}
              <div className="mt-6 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald hover:text-emerald-dark"
                >
                  <ArrowLeft className="size-4" />
                  Volver a iniciar sesion
                </Link>
              </div>
            </>
          )}
        </div>
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
