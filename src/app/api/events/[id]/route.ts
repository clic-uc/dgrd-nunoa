import { NextResponse, type NextRequest } from "next/server"
import { requirePermission } from "@/lib/session"
import { toErrorResponse } from "@/lib/api-error"
import { eventSchema } from "@/features/events/schemas"
import { deleteEvent, getEvent, updateEvent } from "@/features/events/service"
type Context = { params: Promise<{ id: string }> }
export async function GET(_request: NextRequest, { params }: Context) {
  try {
    await requirePermission("events", "read")
    const { id } = await params
    return NextResponse.json(await getEvent(id))
  } catch (error) {
    return toErrorResponse(error)
  }
}
export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    await requirePermission("events", "update")
    const { id } = await params
    const input = eventSchema.parse(await request.json())
    return NextResponse.json(await updateEvent(id, input))
  } catch (error) {
    return toErrorResponse(error)
  }
}
export async function DELETE(_request: NextRequest, { params }: Context) {
  try {
    await requirePermission("events", "delete")
    const { id } = await params
    await deleteEvent(id)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
