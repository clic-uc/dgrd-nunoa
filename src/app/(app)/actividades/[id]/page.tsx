import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { can } from "@/lib/permissions"
import { AccessDenied } from "@/components/layout/access-denied"
import { ActivityDetailView } from "@/features/activities/components/activity-detail-view"
export const metadata = { title: "Actividad · DGRD Ñuñoa" }
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const [session, { id }] = await Promise.all([getSession(), params])
  if (!session) redirect("/login")
  if (!can(session.user.role, "activities", "read")) return <AccessDenied />
  return <ActivityDetailView id={id} />
}
