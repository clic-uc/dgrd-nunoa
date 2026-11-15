import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { can } from "@/lib/permissions"
import { AccessDenied } from "@/components/layout/access-denied"
import { EventDetailView } from "@/features/events/components/event-detail-view"
export const metadata = { title: "Evento · DGRD Ñuñoa" }
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const [session, { id }] = await Promise.all([getSession(), params])
  if (!session) redirect("/login")
  if (!can(session.user.role, "events", "read")) return <AccessDenied />
  return <EventDetailView id={id} />
}
