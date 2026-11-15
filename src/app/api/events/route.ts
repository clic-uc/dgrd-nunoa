import { withAudit } from "@/lib/audit"
import { NextResponse, type NextRequest } from "next/server"
import { requirePermission } from "@/lib/session"
import { toErrorResponse } from "@/lib/api-error"
import { eventSchema, eventQuerySchema } from "@/features/events/schemas"
import { createEvent, listEvents } from "@/features/events/service"
export async function GET(request: NextRequest) {
  try {
    await requirePermission("events", "read")
    const query = eventQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams))
    return NextResponse.json(await listEvents(query))
  } catch (error) {
    return toErrorResponse(error)
  }
}
export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission("events", "create")
    const input = eventSchema.parse(await request.json())
    return NextResponse.json(await withAudit(user.id, async () => createEvent(input, user.id)), { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
