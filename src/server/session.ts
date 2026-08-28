import { headers } from "next/headers"
import { cache } from "react"
import { auth } from "@/lib/auth"
import type { Rol, SesionUsuario } from "@/lib/types"

/** Divide el `name` de Better Auth en nombre + apellido para la UI. */
export function splitName(name: string, lastName?: string | null): { nombre: string; apellido: string } {
  if (lastName) return { nombre: name.trim(), apellido: lastName.trim() }
  const parts = name.trim().split(/\s+/)
  return { nombre: parts[0] ?? "", apellido: parts.slice(1).join(" ") }
}

/** Sesión actual, o null. Cacheada por request. */
export const getSession = cache(async (): Promise<SesionUsuario | null> => {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return null
  const u = session.user as typeof session.user & { lastName?: string | null; role?: string | null }
  const { nombre, apellido } = splitName(u.name ?? "", u.lastName)
  return {
    id: u.id,
    nombre,
    apellido,
    correo: u.email,
    rol: (u.role === "admin" ? "admin" : "regular") as Rol,
  }
})

/** Igual que getSession pero lanza si no hay sesión. Para usar en server actions. */
export async function requireSession(): Promise<SesionUsuario> {
  const s = await getSession()
  if (!s) throw new Error("Sesión no válida. Vuelve a iniciar sesión.")
  return s
}

/** Exige rol admin. Para las acciones de Administración. */
export async function requireAdmin(): Promise<SesionUsuario> {
  const s = await requireSession()
  if (s.rol !== "admin") throw new Error("Esta acción está disponible solo para administradores.")
  return s
}
