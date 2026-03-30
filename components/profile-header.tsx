"use client"

import Image from "next/image"
import { UserPen } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface ProfileHeaderProps {
  name: string
  lastName: string
  memberId: string
  onEditProfile?: () => void
}

export function ProfileHeader({ name, lastName, memberId, onEditProfile }: ProfileHeaderProps) {
  return (
    <section className="relative">
      {/* Background Banner */}
      <div className="relative h-64 w-full md:h-80">
        <Image
          src="/images/56.avif"
          alt="Estadio Background"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-forest/90 via-forest/80 to-forest/40" />
      </div>

      {/* Profile Card overlapping the banner */}
      <div className="relative mx-auto -mt-28 max-w-5xl px-4 lg:px-8">
        <div className="flex flex-row items-center gap-6 rounded-2xl border border-border bg-card px-8 py-8 shadow-lg">
          {/* Avatar */}
          <Avatar className="size-24 border-4 border-emerald/30 shadow-md">
            <AvatarImage src="" alt={`${name} ${lastName}`} />
            <AvatarFallback className="bg-secondary text-2xl font-bold text-foreground">
              {name.charAt(0)}{lastName.charAt(0)}
            </AvatarFallback>
          </Avatar>

          <div className="flex flex-col items-start gap-1">
            {/* Name */}
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
              {name} {lastName}
            </h1>

            {/* Member ID in green */}
            <p className="text-sm font-semibold text-emerald">
              Socio Alacran #{memberId}
            </p>

            {/* Actualizar Perfil link */}
            <button 
              className="mt-4 flex items-center gap-2 rounded-full bg-[#081c15] px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#081c15]/90 whitespace-nowrap"
              onClick={onEditProfile}
            >
              <UserPen className="size-4" />
              Actualizar Perfil
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
