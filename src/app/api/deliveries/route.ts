import { withAudit } from "@/lib/audit"
import { NextResponse, type NextRequest } from "next/server"
import { requirePermission } from "@/lib/session"
import { toErrorResponse } from "@/lib/api-error"
import { createDeliverySchema, listDeliveriesQuerySchema } from "@/features/deliveries/schemas"
import { createDelivery, listDeliveries } from "@/features/deliveries/service"
export async function GET(request: NextRequest) {
  try {
    await requirePermission("deliveries", "read")
    const query = listDeliveriesQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams))
    return NextResponse.json(await listDeliveries(query))
  } catch (error) {
    return toErrorResponse(error)
  }
}
export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission("deliveries", "create")
    const input = createDeliverySchema.parse(await request.json())
    return NextResponse.json(await withAudit(user.id, async () => createDelivery(input, user.id)), { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
