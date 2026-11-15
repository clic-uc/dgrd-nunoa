import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { can } from "@/lib/permissions"
import { AccessDenied } from "@/components/layout/access-denied"
import { ActivitiesView } from "@/features/activities/components/activities-view"
export const metadata = { title: "Actividades · DGRD Ñuñoa" }
export default async function Page() {
  const session = await getSession()
  if (!session) redirect("/login")
  if (!can(session.user.role, "activities", "read")) return <AccessDenied />
  return <ActivitiesView />
}
