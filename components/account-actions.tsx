"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { 
  Shield, 
  ChevronRight, 
  UserPen, 
  Lock, 
  Ticket, 
  ShoppingBag, 
  BarChart3,
  X,
  Eye,
  EyeOff,
  Mail,
  Phone,
  User,
  Loader2,
  CheckCircle2
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface ActionItemProps {
  icon: React.ReactNode
  label: string
  onClick?: () => void
  href?: string
}

function ActionItem({ icon, label, onClick, href }: ActionItemProps) {
  if (href) {
    return (
      <Link 
        href={href}
        className="flex w-full items-center justify-between rounded-xl border border-border bg-secondary/50 px-4 py-3.5 text-sm font-medium text-foreground transition-colors hover:border-emerald/30 hover:bg-secondary"
      >
        <span className="flex items-center gap-3">
          {icon}
          {label}
        </span>
        <ChevronRight className="size-4 text-muted-foreground" />
      </Link>
    )
  }

  return (
    <button 
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-xl border border-border bg-secondary/50 px-4 py-3.5 text-sm font-medium text-foreground transition-colors hover:border-emerald/30 hover:bg-secondary"
    >
      <span className="flex items-center gap-3">
        {icon}
        {label}
      </span>
      <ChevronRight className="size-4 text-muted-foreground" />
    </button>
  )
}

// Change Password Modal
function ChangePasswordModal({ 
  open, 
  onOpenChange 
}: { 
  open: boolean
  onOpenChange: (open: boolean) => void 
}) {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await fetch("/api/profile/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Error al cambiar la contraseña")
        return
      }

      setSuccess(true)
      setTimeout(() => {
        onOpenChange(false)
        setSuccess(false)
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      }, 1500)
    } catch {
      setError("Error de conexion")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Lock className="size-5 text-emerald" />
            Cambiar Contraseña
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <CheckCircle2 className="size-12 text-emerald" />
            <p className="text-sm font-medium text-foreground">Contraseña actualizada</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {error && (
              <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Contraseña Actual
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-secondary/50 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald focus:outline-none"
                  placeholder="Tu contraseña actual"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Nueva Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-secondary/50 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald focus:outline-none"
                  placeholder="Minimo 8 caracteres"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Confirmar Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-secondary/50 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald focus:outline-none"
                  placeholder="Repite la nueva contraseña"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald font-semibold text-card transition-colors hover:bg-emerald-dark disabled:opacity-50"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Guardar Cambios"}
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

// Edit Profile Modal
export function EditProfileModal({ 
  open, 
  onOpenChange,
  initialData,
  onSaved,
}: { 
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: { name: string; lastName: string; email: string; phone: string }
  onSaved?: (updated: { name: string; lastName: string; email: string; phone: string }) => void
}) {
  const [name, setName] = useState(initialData?.name || "")
  const [lastName, setLastName] = useState(initialData?.lastName || "")
  const [email, setEmail] = useState(initialData?.email || "")
  const [phone, setPhone] = useState(initialData?.phone || "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, lastName, email, phone }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Error al actualizar el perfil")
        return
      }

      setSuccess(true)
      onSaved?.({ name, lastName, email, phone })
      setTimeout(() => {
        onOpenChange(false)
        setSuccess(false)
      }, 1500)
    } catch {
      setError("Error de conexion")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
            <UserPen className="size-5 text-emerald" />
            Editar Perfil
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <CheckCircle2 className="size-12 text-emerald" />
            <p className="text-sm font-medium text-foreground">Perfil actualizado</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {error && (
              <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Nombre
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-11 w-full rounded-xl border border-border bg-secondary/50 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald focus:outline-none"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Apellido
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="h-11 w-full rounded-xl border border-border bg-secondary/50 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald focus:outline-none"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-secondary/50 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Telefono
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-secondary/50 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald font-semibold text-card transition-colors hover:bg-emerald-dark disabled:opacity-50"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Guardar Cambios"}
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

// Purchase History Modal
interface HistoryItem {
  id: string
  type: "boleto"
  description: string
  date: string
  quantity: number
  total: number
  status: string
}

function HistoryModal({ 
  open, 
  onOpenChange 
}: { 
  open: boolean
  onOpenChange: (open: boolean) => void 
}) {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [fetchLoading, setFetchLoading] = useState(false)
  const [fetchError, setFetchError] = useState("")

  useEffect(() => {
    if (!open) return
    setFetchLoading(true)
    setFetchError("")
    fetch("/api/profile/history")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setHistory(data.data.history)
        } else {
          setFetchError(data.error || "Error al obtener historial")
        }
      })
      .catch(() => setFetchError("Error de conexion"))
      .finally(() => setFetchLoading(false))
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
            <ShoppingBag className="size-5 text-emerald" />
            Historial de Compras
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-80 space-y-3 overflow-y-auto pt-2">
          {fetchLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-6 animate-spin text-emerald" />
            </div>
          )}
          {fetchError && (
            <p className="text-center text-sm text-destructive py-4">{fetchError}</p>
          )}
          {!fetchLoading && !fetchError && history.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">Sin compras registradas</p>
          )}
          {history.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-xl border border-border bg-secondary/50 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-emerald/10">
                  <Ticket className="size-4 text-emerald" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{item.description}</p>
                  <p className="text-xs text-muted-foreground">{item.date} · {item.quantity} boleto{item.quantity !== 1 ? "s" : ""}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-emerald">${item.total?.toLocaleString()}</p>
                <span className="text-[10px] font-medium text-emerald/80 uppercase">
                  {item.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function AccountActions({ section = "both" }: { section?: "account" | "activity" | "both" }) {
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [editProfileModalOpen, setEditProfileModalOpen] = useState(false)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)

  return (
    <>
      <div className={`grid gap-5 ${section === "both" ? "sm:grid-cols-2" : "grid-cols-1"}`}>
        {/* Gestion de Cuenta */}
        {(section === "both" || section === "account") && (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2.5">
              <Shield className="size-5 text-emerald" />
              <h3 className="text-base font-bold text-foreground">
                {"Gestion de Cuenta"}
              </h3>
            </div>
            <div className="flex flex-col gap-3">
              <ActionItem
                icon={<Lock className="size-4 text-emerald" />}
                label={"Cambiar contraseña"}
                onClick={() => setPasswordModalOpen(true)}
              />
              <ActionItem
                icon={<UserPen className="size-4 text-emerald" />}
                label={"Editar perfil publico"}
                onClick={() => setEditProfileModalOpen(true)}
              />
            </div>
          </div>
        )}

        {/* Actividad */}
        {(section === "both" || section === "activity") && (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2.5">
              <BarChart3 className="size-5 text-emerald" />
              <h3 className="text-base font-bold text-foreground">Actividad</h3>
            </div>
            <div className="flex flex-col gap-3">
              <ActionItem
                icon={<Ticket className="size-4 text-emerald" />}
                label="Mis Compras / Boletos"
                href="/mis-boletos"
              />
              <ActionItem
                icon={<ShoppingBag className="size-4 text-emerald" />}
                label="Historial de tienda"
                onClick={() => setHistoryModalOpen(true)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <ChangePasswordModal 
        open={passwordModalOpen} 
        onOpenChange={setPasswordModalOpen} 
      />
      <EditProfileModal 
        open={editProfileModalOpen} 
        onOpenChange={setEditProfileModalOpen} 
      />
      <HistoryModal 
        open={historyModalOpen} 
        onOpenChange={setHistoryModalOpen} 
      />
    </>
  )
}
