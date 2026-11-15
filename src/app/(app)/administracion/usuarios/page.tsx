import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { can } from "@/lib/permissions"
import { AccessDenied } from "@/components/layout/access-denied"
import { UsersView } from "@/features/users/components/users-view"
export const metadata = { title: "Usuarios · DGRD Ñuñoa" }
export default async function Page() {
  const session = await getSession()
  if (!session) redirect("/login")
  if (!can(session.user.role, "users", "read")) return <AccessDenied />
  return <UsersView actorId={session.user.id} />
}
