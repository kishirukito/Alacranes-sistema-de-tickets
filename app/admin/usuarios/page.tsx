"use client"

import { useEffect, useState, useCallback } from "react"
import {
  UserPlus, Eye, Pencil, Ban,
  Trash2, AlertTriangle, Save, Unlock, X, Shield, Loader2,
  CheckCircle, AlertCircle,
} from "lucide-react"

interface User {
  id: string
  name: string
  email: string
  registrationDate: string
  status: string
  role: string
  roleKey: string
  initials: string
}

const statusStyles: Record<string, string> = {
  Activo: "bg-emerald/10 text-emerald border border-emerald/30",
  Bloqueado: "bg-red-50 text-red-600 border border-red-200",
}

const ROLE_OPTIONS = [
  { key: "admin",  label: "Administrador" },
  { key: "staff",  label: "Personal de Staff" },
  { key: "fan",    label: "Aficionado" },
]

export default function UsuariosPage() {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [showNewUserModal, setShowNewUserModal] = useState(false)

  // Role change modal
  const [roleModalUser, setRoleModalUser] = useState<User | null>(null)
  const [newRoleKey, setNewRoleKey] = useState("")
  const [changingRole, setChangingRole] = useState(false)
  const [roleStatus, setRoleStatus] = useState<"idle"|"ok"|"error">("idle")
  const [roleError, setRoleError] = useState("")

  const [newUserForm, setNewUserForm] = useState({ name: "", email: "", status: "Activo", role: "Personal de Staff" })

  useEffect(() => {
    fetch("/api/admin/usuarios")
      .then((res) => res.json())
      .then((data) => { setUsers(data.data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const handleSelectUser = (user: User) => setSelectedUser(user)

  const handleDelete = useCallback(async (user: User) => {
    if (!confirm(`¿Eliminar a ${user.name}? Esta acción no se puede deshacer.`)) return
    const res = await fetch(`/api/admin/usuarios/${user.id}`, { method: "DELETE" })
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== user.id))
      if (selectedUser?.id === user.id) setSelectedUser(null)
    }
  }, [selectedUser])

  const handleToggleBlock = useCallback(async (user: User) => {
    const newStatus = user.status === "Activo" ? "Bloqueado" : "Activo"
    const res = await fetch(`/api/admin/usuarios/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...user, status: newStatus }),
    })
    if (res.ok) {
      const data = await res.json()
      setUsers((prev) => prev.map((u) => (u.id === user.id ? data.data : u)))
      if (selectedUser?.id === user.id) setSelectedUser(data.data)
    }
  }, [selectedUser])

  // ── Role change ────────────────────────────────────────────────────────────
  const openRoleModal = (user: User) => {
    setRoleModalUser(user)
    setNewRoleKey(user.roleKey || "fan")
    setRoleStatus("idle")
    setRoleError("")
  }

  const handleChangeRole = async () => {
    if (!roleModalUser || !newRoleKey) return
    setChangingRole(true)
    setRoleStatus("idle")
    setRoleError("")
    try {
      const res = await fetch("/api/admin/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: roleModalUser.id, role: newRoleKey }),
      })
      const data = await res.json()
      if (!res.ok) {
        setRoleError(data.error || "Error al cambiar rol")
        setRoleStatus("error")
        return
      }
      const roleLabel = ROLE_OPTIONS.find((r) => r.key === newRoleKey)?.label || newRoleKey
      setUsers((prev) =>
        prev.map((u) => u.id === roleModalUser.id ? { ...u, role: roleLabel, roleKey: newRoleKey } : u)
      )
      if (selectedUser?.id === roleModalUser.id) {
        setSelectedUser((s) => s ? { ...s, role: roleLabel, roleKey: newRoleKey } : null)
      }
      setRoleStatus("ok")
      setTimeout(() => { setRoleModalUser(null); setRoleStatus("idle") }, 1000)
    } catch {
      setRoleError("Error de red. Intenta de nuevo.")
      setRoleStatus("error")
    } finally {
      setChangingRole(false)
    }
  }

  // ── Create user ────────────────────────────────────────────────────────────
  const handleCreateUser = async () => {
    if (!newUserForm.name || !newUserForm.email) return
    const initials = newUserForm.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    const res = await fetch("/api/admin/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newUserForm, initials }),
    })
    if (res.ok) {
      const data = await res.json()
      setUsers((prev) => [data.data, ...prev])
      setShowNewUserModal(false)
      setNewUserForm({ name: "", email: "", status: "Activo", role: "Personal de Staff" })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header action */}
      <div className="flex justify-end">
        <button onClick={() => setShowNewUserModal(true)}
          className="flex items-center gap-2 rounded-lg bg-forest px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-forest-light">
          <UserPlus className="size-4" />
          Nuevo Usuario
        </button>
      </div>

      {/* Users table */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-foreground">Lista de Usuarios</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["Nombre","Correo","Fecha de Registro","Rol","Estatus","Acciones"].map((h) => (
                  <th key={h} className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground last:text-right">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-muted-foreground">Cargando usuarios...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-muted-foreground">No hay usuarios registrados</td></tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}
                    className={`border-b border-border/50 last:border-0 transition-colors hover:bg-secondary/30 ${selectedUser?.id === user.id ? "bg-emerald/5" : ""}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 items-center justify-center rounded-full bg-emerald/10 text-xs font-semibold text-emerald">
                          {user.initials}
                        </div>
                        <span className="text-sm font-medium text-foreground">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{user.email}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {user.registrationDate || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-foreground">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusStyles[user.status] || "bg-secondary text-muted-foreground"}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleSelectUser(user)} title="Ver detalles"
                          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground">
                          <Eye className="size-4" />
                        </button>
                        <button onClick={() => openRoleModal(user)} title="Cambiar rol"
                          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-forest">
                          <Shield className="size-4" />
                        </button>
                        <button onClick={() => handleToggleBlock(user)} title={user.status === "Activo" ? "Bloquear" : "Desbloquear"}
                          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground">
                          {user.status === "Activo" ? <Ban className="size-4" /> : <Unlock className="size-4" />}
                        </button>
                        <button onClick={() => handleDelete(user)} title="Eliminar"
                          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600">
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit panel */}
      {selectedUser && (
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-foreground">Detalles del Usuario</h3>
            <button onClick={() => setSelectedUser(null)} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoField label="Nombre" value={selectedUser.name} />
            <InfoField label="Correo" value={selectedUser.email} />
            <InfoField label="Fecha de registro" value={selectedUser.registrationDate || "—"} />
            <InfoField label="Rol" value={selectedUser.role} />
            <InfoField label="Estatus" value={selectedUser.status} />
          </div>
          <div className="mt-4 flex gap-3">
            <button onClick={() => openRoleModal(selectedUser)}
              className="flex items-center gap-2 rounded-lg border border-forest/30 bg-forest/10 px-4 py-2.5 text-sm font-semibold text-forest hover:bg-forest/20">
              <Shield className="size-4" />
              Cambiar Rol
            </button>
          </div>
        </div>
      )}

      {/* ── Role Change Modal ── */}
      {roleModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { if (!changingRole) setRoleModalUser(null) }} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-forest/10">
                  <Shield className="size-4 text-forest" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">Cambiar Rol</h2>
                  <p className="text-xs text-muted-foreground">{roleModalUser.name}</p>
                </div>
              </div>
              <button onClick={() => setRoleModalUser(null)} disabled={changingRole}
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary disabled:opacity-50">
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-2 mb-5">
              {ROLE_OPTIONS.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setNewRoleKey(r.key)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                    newRoleKey === r.key
                      ? "border-forest bg-forest/5 text-forest"
                      : "border-border text-foreground hover:bg-secondary/50"
                  }`}
                >
                  <div className={`size-4 rounded-full border-2 flex items-center justify-center ${newRoleKey === r.key ? "border-forest" : "border-muted-foreground"}`}>
                    {newRoleKey === r.key && <div className="size-2 rounded-full bg-forest" />}
                  </div>
                  <span className="text-sm font-medium">{r.label}</span>
                </button>
              ))}
            </div>

            {roleStatus === "error" && roleError && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50/10 border border-red-200/20 px-3 py-2">
                <AlertCircle className="size-3.5 shrink-0 text-red-400" />
                <p className="text-xs text-red-400">{roleError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setRoleModalUser(null)} disabled={changingRole}
                className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={handleChangeRole} disabled={changingRole || roleStatus === "ok" || newRoleKey === roleModalUser.roleKey}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
                  roleStatus === "ok" ? "bg-emerald" : "bg-forest hover:bg-forest-light"
                }`}>
                {changingRole ? <Loader2 className="size-4 animate-spin" /> : roleStatus === "ok" ? <CheckCircle className="size-4" /> : <Save className="size-4" />}
                {changingRole ? "Guardando..." : roleStatus === "ok" ? "Guardado ✓" : "Guardar Rol"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New User Modal */}
      {showNewUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowNewUserModal(false)} />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-forest/10">
                  <UserPlus className="size-4 text-forest" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">Nuevo Usuario</h2>
                  <p className="text-xs text-muted-foreground">Completa los datos para registrar un nuevo miembro.</p>
                </div>
              </div>
              <button onClick={() => setShowNewUserModal(false)}
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary">
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-4">
              <Field label="Nombre Completo">
                <input type="text" value={newUserForm.name} onChange={(e) => setNewUserForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ej. Juan Pérez" className={inputCls} />
              </Field>
              <Field label="Correo Electrónico">
                <input type="email" value={newUserForm.email} onChange={(e) => setNewUserForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="correo@alacranes.com" className={inputCls} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Estatus">
                  <select value={newUserForm.status} onChange={(e) => setNewUserForm((f) => ({ ...f, status: e.target.value }))} className={inputCls}>
                    <option>Activo</option>
                    <option>Bloqueado</option>
                  </select>
                </Field>
                <Field label="Rol">
                  <select value={newUserForm.role} onChange={(e) => setNewUserForm((f) => ({ ...f, role: e.target.value }))} className={inputCls}>
                    {ROLE_OPTIONS.map((r) => <option key={r.key} value={r.label}>{r.label}</option>)}
                  </select>
                </Field>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowNewUserModal(false)}
                className="rounded-lg px-5 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary">
                Cancelar
              </button>
              <button onClick={handleCreateUser} disabled={!newUserForm.name || !newUserForm.email}
                className="flex items-center gap-2 rounded-lg bg-forest px-5 py-2.5 text-sm font-semibold text-white hover:bg-forest-light disabled:opacity-50">
                <UserPlus className="size-4" />
                Crear Usuario
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const inputCls = "w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}
