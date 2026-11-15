import { withAudit } from "@/lib/audit"
import { NextResponse, type NextRequest } from "next/server"
import { requirePermission } from "@/lib/session"
import { toErrorResponse } from "@/lib/api-error"
import { createSupplySchema, listSuppliesQuerySchema } from "@/features/supplies/schemas"
import { createSupply, listSupplies } from "@/features/supplies/service"
export async function GET(request: NextRequest) {
  try {
    await requirePermission("supplies", "read")
    const query = listSuppliesQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams))
    return NextResponse.json(await listSupplies(query))
  } catch (error) {
    return toErrorResponse(error)
  }
}
export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission("supplies", "create")
    const input = createSupplySchema.parse(await request.json())
    return NextResponse.json(await withAudit(user.id, async () => createSupply(input, user.id)), { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
