import { NextResponse, type NextRequest } from "next/server"
import { requirePermission } from "@/lib/session"
import { toErrorResponse } from "@/lib/api-error"
import { eventTypeSchema } from "@/features/event-types/schemas"
import { listEventTypes, saveEventType } from "@/features/event-types/service"
export async function GET(request: NextRequest) {
  try {
    await requirePermission("event-types", "read")
    return NextResponse.json(await listEventTypes(request.nextUrl.searchParams.get("q")?.slice(0, 500)))
  } catch (error) {
    return toErrorResponse(error)
  }
}
export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission("event-types", "create")
    return NextResponse.json(await saveEventType(eventTypeSchema.parse(await request.json()), user.id), { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
