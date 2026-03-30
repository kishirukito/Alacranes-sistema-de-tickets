"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { SiteHeader } from "@/components/site-header"
import { ProfileHeader } from "@/components/profile-header"
import { PersonalInfoForm } from "@/components/personal-info-form"
import { AccountActions, EditProfileModal } from "@/components/account-actions"
import { LogoutSection } from "@/components/logout-section"
import { SiteFooter } from "@/components/site-footer"
import { User, Shield, Ticket, LogOut, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface UserData {
  name: string
  lastName: string
  email: string
  phone: string
  memberId: string
}

export default function ProfilePage() {
  const router = useRouter()
  const [editProfileModalOpen, setEditProfileModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"personal" | "account" | "activity" | "logout">("personal")
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadUser() {
      try {
        // 1. Verificar que hay sesión activa en el cliente
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
          router.replace("/login")
          return
        }

        // 2. Obtener perfil completo desde la API del servidor
        //    (usa supabaseAdmin para evitar recursión RLS)
        const res = await fetch("/api/profile")

        if (res.status === 401) {
          router.replace("/login")
          return
        }

        if (!res.ok) {
          console.error("Error cargando perfil:", await res.text())
          // Fallback con datos mínimos del token de auth
          setUserData({
            name: user.user_metadata?.full_name?.split(" ")[0] || user.email?.split("@")[0] || "Usuario",
            lastName: user.user_metadata?.full_name?.split(" ").slice(1).join(" ") || "",
            email: user.email || "",
            phone: "",
            memberId: user.id.slice(0, 8).toUpperCase(),
          })
          return
        }

        const { data: profile } = await res.json()

        setUserData({
          name: profile.name || "",
          lastName: profile.lastName || "",
          email: profile.email || "",
          phone: profile.phone || "",
          memberId: profile.id?.slice(0, 8).toUpperCase() || user.id.slice(0, 8).toUpperCase(),
        })
      } catch (err) {
        console.error("Error cargando perfil:", err)
        router.replace("/login")
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-emerald" />
          <p className="text-sm text-muted-foreground">Cargando perfil...</p>
        </div>
      </div>
    )
  }

  if (!userData) return null

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <ProfileHeader
        name={userData.name}
        lastName={userData.lastName}
        memberId={userData.memberId}
        onEditProfile={() => setEditProfileModalOpen(true)}
      />

      <main className="mx-auto max-w-5xl px-4 py-8 lg:px-8">
        <div className="flex flex-col gap-8 md:flex-row">
          {/* Sidebar */}
          <aside className="w-full shrink-0 md:w-64">
            <nav className="flex flex-col gap-2">
              {(
                [
                  { id: "personal", icon: <User className="size-4" />, label: "Informacion Personal" },
                  { id: "account", icon: <Shield className="size-4" />, label: "Gestion de Cuenta" },
                  { id: "activity", icon: <Ticket className="size-4" />, label: "Actividad" },
                  { id: "logout", icon: <LogOut className="size-4" />, label: "Cerrar Sesion" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-[#081c15] text-white"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Content Area */}
          <div className="flex-1">
            {activeTab === "personal" && (
              <PersonalInfoForm
                user={userData}
                onEditProfile={() => setEditProfileModalOpen(true)}
              />
            )}
            {activeTab === "account" && <AccountActions section="account" />}
            {activeTab === "activity" && <AccountActions section="activity" />}
            {activeTab === "logout" && <LogoutSection />}
          </div>
        </div>
      </main>

      <SiteFooter />

      <EditProfileModal
        open={editProfileModalOpen}
        onOpenChange={setEditProfileModalOpen}
        initialData={userData}
        onSaved={(updated) => setUserData((prev) => (prev ? { ...prev, ...updated } : prev))}
      />
    </div>
  )
}
