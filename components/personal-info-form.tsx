"use client"

interface UserData {
  name: string
  lastName: string
  email: string
  phone: string
}

export function PersonalInfoForm({ 
  user,
  onEditProfile
}: { 
  user: UserData
  onEditProfile?: () => void
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">
          Informacion Personal
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Revisa y actualiza tu informacion de contacto
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <span className="text-sm font-medium text-muted-foreground">Nombre</span>
          <span className="text-sm font-medium text-foreground">{user.name}</span>
        </div>
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <span className="text-sm font-medium text-muted-foreground">Apellido</span>
          <span className="text-sm font-medium text-foreground">{user.lastName}</span>
        </div>
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <span className="text-sm font-medium text-muted-foreground">Correo electronico</span>
          <span className="text-sm font-medium text-foreground">{user.email}</span>
        </div>
        <div className="flex items-center justify-between px-6 py-4">
          <span className="text-sm font-medium text-muted-foreground">Telefono</span>
          <span className="text-sm font-medium text-foreground">{user.phone}</span>
        </div>
      </div>

      <div>
        <button 
          onClick={onEditProfile}
          className="rounded-full bg-[#081c15] px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#081c15]/90"
        >
          Editar informacion
        </button>
      </div>
    </div>
  )
}
