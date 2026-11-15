import { withAudit } from "@/lib/audit"
import { NextResponse, type NextRequest } from "next/server"
import { requirePermission } from "@/lib/session"
import { toErrorResponse } from "@/lib/api-error"
import { createRequestSchema, listRequestsQuerySchema } from "@/features/requests/schemas"
import { createRequest, listRequests } from "@/features/requests/service"
export async function GET(request: NextRequest) {
  try {
    await requirePermission("requests", "read")
    const query = listRequestsQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams))
    return NextResponse.json(await listRequests(query))
  } catch (error) {
    return toErrorResponse(error)
  }
}
export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission("requests", "create")
    const input = createRequestSchema.parse(await request.json())
    return NextResponse.json(await withAudit(user.id, async () => createRequest(input, user.id)), { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
