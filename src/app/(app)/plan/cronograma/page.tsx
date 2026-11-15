import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { can } from "@/lib/permissions"
import { AccessDenied } from "@/components/layout/access-denied"
import { ScheduleView } from "@/features/activities/components/schedule-view"
export const metadata = { title: "Cronograma · DGRD Ñuñoa" }
export default async function Page() {
  const session = await getSession()
  if (!session) redirect("/login")
  if (!can(session.user.role, "activities", "read")) return <AccessDenied />
  return <ScheduleView />
}
