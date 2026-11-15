import { withAudit } from "@/lib/audit"
import { NextResponse, type NextRequest } from "next/server"
import { toErrorResponse } from "@/lib/api-error"
import { requirePermission } from "@/lib/session"
import { createStrategicActionSchema, listStrategicActionsQuerySchema } from "@/features/strategic-actions/schemas"
import { createStrategicAction, listStrategicActions } from "@/features/strategic-actions/service"

export async function GET(request: NextRequest) {
  try {
    await requirePermission("strategic-actions", "read")

    const { searchParams } = request.nextUrl
    const query = listStrategicActionsQuerySchema.parse({
      q: searchParams.get("q") ?? undefined,
      year: searchParams.get("year") ?? undefined,
    })

    return NextResponse.json(await listStrategicActions(query))
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission("strategic-actions", "create")
    const input = createStrategicActionSchema.parse(await request.json())

    return NextResponse.json(await withAudit(user.id, async () => createStrategicAction(input, user.id)), {
      status: 201,
    })
  } catch (error) {
    return toErrorResponse(error)
  }
}
