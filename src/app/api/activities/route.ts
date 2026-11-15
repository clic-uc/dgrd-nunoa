import { withAudit } from "@/lib/audit"
import { NextResponse, type NextRequest } from "next/server"
import { requirePermission } from "@/lib/session"
import { toErrorResponse } from "@/lib/api-error"
import { activitySchema, activityQuerySchema } from "@/features/activities/schemas"
import { createActivity, listActivities } from "@/features/activities/service"
export async function GET(request: NextRequest) {
  try {
    await requirePermission("activities", "read")
    const query = activityQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams))
    return NextResponse.json(await listActivities(query))
  } catch (error) {
    return toErrorResponse(error)
  }
}
export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission("activities", "create")
    const input = activitySchema.parse(await request.json())
    return NextResponse.json(await withAudit(user.id, async () => createActivity(input, user.id)), { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
