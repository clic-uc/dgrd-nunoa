import { withAudit } from "@/lib/audit"
import { NextResponse, type NextRequest } from "next/server"
import { requirePermission } from "@/lib/session"
import { toErrorResponse } from "@/lib/api-error"
import {
  associationHistoryQuerySchema,
  updateNeighborhoodAssociationSchema,
} from "@/features/neighborhood-associations/schemas"
import {
  getNeighborhoodAssociation,
  updateNeighborhoodAssociation,
  deleteNeighborhoodAssociation,
} from "@/features/neighborhood-associations/service"
type Context = { params: Promise<{ id: string }> }
export async function GET(request: NextRequest, { params }: Context) {
  try {
    await requirePermission("neighborhood-associations", "read")
    const { id } = await params
    const query = associationHistoryQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams))
    return NextResponse.json(await getNeighborhoodAssociation(id, query))
  } catch (error) {
    return toErrorResponse(error)
  }
}
export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const user = await requirePermission("neighborhood-associations", "update")
    const { id } = await params
    const input = updateNeighborhoodAssociationSchema.parse(await request.json())
    return NextResponse.json(await withAudit(user.id, async () => updateNeighborhoodAssociation(id, input)))
  } catch (error) {
    return toErrorResponse(error)
  }
}
export async function DELETE(_request: NextRequest, { params }: Context) {
  try {
    const user = await requirePermission("neighborhood-associations", "delete")
    const { id } = await params
    await withAudit(user.id, async () => deleteNeighborhoodAssociation(id))
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
