import { getSession } from "@/lib/session"
import { can } from "@/lib/permissions"
import { AccessDenied } from "@/components/layout/access-denied"
import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { EventsView } from "@/features/events/components/events-view"

export const metadata: Metadata = { title: "Eventos · DGRD Ñuñoa" }

export default async function EventosPage() {
  const session = await getSession()
  if (!session) redirect("/login")
  if (!can(session.user.role, "events", "read")) return <AccessDenied />
  return <EventsView />
}
