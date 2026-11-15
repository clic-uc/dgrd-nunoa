"use client"
import Image from "next/image"
import { SignOutButton } from "@/components/auth/sign-out-button"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Box, CalendarRange, FileText, Package, Search, Siren, Users, ListChecks, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { can, type Resource } from "@/lib/permissions"
import { useRole } from "@/providers/permissions"
const groups: { label: string; items: { href: string; label: string; resource: Resource; icon: typeof Search }[] }[] = [
  { label: "General", items: [{ href: "/buscar", label: "Buscar", resource: "deliveries", icon: Search }] },
  {
    label: "Emergencias",
    items: [
      { href: "/solicitudes", label: "Solicitudes", resource: "requests", icon: FileText },
      { href: "/eventos", label: "Eventos", resource: "events", icon: Siren },
    ],
  },
  {
    label: "Ayudas primera respuesta",
    items: [
      { href: "/entregas", label: "Entregas", resource: "deliveries", icon: Package },
      { href: "/insumos", label: "Insumos", resource: "supplies", icon: Box },
      { href: "/juntas-vecinales", label: "Juntas vecinales", resource: "neighborhood-associations", icon: Users },
    ],
  },
  {
    label: "Plan RRD",
    items: [
      { href: "/plan/acciones", label: "Acciones estratégicas", resource: "strategic-actions", icon: ListChecks },
      { href: "/actividades", label: "Actividades", resource: "activities", icon: FileText },
      { href: "/plan/cronograma", label: "Cronograma", resource: "activities", icon: CalendarRange },
    ],
  },
  {
    label: "Administración",
    items: [
      { href: "/administracion/usuarios", label: "Usuarios", resource: "users", icon: Users },
      { href: "/administracion/tipos-evento", label: "Tipos de evento", resource: "event-types", icon: Settings },
    ],
  },
]
export function NavigationLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const role = useRole()
  return (
    <nav aria-label="Navegación principal" className="flex flex-1 flex-col gap-6 px-3 py-4">
      {groups
        .map((group) => ({ ...group, items: group.items.filter((item) => can(role, item.resource, "read")) }))
        .filter((group) => group.items.length)
        .map((group) => (
          <div key={group.label}>
            <p className="px-2 pb-2 text-xs font-semibold uppercase opacity-70">{group.label}</p>
            <ul className="space-y-1">
              {group.items.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(`${href}/`)
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm focus-visible:ring-2",
                        active ? "bg-ink-soft text-white" : "hover:bg-ink-soft/60",
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      {label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
    </nav>
  )
}
export function AppSidebar() {
  return (
    <aside className="bg-ink hidden w-[248px] shrink-0 flex-col text-white lg:flex">
      <Link href="/entregas" className="flex items-center gap-3 px-5 py-5">
        <Image src="/logo-mark-yellow.svg" alt="" width={34} height={34} unoptimized />
        <span className="text-sm font-semibold">
          Dirección de Gestión de Riesgo y Desastres
          <span className="block text-xs font-normal opacity-70">Municipalidad de Ñuñoa</span>
        </span>
      </Link>
      <NavigationLinks />
      <div className="border-t border-white/20 p-3">
        <SignOutButton />
      </div>
    </aside>
  )
}
