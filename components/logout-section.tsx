"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut, Loader2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { supabase } from "@/lib/supabase"

export function LogoutSection() {
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await supabase.auth.signOut()
      router.replace("/login")
    } catch (err) {
      console.error("Error al cerrar sesión:", err)
      setLoggingOut(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">
          Cerrar Sesión
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Finaliza tu sesión activa en este dispositivo.
        </p>
      </div>

      <div className="h-px w-full bg-border" />

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button
            disabled={loggingOut}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#D32F2F] py-4 text-sm font-bold text-white transition-colors hover:bg-[#C62828] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loggingOut ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <LogOut className="size-5" />
            )}
            {loggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
          </button>
        </AlertDialogTrigger>

        <AlertDialogContent className="bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">
              ¿Cerrar sesión?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              ¿Estás seguro de que deseas cerrar sesión? Tendrás que iniciar
              sesión nuevamente para acceder a tu cuenta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-foreground hover:bg-secondary">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sí, cerrar sesión
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
