import { NextResponse, type NextRequest } from "next/server"
import { requirePermission } from "@/lib/session"
import { toErrorResponse } from "@/lib/api-error"
import { eventTypeSchema } from "@/features/event-types/schemas"
import { deleteEventType, saveEventType } from "@/features/event-types/service"
type Context = { params: Promise<{ id: string }> }
export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const user = await requirePermission("event-types", "update")
    return NextResponse.json(
      await saveEventType(eventTypeSchema.parse(await request.json()), user.id, (await params).id),
    )
  } catch (error) {
    return toErrorResponse(error)
  }
}
export async function DELETE(_request: NextRequest, { params }: Context) {
  try {
    await requirePermission("event-types", "delete")
    await deleteEventType((await params).id)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
