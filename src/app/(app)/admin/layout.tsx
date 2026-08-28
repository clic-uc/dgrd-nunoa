import { redirect } from "next/navigation"
import { getSession } from "@/server/session"

/** Las secciones de Administración son solo para administradores. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await getSession()
  if (!me) redirect("/login")
  if (me.rol !== "admin") redirect("/resumen")
  return <>{children}</>
}
