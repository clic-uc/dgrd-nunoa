import { NextResponse, type NextRequest } from "next/server"
import { requirePermission } from "@/lib/session"
import { toErrorResponse } from "@/lib/api-error"
import { recurrenceQuerySchema } from "@/features/deliveries/schemas"
import { getRecurrence } from "@/features/deliveries/service"
export async function GET(request: NextRequest) {
  try {
    await requirePermission("deliveries", "read")
    return NextResponse.json(
      await getRecurrence(recurrenceQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams))),
    )
  } catch (error) {
    return toErrorResponse(error)
  }
}
