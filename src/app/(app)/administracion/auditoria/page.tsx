import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { can } from "@/lib/permissions"
import { AccessDenied } from "@/components/layout/access-denied"
import { AuditView } from "@/features/audit/components/audit-view"
export const metadata = { title: "Auditoría · DGRD Ñuñoa" }
export default async function Page() {
  const session = await getSession()
  if (!session) redirect("/login")
  if (!can(session.user.role, "audit", "read")) return <AccessDenied />
  return <AuditView />
}
