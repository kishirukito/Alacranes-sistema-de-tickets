import { redirect } from "next/navigation"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { AdminHeader } from "@/components/admin/admin-header"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { requireAdmin } from "@/lib/supabase-admin"

export const metadata = {
  title: "Panel Administrativo - Alacranes de Durango",
  description: "Panel de administración del Club Alacranes de Durango",
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // ── Auth guard: requires authenticated admin role ─────────────────────────
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Not logged in → redirect to login
  if (!user) {
    redirect("/login")
  }

  // Logged in but not admin → redirect to partidos
  const isAdmin = await requireAdmin(user.id)
  if (!isAdmin) {
    redirect("/partidos")
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      <AdminSidebar />
      <div className="pl-64 flex flex-col min-h-screen">
        <AdminHeader />
        <main className="flex-1 overflow-auto">
          <div className="p-8">
            {children}
          </div>
        </main>
        {/* Footer */}
        <footer className="border-t border-border bg-card px-6 py-4">
          <p className="text-center text-xs text-muted-foreground">
            © 2024 Club Alacranes de Durango. Panel Administrativo Versión 1.0.0
          </p>
        </footer>
      </div>
    </div>
  )
}
