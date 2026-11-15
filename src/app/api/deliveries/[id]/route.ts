import { withAudit } from "@/lib/audit"
import { NextResponse, type NextRequest } from "next/server"
import { toErrorResponse } from "@/lib/api-error"
import { requirePermission } from "@/lib/session"
import { updateDeliverySchema } from "@/features/deliveries/schemas"
import { deleteDelivery, getDelivery, updateDelivery } from "@/features/deliveries/service"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    await requirePermission("deliveries", "read")
    const { id } = await params

    return NextResponse.json(await getDelivery(id))
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requirePermission("deliveries", "update")
    const { id } = await params
    const input = updateDeliverySchema.parse(await request.json())

    return NextResponse.json(await withAudit(user.id, async () => updateDelivery(id, input)))
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requirePermission("deliveries", "delete")
    const { id } = await params
    await withAudit(user.id, async () => deleteDelivery(id))

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
