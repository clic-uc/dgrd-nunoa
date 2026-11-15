import { NextResponse, type NextRequest } from "next/server"
import { requirePermission } from "@/lib/session"
import { toErrorResponse } from "@/lib/api-error"
import { activitySchema } from "@/features/activities/schemas"
import { deleteActivity, getActivity, updateActivity } from "@/features/activities/service"
type Context = { params: Promise<{ id: string }> }
export async function GET(_request: NextRequest, { params }: Context) {
  try {
    await requirePermission("activities", "read")
    const { id } = await params
    return NextResponse.json(await getActivity(id))
  } catch (error) {
    return toErrorResponse(error)
  }
}
export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    await requirePermission("activities", "update")
    const { id } = await params
    const input = activitySchema.parse(await request.json())
    return NextResponse.json(await updateActivity(id, input))
  } catch (error) {
    return toErrorResponse(error)
  }
}
export async function DELETE(_request: NextRequest, { params }: Context) {
  try {
    await requirePermission("activities", "delete")
    const { id } = await params
    await deleteActivity(id)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
