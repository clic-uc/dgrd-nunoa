import { withAudit } from "@/lib/audit"
import { NextResponse, type NextRequest } from "next/server"
import { requirePermission } from "@/lib/session"
import { toErrorResponse } from "@/lib/api-error"
import { createUserSchema } from "@/features/users/schemas"
import { listUsers, saveUser } from "@/features/users/service"
export async function GET(request: NextRequest) {
  try {
    await requirePermission("users", "read")
    return NextResponse.json(await listUsers(request.nextUrl.searchParams.get("q")?.slice(0, 500)))
  } catch (e) {
    return toErrorResponse(e)
  }
}
export async function POST(request: NextRequest) {
  try {
    const actor = await requirePermission("users", "create")
    return NextResponse.json(
      await withAudit(actor.id, async () => saveUser(createUserSchema.parse(await request.json()), actor.id)),
      { status: 201 },
    )
  } catch (e) {
    return toErrorResponse(e)
  }
}
