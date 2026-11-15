import { NextResponse, type NextRequest } from "next/server"
import { requirePermission } from "@/lib/session"
import { toErrorResponse } from "@/lib/api-error"
import { auditQuerySchema } from "@/features/audit/schemas"
import { listAudit } from "@/features/audit/service"
export async function GET(request: NextRequest) {
  try {
    await requirePermission("audit", "read")
    return NextResponse.json(await listAudit(auditQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams))))
  } catch (e) {
    return toErrorResponse(e)
  }
}
