import { PermissionsProvider } from "@/providers/permissions"
import { normalizeRole } from "@/lib/permissions"
import { redirect } from "next/navigation"
import { MobileNavigation } from "@/components/layout/mobile-navigation"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { getSession } from "@/lib/session"

/**
 * Layout de las vistas autenticadas. `src/proxy.ts` sólo mira la cookie; aquí se
 * valida la sesión contra la base de datos, así un token revocado (cierre de
 * sesión) o una cuenta baneada no pasan. Alrededor de ese guard vive el shell.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  return (
    <PermissionsProvider role={normalizeRole(session.user.role)}>
      <TooltipProvider delayDuration={200}>
        <div className="flex min-h-svh flex-1">
          <AppSidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <MobileNavigation />
            {children}
          </div>
          <Toaster position="bottom-right" />
        </div>
      </TooltipProvider>
    </PermissionsProvider>
  )
}
