"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Mail, Lock, User, Loader2 } from "lucide-react"

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    nombre: "",
    apellidos: "",
    email: "",
    password: "",
  })
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!acceptTerms) {
      setError("Debes aceptar los terminos y condiciones")
      return
    }

    if (formData.password.length < 8) {
      setError("La contraseña debe tener minimo 8 caracteres")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: formData.nombre,
          apellido: formData.apellidos,
          email: formData.email,
          password: formData.password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Error al crear la cuenta")
        return
      }

      // Si Supabase requiere confirmación de email, el API lo indica
      // Redirigir al login con el estado de "esperando confirmación"
      if (data.requiresConfirmation) {
        router.push(
          `/login?awaiting_confirmation=true&email=${encodeURIComponent(formData.email)}`
        )
      } else {
        router.push("/")
        router.refresh()
      }
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
          src="/images/registro-bg.jpg"
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
        <div className="w-full max-w-lg rounded-2xl bg-card p-8 shadow-xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-card-foreground">
              Crea tu cuenta
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Unete a la aficion oficial de los Alacranes
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Name fields - side by side */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="nombre"
                  className="mb-2 block text-xs font-semibold tracking-wider text-card-foreground uppercase"
                >
                  Nombre(s)
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="nombre"
                    name="nombre"
                    type="text"
                    value={formData.nombre}
                    onChange={handleChange}
                    placeholder="Tu nombre"
                    className="w-full rounded-xl border border-border bg-secondary/50 py-3 pr-4 pl-11 text-sm text-card-foreground placeholder:text-muted-foreground focus:border-emerald focus:bg-card focus:ring-2 focus:ring-emerald/20 focus:outline-none"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="apellidos"
                  className="mb-2 block text-xs font-semibold tracking-wider text-card-foreground uppercase"
                >
                  Apellidos
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="apellidos"
                    name="apellidos"
                    type="text"
                    value={formData.apellidos}
                    onChange={handleChange}
                    placeholder="Tus apellidos"
                    className="w-full rounded-xl border border-border bg-secondary/50 py-3 pr-4 pl-11 text-sm text-card-foreground placeholder:text-muted-foreground focus:border-emerald focus:bg-card focus:ring-2 focus:ring-emerald/20 focus:outline-none"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-xs font-semibold tracking-wider text-card-foreground uppercase"
              >
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="ejemplo@correo.com"
                  className="w-full rounded-xl border border-border bg-secondary/50 py-3 pr-4 pl-11 text-sm text-card-foreground placeholder:text-muted-foreground focus:border-emerald focus:bg-card focus:ring-2 focus:ring-emerald/20 focus:outline-none"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-xs font-semibold tracking-wider text-card-foreground uppercase"
              >
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Minimo 8 caracteres"
                  className="w-full rounded-xl border border-border bg-secondary/50 py-3 pr-4 pl-11 text-sm text-card-foreground placeholder:text-muted-foreground focus:border-emerald focus:bg-card focus:ring-2 focus:ring-emerald/20 focus:outline-none"
                  required
                  minLength={8}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Terms checkbox */}
            <div className="flex items-start gap-3">
              <input
                id="terms"
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-0.5 size-4 cursor-pointer rounded border-border text-emerald accent-emerald focus:ring-emerald"
                disabled={isLoading}
              />
              <label htmlFor="terms" className="text-sm leading-relaxed text-muted-foreground">
                Acepto los{" "}
                <Link href="/terminos" className="font-medium text-emerald hover:underline">
                  Terminos y Condiciones
                </Link>{" "}
                y el{" "}
                <Link href="/privacidad" className="font-medium text-emerald hover:underline">
                  Aviso de Privacidad
                </Link>
                .
              </label>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald px-6 py-3.5 text-sm font-semibold text-card transition-colors hover:bg-emerald-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creando cuenta...
                </>
              ) : (
                <>
                  Registrarme
                </>
              )}
            </button>
          </form>

          {/* Login link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {"Ya tienes una cuenta?"}
            </p>
            <Link
              href="/login"
              className="mt-1 inline-block text-sm font-semibold text-emerald hover:underline"
            >
              Iniciar sesion ahora
            </Link>
          </div>
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
