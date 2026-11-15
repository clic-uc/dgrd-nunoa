import { withAudit } from "@/lib/audit"
import { NextResponse, type NextRequest } from "next/server"
import { requirePermission } from "@/lib/session"
import { toErrorResponse } from "@/lib/api-error"
import { userFormSchema } from "@/features/users/schemas"
import { deleteUser, saveUser } from "@/features/users/service"
type Context = { params: Promise<{ id: string }> }
export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const actor = await requirePermission("users", "update")
    return NextResponse.json(
      await withAudit(actor.id, async () =>
        saveUser(userFormSchema.parse(await request.json()), actor.id, (await params).id),
      ),
    )
  } catch (e) {
    return toErrorResponse(e)
  }
}
export async function DELETE(_request: NextRequest, { params }: Context) {
  try {
    const actor = await requirePermission("users", "delete")
    await withAudit(actor.id, async () => deleteUser((await params).id, actor.id))
    return new NextResponse(null, { status: 204 })
  } catch (e) {
    return toErrorResponse(e)
  }
}
