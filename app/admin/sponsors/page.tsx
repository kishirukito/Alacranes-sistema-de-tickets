"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Plus, X, Save, CheckCircle, AlertCircle, Star,
  Trash2, Globe, ExternalLink, Loader2, Building2
} from "lucide-react"

interface Sponsor {
  id: string
  name: string
  logo: string | null
  websiteUrl: string | null
  tier: "platinum" | "gold" | "silver" | "bronze"
  displayOrder: number
  isActive: boolean
}

const TIERS: { value: Sponsor["tier"]; label: string; color: string }[] = [
  { value: "platinum", label: "Platino", color: "text-gray-300 border-gray-300" },
  { value: "gold",     label: "Oro",     color: "text-yellow-400 border-yellow-400" },
  { value: "silver",   label: "Plata",   color: "text-gray-400 border-gray-400" },
  { value: "bronze",   label: "Bronce",  color: "text-amber-600 border-amber-600" },
]

const tierBg: Record<string, string> = {
  platinum: "border-gray-300 bg-gray-300/5",
  gold:     "border-yellow-400 bg-yellow-400/5",
  silver:   "border-gray-400 bg-gray-400/5",
  bronze:   "border-amber-600 bg-amber-600/5",
}

const emptyForm = {
  name: "",
  websiteUrl: "",
  logoUrl: "",
  tier: "gold" as Sponsor["tier"],
}

export default function SponsorsAdminPage() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [loading, setLoading] = useState(true)

  // Create modal
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState(emptyForm)
  const [creating, setCreating] = useState(false)
  const [createStatus, setCreateStatus] = useState<"idle" | "ok" | "error">("idle")
  const [createError, setCreateError] = useState("")

  // Edit modal
  const [editSponsor, setEditSponsor] = useState<Sponsor | null>(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "ok" | "error">("idle")
  const [saveError, setSaveError] = useState("")

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // ── Fetch ────────────────────────────────────────────────────────
  const fetchSponsors = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/sponsors")
      const data = await res.json()
      setSponsors(data.data || [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchSponsors() }, [fetchSponsors])

  // ── Create ───────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!createForm.name.trim()) {
      setCreateError("El nombre es requerido.")
      setCreateStatus("error")
      return
    }
    setCreating(true)
    setCreateError("")
    setCreateStatus("idle")
    try {
      const res = await fetch("/api/sponsors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name.trim(),
          websiteUrl: createForm.websiteUrl.trim() || null,
          logoUrl: createForm.logoUrl.trim() || null,
          tier: createForm.tier,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setCreateError(data.error || "Error al crear patrocinador.")
        setCreateStatus("error")
        return
      }
      setCreateStatus("ok")
      fetchSponsors()
      setTimeout(() => {
        setShowCreate(false)
        setCreateStatus("idle")
        setCreateForm(emptyForm)
      }, 1200)
    } catch {
      setCreateError("Error de red. Intenta de nuevo.")
      setCreateStatus("error")
    } finally {
      setCreating(false)
    }
  }

  // ── Edit ─────────────────────────────────────────────────────────
  const openEdit = (s: Sponsor) => {
    setEditSponsor(s)
    setEditForm({
      name: s.name,
      websiteUrl: s.websiteUrl || "",
      logoUrl: s.logo || "",
      tier: s.tier,
    })
    setSaveStatus("idle")
    setSaveError("")
  }

  const handleSave = async () => {
    if (!editSponsor) return
    setSaving(true)
    setSaveStatus("idle")
    setSaveError("")
    try {
      const res = await fetch("/api/sponsors", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editSponsor.id,
          name: editForm.name.trim(),
          websiteUrl: editForm.websiteUrl.trim() || null,
          logoUrl: editForm.logoUrl.trim() || null,
          tier: editForm.tier,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSaveError(data.error || "Error al guardar.")
        setSaveStatus("error")
        return
      }
      setSaveStatus("ok")
      fetchSponsors()
      setTimeout(() => {
        setEditSponsor(null)
        setSaveStatus("idle")
      }, 1200)
    } catch {
      setSaveError("Error de red.")
      setSaveStatus("error")
    } finally {
      setSaving(false)
    }
  }

  // ── Delete (soft) ────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await fetch(`/api/sponsors?id=${id}`, { method: "DELETE" })
      setSponsors(prev => prev.filter(s => s.id !== id))
    } catch { /* ignore */ }
    finally { setDeletingId(null) }
  }

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Patrocinadores</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Administra los patrocinadores que aparecen en el sitio público.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-forest px-5 py-2.5 text-sm font-semibold text-white hover:bg-forest-light transition-colors"
        >
          <Plus className="size-4" />
          Agregar patrocinador
        </button>
      </div>

      {/* Sponsors grid */}
      {loading ? (
        <div className="flex h-40 items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="size-5 animate-spin text-emerald" />
          <span className="text-sm">Cargando patrocinadores...</span>
        </div>
      ) : sponsors.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center">
          <Building2 className="mx-auto mb-3 size-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No hay patrocinadores registrados.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-forest px-4 py-2 text-xs font-semibold text-white hover:bg-forest-light transition-colors"
          >
            <Plus className="size-3.5" />
            Agregar primero
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sponsors.map((s) => {
            const tier = TIERS.find(t => t.value === s.tier)
            return (
              <div
                key={s.id}
                className={`group relative flex flex-col gap-3 rounded-xl border p-4 transition-shadow hover:shadow-md ${tierBg[s.tier] || "border-border bg-card"}`}
              >
                {/* Tier badge */}
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tier?.color || ""}`}>
                    <Star className="size-2.5" />
                    {tier?.label}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => openEdit(s)}
                      className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
                      title="Editar"
                    >
                      <Save className="size-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      disabled={deletingId === s.id}
                      className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
                      title="Desactivar"
                    >
                      {deletingId === s.id
                        ? <Loader2 className="size-3.5 animate-spin" />
                        : <Trash2 className="size-3.5" />
                      }
                    </button>
                  </div>
                </div>

                {/* Logo or name */}
                <div className="flex h-16 items-center justify-center rounded-lg bg-card/60">
                  {s.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.logo}
                      alt={s.name}
                      className="max-h-12 max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-sm font-bold text-foreground">{s.name}</span>
                  )}
                </div>

                {/* Name + URL */}
                <div>
                  <p className="text-sm font-semibold text-foreground">{s.name}</p>
                  {s.websiteUrl && (
                    <a
                      href={s.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-emerald hover:underline mt-0.5"
                    >
                      <Globe className="size-3" />
                      {s.websiteUrl.replace(/^https?:\/\//, "")}
                      <ExternalLink className="size-2.5" />
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modal: Crear patrocinador ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => { if (!creating) { setShowCreate(false); setCreateStatus("idle"); setCreateError("") } }}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-forest/10">
                  <Star className="size-4 text-forest" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">Nuevo Patrocinador</h2>
                  <p className="text-xs text-muted-foreground">Completa los datos del patrocinador</p>
                </div>
              </div>
              <button
                onClick={() => { setShowCreate(false); setCreateStatus("idle"); setCreateError("") }}
                disabled={creating}
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary disabled:opacity-50"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-4">
              <FormField label="Nombre *">
                <input
                  type="text"
                  value={createForm.name}
                  onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ej. Banco del Pacífico"
                  className={inputClass}
                />
              </FormField>
              <FormField label="URL del Logo">
                <input
                  type="url"
                  value={createForm.logoUrl}
                  onChange={e => setCreateForm(f => ({ ...f, logoUrl: e.target.value }))}
                  placeholder="https://..."
                  className={inputClass}
                />
              </FormField>
              <FormField label="Sitio Web">
                <input
                  type="url"
                  value={createForm.websiteUrl}
                  onChange={e => setCreateForm(f => ({ ...f, websiteUrl: e.target.value }))}
                  placeholder="https://..."
                  className={inputClass}
                />
              </FormField>
              <FormField label="Nivel de Patrocinio">
                <select
                  value={createForm.tier}
                  onChange={e => setCreateForm(f => ({ ...f, tier: e.target.value as Sponsor["tier"] }))}
                  className={inputClass}
                >
                  {TIERS.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </FormField>

              {createStatus === "error" && createError && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50/10 border border-red-200/20 px-3 py-2">
                  <AlertCircle className="size-3.5 shrink-0 text-red-400" />
                  <p className="text-xs text-red-400">{createError}</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => { setShowCreate(false); setCreateStatus("idle"); setCreateError("") }}
                disabled={creating}
                className="rounded-lg px-5 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || createStatus === "ok"}
                className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
                  createStatus === "ok" ? "bg-emerald" : "bg-forest hover:bg-forest-light"
                }`}
              >
                {creating ? <Loader2 className="size-4 animate-spin" /> : createStatus === "ok" ? <CheckCircle className="size-4" /> : <Plus className="size-4" />}
                {creating ? "Guardando..." : createStatus === "ok" ? "Creado ✓" : "Crear Patrocinador"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Editar patrocinador ── */}
      {editSponsor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => { if (!saving) setEditSponsor(null) }}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-forest/10">
                  <Save className="size-4 text-forest" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">Editar Patrocinador</h2>
                  <p className="text-xs text-muted-foreground">{editSponsor.name}</p>
                </div>
              </div>
              <button
                onClick={() => setEditSponsor(null)}
                disabled={saving}
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary disabled:opacity-50"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-4">
              <FormField label="Nombre *">
                <input
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  className={inputClass}
                />
              </FormField>
              <FormField label="URL del Logo">
                <input
                  type="url"
                  value={editForm.logoUrl}
                  onChange={e => setEditForm(f => ({ ...f, logoUrl: e.target.value }))}
                  placeholder="https://..."
                  className={inputClass}
                />
              </FormField>
              <FormField label="Sitio Web">
                <input
                  type="url"
                  value={editForm.websiteUrl}
                  onChange={e => setEditForm(f => ({ ...f, websiteUrl: e.target.value }))}
                  placeholder="https://..."
                  className={inputClass}
                />
              </FormField>
              <FormField label="Nivel de Patrocinio">
                <select
                  value={editForm.tier}
                  onChange={e => setEditForm(f => ({ ...f, tier: e.target.value as Sponsor["tier"] }))}
                  className={inputClass}
                >
                  {TIERS.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </FormField>

              {saveStatus === "error" && saveError && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50/10 border border-red-200/20 px-3 py-2">
                  <AlertCircle className="size-3.5 shrink-0 text-red-400" />
                  <p className="text-xs text-red-400">{saveError}</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setEditSponsor(null)}
                disabled={saving}
                className="rounded-lg px-5 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || saveStatus === "ok"}
                className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
                  saveStatus === "ok" ? "bg-emerald" : "bg-forest hover:bg-forest-light"
                }`}
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : saveStatus === "ok" ? <CheckCircle className="size-4" /> : <Save className="size-4" />}
                {saving ? "Guardando..." : saveStatus === "ok" ? "Guardado ✓" : "Guardar Cambios"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Small helper ─────────────────────────────────────────────────────────────
const inputClass =
  "w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  )
}
