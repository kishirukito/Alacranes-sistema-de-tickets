"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Shield, Plus, Pencil, Trash2, X, Save, CheckCircle,
  AlertCircle, RefreshCw, Star, Home,
} from "lucide-react"
import Image from "next/image"

// ── Types ─────────────────────────────────────────────────────────────────────
interface Team {
  id: string
  name: string
  shortName: string
  city: string
  logoUrl: string | null
  isHomeTeam: boolean
  createdAt: string
}

type FormData = {
  name: string
  shortName: string
  city: string
  logoUrl: string
  isHomeTeam: boolean
}

const defaultForm: FormData = {
  name: "",
  shortName: "",
  city: "",
  logoUrl: "",
  isHomeTeam: false,
}

// ── TeamCard ──────────────────────────────────────────────────────────────────
function TeamCard({
  team,
  onEdit,
  onDelete,
}: {
  team: Team
  onEdit: (t: Team) => void
  onDelete: (t: Team) => void
}) {
  return (
    <div className="group relative flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4 transition-all hover:border-forest/40 hover:shadow-md hover:shadow-forest/5">
      {/* Logo / Avatar */}
      <div className="relative flex size-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-secondary/50">
        {team.logoUrl ? (
          <Image
            src={team.logoUrl}
            alt={team.name}
            fill
            className="object-contain p-1"
            onError={(e) => {
              const t = e.target as HTMLImageElement
              t.style.display = "none"
            }}
          />
        ) : (
          <Shield className="size-6 text-muted-foreground/40" />
        )}
        {team.isHomeTeam && (
          <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-forest shadow-sm">
            <Star className="size-2.5 text-white" />
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-foreground">{team.name}</p>
          <span className="rounded-md border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {team.shortName}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {team.city || "Sin ciudad registrada"}
          {team.isHomeTeam && (
            <span className="ml-2 inline-flex items-center gap-1 font-medium text-forest">
              <Home className="size-3" /> Local
            </span>
          )}
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={() => onEdit(team)}
          className="flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-forest/40 hover:text-forest"
          title="Editar"
        >
          <Pencil className="size-3.5" />
        </button>
        <button
          onClick={() => onDelete(team)}
          className="flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-red-300 hover:text-red-500"
          title="Eliminar"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function EquiposPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal state
  const [showForm, setShowForm] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [deletingTeam, setDeletingTeam] = useState<Team | null>(null)
  const [form, setForm] = useState<FormData>(defaultForm)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle")
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchTeams = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/equipos")
      if (!res.ok) throw new Error("Error al cargar equipos")
      const { data } = await res.json()
      setTeams(data || [])
    } catch (err) {
      setError("No se pudieron cargar los equipos.")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTeams() }, [fetchTeams])

  // ── Helpers ────────────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditingTeam(null)
    setForm(defaultForm)
    setSaveStatus("idle")
    setSaveError(null)
    setShowForm(true)
  }

  const openEdit = (t: Team) => {
    setEditingTeam(t)
    setForm({
      name: t.name,
      shortName: t.shortName,
      city: t.city,
      logoUrl: t.logoUrl || "",
      isHomeTeam: t.isHomeTeam,
    })
    setSaveStatus("idle")
    setSaveError(null)
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingTeam(null)
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name.trim() || !form.shortName.trim()) return
    setSaving(true)
    setSaveStatus("idle")
    setSaveError(null)
    try {
      const payload = {
        name: form.name.trim(),
        shortName: form.shortName.trim(),
        city: form.city.trim(),
        logoUrl: form.logoUrl.trim() || null,
        isHomeTeam: form.isHomeTeam,
      }

      const res = editingTeam
        ? await fetch("/api/admin/equipos", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: editingTeam.id, ...payload }),
          })
        : await fetch("/api/admin/equipos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Error al guardar")

      setSaveStatus("saved")
      await fetchTeams()
      setTimeout(() => closeForm(), 800)
    } catch (err: any) {
      setSaveStatus("error")
      setSaveError(err.message || "Error al guardar el equipo")
      setTimeout(() => setSaveStatus("idle"), 4000)
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deletingTeam) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/admin/equipos?id=${deletingTeam.id}`, { method: "DELETE" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Error al eliminar")
      setDeletingTeam(null)
      await fetchTeams()
    } catch (err: any) {
      setDeleteError(err.message || "No se pudo eliminar el equipo")
    } finally {
      setDeleting(false)
    }
  }

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = teams

  const homeTeams = filtered.filter((t) => t.isHomeTeam)
  const visitingTeams = filtered.filter((t) => !t.isHomeTeam)

  const inputClass =
    "w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">

        <div className="flex gap-3">
          <button
            onClick={fetchTeams}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 rounded-lg bg-forest px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-forest-light"
          >
            <Plus className="size-4" />
            Agregar Equipo
          </button>
        </div>
      </div>

      {/* Stats strip */}
      {!loading && !error && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Equipos", value: teams.length },
            { label: "Equipos Locales", value: homeTeams.length },
            { label: "Equipos Visitantes", value: teams.filter((t) => !t.isHomeTeam).length },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-3xl font-bold text-foreground">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
          <div className="flex flex-col items-center gap-3">
            <div className="size-8 animate-spin rounded-full border-4 border-emerald border-t-transparent" />
            <p className="text-sm text-muted-foreground">Cargando equipos...</p>
          </div>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex h-48 items-center justify-center rounded-xl border border-red-200 bg-red-50/10">
          <div className="text-center">
            <p className="text-sm text-red-500">{error}</p>
            <button onClick={fetchTeams} className="mt-3 text-xs text-forest underline">Reintentar</button>
          </div>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && teams.length === 0 && (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card gap-3">
          <Shield className="size-12 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">Sin equipos registrados</p>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 rounded-lg bg-forest px-4 py-2 text-sm font-semibold text-white hover:bg-forest-light"
          >
            <Plus className="size-4" /> Agregar primero
          </button>
        </div>
      )}

      {/* Teams list */}
      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-6">
          {/* Home teams */}
          {homeTeams.length > 0 && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Home className="size-4 text-forest" />
                <h2 className="text-sm font-bold uppercase tracking-widest text-forest">
                  Equipo(s) Local
                </h2>
                <span className="text-xs text-muted-foreground">({homeTeams.length})</span>
                <div className="flex-1 border-t border-border" />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {homeTeams.map((t) => (
                  <TeamCard key={t.id} team={t} onEdit={openEdit} onDelete={setDeletingTeam} />
                ))}
              </div>
            </div>
          )}

          {/* Visiting teams */}
          {visitingTeams.length > 0 && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Shield className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                  Equipos Visitantes
                </h2>
                <span className="text-xs text-muted-foreground">({visitingTeams.length})</span>
                <div className="flex-1 border-t border-border" />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {visitingTeams.map((t) => (
                  <TeamCard key={t.id} team={t} onEdit={openEdit} onDelete={setDeletingTeam} />
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeForm} />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-forest/10">
                  <Shield className="size-4 text-forest" />
                </div>
                <h2 className="text-base font-semibold text-foreground">
                  {editingTeam ? "Editar Equipo" : "Nuevo Equipo"}
                </h2>
              </div>
              <button
                onClick={closeForm}
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Form */}
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej: Alacranes de Durango"
                  className={inputClass}
                />
              </div>

              {/* Short name + City (2 cols) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Abreviatura *
                  </label>
                  <input
                    type="text"
                    maxLength={5}
                    value={form.shortName}
                    onChange={(e) => setForm({ ...form, shortName: e.target.value.toUpperCase() })}
                    placeholder="Ej: ALC"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Ciudad
                  </label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="Ej: Durango"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Logo URL */}
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  URL del Escudo / Logo
                </label>
                <input
                  type="url"
                  value={form.logoUrl}
                  onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                  placeholder="https://cdn.ejemplo.com/escudo.png"
                  className={inputClass}
                />
                {/* Live preview */}
                {form.logoUrl.trim() && (
                  <div className="mt-2 flex items-center gap-3">
                    <div className="relative flex size-12 items-center justify-center overflow-hidden rounded-lg border border-border bg-secondary">
                      <Image
                        src={form.logoUrl}
                        alt="Preview"
                        fill
                        className="object-contain p-1"
                        onError={(e) => {
                          const t = e.target as HTMLImageElement
                          t.style.display = "none"
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Vista previa del escudo</p>
                  </div>
                )}
              </div>

              {/* Home team toggle */}
              <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/40 p-4">
                <button
                  onClick={() => setForm({ ...form, isHomeTeam: !form.isHomeTeam })}
                  className={`relative h-5 w-9 flex-shrink-0 rounded-full transition-colors ${
                    form.isHomeTeam ? "bg-forest" : "bg-muted"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform ${
                      form.isHomeTeam ? "left-4" : "left-0.5"
                    }`}
                  />
                </button>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {form.isHomeTeam ? "Equipo local (Alacranes)" : "Equipo visitante"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Activa esta opción si este es el equipo anfitrión del estadio
                  </p>
                </div>
              </div>

              {/* Error */}
              {saveStatus === "error" && saveError && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50/10 px-3 py-2.5">
                  <AlertCircle className="size-4 flex-shrink-0 text-red-500" />
                  <p className="text-xs text-red-500">{saveError}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={closeForm}
                className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim() || !form.shortName.trim()}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60 ${
                  saveStatus === "error" ? "bg-red-600 hover:bg-red-700" : "bg-forest hover:bg-forest-light"
                }`}
              >
                {saving ? (
                  <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : saveStatus === "saved" ? (
                  <CheckCircle className="size-4" />
                ) : saveStatus === "error" ? (
                  <AlertCircle className="size-4" />
                ) : (
                  <Save className="size-4" />
                )}
                {saving
                  ? "Guardando..."
                  : saveStatus === "saved"
                  ? "Guardado ✓"
                  : saveStatus === "error"
                  ? "Error"
                  : editingTeam
                  ? "Actualizar Equipo"
                  : "Crear Equipo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ── */}
      {deletingTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setDeletingTeam(null); setDeleteError(null) }} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-red-50">
              <Trash2 className="size-5 text-red-600" />
            </div>
            <h2 className="mb-2 text-base font-semibold text-foreground">Eliminar equipo</h2>
            <p className="mb-2 text-sm text-muted-foreground">
              ¿Eliminar a{" "}
              <strong className="text-foreground">{deletingTeam.name}</strong> ({deletingTeam.shortName})?
              Esta acción es irreversible.
            </p>
            {deleteError && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50/10 px-3 py-2.5">
                <AlertCircle className="mt-0.5 size-4 flex-shrink-0 text-red-500" />
                <p className="text-xs text-red-500">{deleteError}</p>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setDeletingTeam(null); setDeleteError(null) }}
                className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? (
                  <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                {deleting ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
