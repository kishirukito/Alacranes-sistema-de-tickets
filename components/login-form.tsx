"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Mail, Lock, ArrowRight, Loader2, MailCheck, RefreshCw } from "lucide-react"
import { supabase } from "@/lib/supabase"

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  // Estado de espera de confirmación de correo
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false)
  const [confirmationEmail, setConfirmationEmail] = useState("")
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Leer parámetros de la URL al montar
  useEffect(() => {
    const isAwaiting = searchParams.get("awaiting_confirmation") === "true"
    const paramEmail = searchParams.get("email") || ""

    if (isAwaiting && paramEmail) {
      setAwaitingConfirmation(true)
      setConfirmationEmail(paramEmail)
      setEmail(paramEmail)
    }
  }, [searchParams])

  // Escuchar el evento de autenticación cuando el usuario confirme su correo
  useEffect(() => {
    if (!awaitingConfirmation) return

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      // SIGNED_IN se dispara cuando el enlace de confirmación es clickeado
      // y Supabase establece la sesión en este dispositivo.
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) {
        router.push("/")
        router.refresh()
      }
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [awaitingConfirmation, router])

  // Limpiar intervalo de cooldown al desmontar
  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current)
    }
  }, [])

  // Reenviar correo de confirmación
  const handleResendConfirmation = async () => {
    if (resendCooldown > 0 || resendLoading) return
    setResendLoading(true)
    setResendSuccess(false)

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: confirmationEmail,
      })

      if (!error) {
        setResendSuccess(true)
        setResendCooldown(60)

        cooldownRef.current = setInterval(() => {
          setResendCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(cooldownRef.current!)
              return 0
            }
            return prev - 1
          })
        }, 1000)
      }
    } catch {
      // Silenciar error — el usuario puede intentar de nuevo
    } finally {
      setResendLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      })

      if (authError) {
        // Si el error es por correo no confirmado, activar pantalla de espera
        if (
          authError.message.toLowerCase().includes("email not confirmed") ||
          authError.message.toLowerCase().includes("email_not_confirmed")
        ) {
          setAwaitingConfirmation(true)
          setConfirmationEmail(email.toLowerCase().trim())
          return
        }
        setError("Credenciales inválidas. Verifica tu correo y contraseña.")
        return
      }

      router.push("/")
      router.refresh()
    } catch {
      setError("Error de conexión. Intenta de nuevo.")
    } finally {
      setIsLoading(false)
    }
  }

  // ─── Pantalla de espera de confirmación ───────────────────────────────────
  if (awaitingConfirmation) {
    return (
      <div className="w-full max-w-md rounded-2xl bg-card p-8 shadow-xl">
        {/* Ícono animado */}
        <div className="mb-6 flex flex-col items-center gap-4">
          <div className="relative flex size-20 items-center justify-center">
            {/* Anillo pulsante */}
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald opacity-20" />
            <span className="relative flex size-16 items-center justify-center rounded-full bg-emerald/10 ring-2 ring-emerald/30">
              <MailCheck className="size-8 text-emerald" />
            </span>
          </div>

          <div className="text-center">
            <h1 className="text-xl font-bold text-card-foreground">
              Confirma tu correo
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enviamos un enlace de confirmación a
            </p>
            <p className="mt-1 text-sm font-semibold text-emerald break-all">
              {confirmationEmail}
            </p>
          </div>
        </div>

        {/* Estado animado */}
        <div className="mb-6 rounded-xl border border-emerald/20 bg-emerald/5 px-4 py-4">
          <div className="flex items-center gap-3">
            <Loader2 className="size-4 shrink-0 animate-spin text-emerald" />
            <p className="text-sm text-card-foreground">
              <span className="font-semibold">Esperando confirmación...</span>
              <span className="ml-1 text-muted-foreground">
                La sesión se iniciará automáticamente.
              </span>
            </p>
          </div>
        </div>

        {/* Instrucciones */}
        <ol className="mb-6 space-y-2.5">
          {[
            "Abre tu bandeja de entrada de Gmail",
            "Busca el correo de Alacranes de Durango",
            "Haz clic en el enlace 'Confirmar correo'",
            "¡Listo! Serás redirigido automáticamente",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald/10 text-[11px] font-bold text-emerald">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>

        {/* Reenviar correo */}
        <div className="border-t border-border pt-4 text-center">
          {resendSuccess && (
            <p className="mb-3 text-xs text-emerald font-medium">
              ✓ Correo reenviado correctamente
            </p>
          )}
          <p className="mb-3 text-xs text-muted-foreground">
            ¿No recibiste el correo?
          </p>
          <button
            type="button"
            onClick={handleResendConfirmation}
            disabled={resendCooldown > 0 || resendLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald/40 px-4 py-2 text-xs font-semibold text-emerald transition-colors hover:bg-emerald/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {resendLoading ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <RefreshCw className="size-3" />
            )}
            {resendCooldown > 0
              ? `Reenviar en ${resendCooldown}s`
              : "Reenviar correo"}
          </button>
        </div>

        {/* Volver al login */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setAwaitingConfirmation(false)
              setError("")
            }}
            className="text-xs text-muted-foreground hover:text-card-foreground underline underline-offset-2"
          >
            Volver al inicio de sesión
          </button>
        </div>
      </div>
    )
  }

  // ─── Formulario normal de login ───────────────────────────────────────────
  return (
    <div className="w-full max-w-md rounded-2xl bg-card p-8 shadow-xl">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-card-foreground">
          {"¡Bienvenido!"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Inicia sesión para acceder a tu portal de aficionado
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Error message */}
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
              placeholder="Introduce tu correo electrónico"
              className="w-full rounded-lg border border-border bg-card py-3 pr-4 pl-11 text-sm text-card-foreground placeholder:text-muted-foreground focus:border-emerald focus:ring-2 focus:ring-emerald/20 focus:outline-none"
              required
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Password field */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label
              htmlFor="password"
              className="text-xs font-semibold tracking-wider text-card-foreground uppercase"
            >
              Contraseña
            </label>
            <Link
              href="/recuperar-contrasena"
              className="text-xs font-medium text-emerald hover:text-emerald-dark"
            >
              {"¿Olvidaste tu contraseña?"}
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
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
              Iniciando sesión...
            </>
          ) : (
            <>
              Iniciar sesión
              <ArrowRight className="size-4" />
            </>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="my-6 flex items-center gap-4">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">o</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Register link */}
      <div className="text-center">
        <p className="mb-3 text-sm text-muted-foreground">
          {"¿Aún no tienes una cuenta?"}
        </p>
        <Link
          href="/registro"
          className="block w-full rounded-lg border-2 border-emerald px-6 py-3 text-sm font-semibold text-emerald transition-colors hover:bg-emerald/5"
        >
          Crear cuenta
        </Link>
      </div>
    </div>
  )
}
