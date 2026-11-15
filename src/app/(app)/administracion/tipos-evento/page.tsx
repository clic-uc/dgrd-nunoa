import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { can } from "@/lib/permissions"
import { AccessDenied } from "@/components/layout/access-denied"
import { EventTypesView } from "@/features/event-types/components/event-types-view"
export const metadata = { title: "Tipos de evento · DGRD Ñuñoa" }
export default async function Page() {
  const session = await getSession()
  if (!session) redirect("/login")
  if (!can(session.user.role, "event-types", "read")) return <AccessDenied />
  return <EventTypesView />
}
