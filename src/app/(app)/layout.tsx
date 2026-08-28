import { redirect } from "next/navigation"
import { AppProvider } from "@/components/app/provider"
import { AppShell } from "@/components/app/shell"
import { loadAppData } from "@/server/data"
import { getSession } from "@/server/session"

/**
 * Layout autenticado. Carga el dominio completo una sola vez y lo entrega al
 * contexto de cliente; las server actions revalidan esta capa al mutar.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await getSession()
  if (!me) redirect("/login")

  const data = await loadAppData()

  return (
    <AppProvider data={data} me={me}>
      <AppShell>{children}</AppShell>
    </AppProvider>
  )
}
